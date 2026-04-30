import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { activityFeed, buyables, groupMembers, productVariants, prostVouchers, transactionItems, transactions, users } from '../db/schema.ts'
import { requireAuth, requireRole } from '../middleware/auth.ts'
import { purchaseRateLimit } from '../middleware/rateLimit.ts'
import { getActiveDiscount } from '../services/promotions.ts'
import { writeAuditLog } from '../services/audit.ts'
import { createNotification } from '../services/notifications.ts'
import { checkAchievements } from '../services/achievements.ts'

const router = new Hono()

// ─── Cursor helpers ───────────────────────────────────────────────────────────

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id })).toString('base64url')
}

function decodeCursor(cursor: string): { t: string; id: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as { t: string; id: string }
  } catch {
    return null
  }
}

// ─── GET /api/transactions ────────────────────────────────────────────────────

const HistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

router.get('/', requireAuth, zValidator('query', HistoryQuerySchema), async (c) => {
  const user = c.get('user')
  const { cursor, limit } = c.req.valid('query')

  const parsed = cursor ? decodeCursor(cursor) : null
  const cursorDate = parsed ? new Date(parsed.t) : null
  const cursorId = parsed?.id ?? null

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        cursorDate && cursorId
          ? or(
              lt(transactions.createdAt, cursorDate),
              and(eq(transactions.createdAt, cursorDate), lt(transactions.id, cursorId)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id) : null

  if (page.length === 0) return c.json({ data: [], nextCursor: null })

  const txnIds = page.map((t) => t.id)
  const itemRows = await db
    .select({
      id: transactionItems.id,
      transactionId: transactionItems.transactionId,
      buyableId: transactionItems.buyableId,
      variantId: transactionItems.variantId,
      quantity: transactionItems.quantity,
      unitPrice: transactionItems.unitPrice,
      totalPrice: transactionItems.totalPrice,
      buyableName: buyables.name,
      variantName: productVariants.name,
    })
    .from(transactionItems)
    .innerJoin(buyables, eq(transactionItems.buyableId, buyables.id))
    .leftJoin(productVariants, eq(transactionItems.variantId, productVariants.id))
    .where(inArray(transactionItems.transactionId, txnIds))

  const itemsByTxn = new Map<string, typeof itemRows>()
  for (const item of itemRows) {
    const list = itemsByTxn.get(item.transactionId) ?? []
    list.push(item)
    itemsByTxn.set(item.transactionId, list)
  }

  const data = page.map((t) => ({ ...t, items: itemsByTxn.get(t.id) ?? [] }))
  return c.json({ data, nextCursor })
})

// ─── POST /api/transactions/purchase ─────────────────────────────────────────

const PurchaseSchema = z.object({
  items: z
    .array(
      z.object({
        buyableId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
  groupId: z.string().uuid().optional(),
  note: z.string().max(200).optional(),
})

// ─── Shared: resolve and price items ──────────────────────────────────────────

async function resolveItems(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  items: Array<{ buyableId: string; variantId?: string; quantity: number }>,
) {
  type ItemRow = { buyableId: string; variantId: string; quantity: number; unitPrice: number; totalPrice: number }
  const toInsert: ItemRow[] = []
  const feedItems: Array<{ name: string; variantName: string; count: number }> = []
  let cost = 0

  for (const item of items) {
    const [buyable] = await tx.select().from(buyables).where(eq(buyables.id, item.buyableId))
    if (!buyable?.isActive) {
      throw Object.assign(new Error('Product not found or inactive'), { status: 400, code: 'PRODUCT_NOT_FOUND' })
    }

    const variants = await tx
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.buyableId, buyable.id), eq(productVariants.isActive, true)))

    if (variants.length === 0) {
      throw Object.assign(new Error(`No active variants for "${buyable.name}"`), { status: 400, code: 'NO_VARIANTS' })
    }

    const variant = variants.find((v) => v.id === item.variantId)
    if (!variant) {
      throw Object.assign(new Error('Variant not found'), { status: 400, code: 'VARIANT_NOT_FOUND' })
    }

    let unitPrice = variant.price
    const discount = await getActiveDiscount(buyable.id, buyable.category)
    if (discount > 0) unitPrice = Math.round(unitPrice * (1 - discount / 100))

    const totalPrice = unitPrice * item.quantity
    cost += totalPrice
    toInsert.push({ buyableId: buyable.id, variantId: variant.id, quantity: item.quantity, unitPrice, totalPrice })
    feedItems.push({ name: buyable.name, variantName: variant.name, count: item.quantity })
  }

  return { toInsert, feedItems, cost }
}

// ─── Shared: redeem prost vouchers for a user ─────────────────────────────────

async function redeemVouchers(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  variantIds: string[],
  txnId: string,
): Promise<{ credit: number; ids: string[] }> {
  let credit = 0
  const ids: string[] = []
  for (const vid of variantIds) {
    const [v] = await tx
      .select()
      .from(prostVouchers)
      .where(and(eq(prostVouchers.toUserId, userId), eq(prostVouchers.variantId, vid), isNull(prostVouchers.redeemedAt), isNull(prostVouchers.creditedAt)))
      .limit(1)
    if (v) {
      credit += v.amount
      ids.push(v.id)
      await tx.update(prostVouchers).set({ redeemedAt: new Date(), redeemedTransactionId: txnId }).where(eq(prostVouchers.id, v.id))
    }
  }
  return { credit, ids }
}

router.post('/purchase', requireAuth, purchaseRateLimit, zValidator('json', PurchaseSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')

  // ── Group purchase: split equally among all members ───────────────────────
  if (body.groupId) {
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, body.groupId!))

    if (members.length === 0) return c.json({ error: 'Group not found or empty', code: 'GROUP_ERROR' }, 400)

    const memberIds = members.map((m) => m.userId)
    const n = memberIds.length

    const { toInsert, feedItems, cost } = await db.transaction(async (tx) => resolveItems(tx, body.items))

    // Distribute cost: each member pays ceil(cost/n), buyer absorbs rounding
    const sharePerOther = Math.ceil(cost / n)
    const buyerShare = cost - sharePerOther * (n - 1)

    const primaryTxn = await db.transaction(async (tx) => {
      // Purchaser's transaction (has items)
      const [primary] = await tx
        .insert(transactions)
        .values({
          userId: user.id,
          initiatedBy: user.id,
          type: 'purchase',
          totalAmount: -buyerShare,
          groupId: body.groupId!,
          note: body.note ?? null,
        })
        .returning()

      await tx.insert(transactionItems).values(toInsert.map((i) => ({ transactionId: primary!.id, ...i })))

      const variantIds = toInsert.map((i) => i.variantId)
      const { credit, ids } = await redeemVouchers(tx, user.id, variantIds, primary!.id)
      const netBuyerShare = Math.max(0, buyerShare - credit)

      await tx.update(users).set({ balance: sql`balance - ${netBuyerShare}`, updatedAt: new Date() }).where(eq(users.id, user.id))
      if (credit > 0) {
        await tx.update(transactions).set({ totalAmount: -netBuyerShare }).where(eq(transactions.id, primary!.id))
        primary!.totalAmount = -netBuyerShare
      }

      // Other members' split transactions (no items)
      for (const memberId of memberIds) {
        if (memberId === user.id) continue
        const [splitTxn] = await tx
          .insert(transactions)
          .values({
            userId: memberId,
            initiatedBy: user.id,
            type: 'purchase',
            totalAmount: -sharePerOther,
            groupId: body.groupId!,
            note: `Gruppenaufteilung`,
          })
          .returning()

        const { credit: mc, ids: mids } = await redeemVouchers(tx, memberId, variantIds, splitTxn!.id)
        const netShare = Math.max(0, sharePerOther - mc)
        await tx.update(users).set({ balance: sql`balance - ${netShare}`, updatedAt: new Date() }).where(eq(users.id, memberId))
        if (mc > 0) await tx.update(transactions).set({ totalAmount: -netShare }).where(eq(transactions.id, splitTxn!.id))

        // Notify member
        createNotification({
          userId: memberId,
          type: 'system',
          title: 'Gruppenaufteilung',
          message: `${user.displayName} hat eine Gruppenbestellung aufgegeben. Dein Anteil: ${(netShare / 100).toFixed(2)} €`,
          relatedId: splitTxn!.id,
        }).catch(console.error)
      }

      return { txn: primary!, feedItems, voucherCredit: credit, voucherIds: ids }
    })

    db.insert(activityFeed)
      .values({ userId: user.id, type: 'purchase', metadata: { items: feedItems, totalAmount: cost, groupId: body.groupId, memberCount: n } })
      .catch(console.error)

    checkAchievements({ type: 'purchase', userId: user.id, purchaseHour: new Date().getHours() }).catch(console.error)

    return c.json(primaryTxn.txn, 201)
  }

  // ── Solo purchase ─────────────────────────────────────────────────────────
  const { txn, redeemedVoucherIds, voucherCredit, feedItems } = await db.transaction(async (tx) => {
    const { toInsert, feedItems, cost } = await resolveItems(tx, body.items)

    const [created] = await tx
      .insert(transactions)
      .values({ userId: user.id, initiatedBy: user.id, type: 'purchase', totalAmount: -cost, groupId: null, note: body.note ?? null })
      .returning()

    await tx.insert(transactionItems).values(toInsert.map((i) => ({ transactionId: created!.id, ...i })))

    const variantIds = toInsert.map((i) => i.variantId)
    const { credit, ids } = await redeemVouchers(tx, user.id, variantIds, created!.id)
    const netCost = Math.max(0, cost - credit)

    await tx.update(users).set({ balance: sql`balance - ${netCost}`, updatedAt: new Date() }).where(eq(users.id, user.id))
    if (credit > 0) {
      await tx.update(transactions).set({ totalAmount: -netCost }).where(eq(transactions.id, created!.id))
      created!.totalAmount = -netCost
    }

    return { txn: created!, redeemedVoucherIds: ids, voucherCredit: credit, feedItems }
  })

  db.insert(activityFeed)
    .values({ userId: user.id, type: 'purchase', metadata: { items: feedItems, totalAmount: txn.totalAmount } })
    .catch(console.error)

  checkAchievements({ type: 'purchase', userId: user.id, purchaseHour: new Date().getHours() }).catch(console.error)

  if (voucherCredit > 0) {
    ;(async () => {
      for (const voucherId of redeemedVoucherIds) {
        const [v] = await db.select({ fromUserId: prostVouchers.fromUserId }).from(prostVouchers).where(eq(prostVouchers.id, voucherId))
        if (v) {
          createNotification({ userId: v.fromUserId, type: 'prost', title: 'Prost eingelöst! 🍺', message: `${user.displayName} hat deinen Gutschein eingelöst.`, relatedId: txn.id }).catch(console.error)
        }
      }
    })().catch(console.error)
  }

  return c.json(txn, 201)
})

// ─── DELETE /api/transactions/:id (cancel) ────────────────────────────────────

router.delete('/:id', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const isMod = user.role === 'admin' || user.role === 'moderator'

  const [txn] = await db.select().from(transactions).where(eq(transactions.id, id))

  if (!txn) return c.json({ error: 'Transaction not found', code: 'NOT_FOUND' }, 404)

  if (txn.cancelledAt) return c.json({ error: 'Already cancelled', code: 'ALREADY_CANCELLED' }, 409)

  // Permission check
  if (!isMod && txn.userId !== user.id) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)
  }

  // Jackpot: only mod+ can cancel
  if (txn.type === 'jackpot' && !isMod) {
    return c.json({ error: 'Jackpot transactions cannot be self-cancelled', code: 'FORBIDDEN' }, 403)
  }

  // 5-minute cancel window applies to everyone
  const ageMs = Date.now() - txn.createdAt.getTime()
  if (ageMs > 5 * 60 * 1000) {
    return c.json({ error: 'Cancel window expired (5 minutes)', code: 'CANCEL_WINDOW_EXPIRED' }, 403)
  }

  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({ cancelledAt: new Date(), cancelledBy: user.id })
      .where(eq(transactions.id, id))

    // Refund: totalAmount is negative for purchases, so subtracting it adds it back
    await tx
      .update(users)
      .set({ balance: sql`balance - ${txn.totalAmount}`, updatedAt: new Date() })
      .where(eq(users.id, txn.userId))
  })

  await writeAuditLog({
    actorId: user.id,
    action: 'transaction.cancelled',
    resourceType: 'transaction',
    resourceId: id,
    changes: { before: { cancelledAt: null }, after: { cancelledAt: new Date(), cancelledBy: user.id } },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return c.body(null, 204)
})

// ─── GET /api/admin/transactions ──────────────────────────────────────────────

router.get('/admin/all', requireAuth, requireRole('moderator'), zValidator('query', HistoryQuerySchema), async (c) => {
  const { cursor, limit } = c.req.valid('query')
  const parsed = cursor ? decodeCursor(cursor) : null

  const rows = await db
    .select()
    .from(transactions)
    .where(
      parsed
        ? or(
            lt(transactions.createdAt, new Date(parsed.t)),
            and(eq(transactions.createdAt, new Date(parsed.t)), lt(transactions.id, parsed.id)),
          )
        : undefined,
    )
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id) : null

  return c.json({ data: page, nextCursor })
})

export default router
