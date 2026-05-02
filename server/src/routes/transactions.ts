import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { PurchaseSchema } from '../../../shared/src/schemas.ts';
import { db } from '../db/index.ts';
import {
  buyables,
  groupMembers,
  groups,
  productVariants,
  promotions,
  prostVouchers,
  transactionItems,
  transactions,
  users,
} from '../db/schema.ts';
import { emitFeedEvent } from '../services/feed.ts';
import { requireAuth } from '../middleware/auth.ts';
import { purchaseRateLimit } from '../middleware/rateLimit.ts';
import {
  getActiveDiscount,
  calculateDiscountedPrice,
  consumeQuantityPromotion,
} from '../services/promotions.ts';
import { writeAuditLog } from '../services/audit.ts';
import {
  broadcastInvalidate,
  createNotification,
  pushInvalidate,
} from '../services/notifications.ts';
import { checkAchievements } from '../services/achievements.ts';

const router = new Hono();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id })).toString('base64url');
}

function decodeCursor(cursor: string): { t: string; id: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as {
      t: string;
      id: string;
    };
  } catch {
    return null;
  }
}

// ─── GET /api/transactions ────────────────────────────────────────────────────

const HistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/', requireAuth, zValidator('query', HistoryQuerySchema), async (c) => {
  const user = c.get('user');
  const { cursor, limit } = c.req.valid('query');

  const parsed = cursor ? decodeCursor(cursor) : null;
  const cursorDate = parsed ? new Date(parsed.t) : null;
  const cursorId = parsed?.id ?? null;

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
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = page[page.length - 1];
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

  if (page.length === 0) return c.json({ data: [], nextCursor: null });

  const txnIds = page.map((t) => t.id);
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
    .where(inArray(transactionItems.transactionId, txnIds));

  const itemsByTxn = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const list = itemsByTxn.get(item.transactionId) ?? [];
    list.push(item);
    itemsByTxn.set(item.transactionId, list);
  }

  const data = page.map((t) => ({ ...t, items: itemsByTxn.get(t.id) ?? [] }));
  return c.json({ data, nextCursor });
});

// ─── Shared: resolve and price items ──────────────────────────────────────────

interface ItemRow {
  buyableId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountSavedCents: number;
}

interface ResolvedItems {
  toInsert: ItemRow[];
  feedItems: { name: string; variantName: string; count: number }[];
  achievementItems: {
    buyableId: string;
    variantId: string;
    category: string | null;
    quantity: number;
    buyableName: string;
  }[];
  consumedQuantityPromos: {
    promoId: string;
    name: string;
    consumed: number;
    isNowExhausted: boolean;
    wasFirst: boolean;
  }[];
  cost: number;
}
async function resolveItems(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  items: { buyableId: string; variantId?: string; quantity: number }[],
): Promise<ResolvedItems> {
  const toInsert: ItemRow[] = [];
  const feedItems: { name: string; variantName: string; count: number }[] = [];
  const achievementItems: {
    buyableId: string;
    variantId: string;
    category: string | null;
    quantity: number;
    buyableName: string;
  }[] = [];
  const consumedQuantityPromos: {
    promoId: string;
    name: string;
    consumed: number;
    isNowExhausted: boolean;
    wasFirst: boolean;
  }[] = [];
  let cost = 0;

  for (const item of items) {
    const [buyable] = await tx.select().from(buyables).where(eq(buyables.id, item.buyableId));
    if (!buyable?.isActive) {
      throw Object.assign(new Error('Product not found or inactive'), {
        status: 400,
        code: 'PRODUCT_NOT_FOUND',
      });
    }

    const variants = await tx
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.buyableId, buyable.id), eq(productVariants.isActive, true)));

    if (variants.length === 0) {
      throw Object.assign(new Error(`No active variants for "${buyable.name}"`), {
        status: 400,
        code: 'NO_VARIANTS',
      });
    }

    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) {
      throw Object.assign(new Error('Variant not found'), {
        status: 400,
        code: 'VARIANT_NOT_FOUND',
      });
    }

    const discount = await getActiveDiscount(buyable.id, variant.id, buyable.category);

    if (discount?.quantityRemaining !== null && discount != null) {
      // Quantity-based promotion: consume atomically inside the transaction
      const { consumed, isNowExhausted, wasFirst } = await consumeQuantityPromotion(
        tx,
        discount.promoId,
        item.quantity,
      );

      if (consumed > 0) {
        const discountedPrice = calculateDiscountedPrice(variant.price, discount);
        const discountedTotal = discountedPrice * consumed;
        cost += discountedTotal;
        toInsert.push({
          buyableId: buyable.id,
          variantId: variant.id,
          quantity: consumed,
          unitPrice: discountedPrice,
          totalPrice: discountedTotal,
          discountSavedCents: (variant.price - discountedPrice) * consumed,
        });
        consumedQuantityPromos.push({
          promoId: discount.promoId,
          name: discount.name,
          consumed,
          isNowExhausted,
          wasFirst,
        });
      }

      const fullQty = item.quantity - consumed;
      if (fullQty > 0) {
        const fullTotal = variant.price * fullQty;
        cost += fullTotal;
        toInsert.push({
          buyableId: buyable.id,
          variantId: variant.id,
          quantity: fullQty,
          unitPrice: variant.price,
          totalPrice: fullTotal,
          discountSavedCents: 0,
        });
      }
    } else {
      // Regular (time-based or no) promotion
      const unitPrice = calculateDiscountedPrice(variant.price, discount);
      const totalPrice = unitPrice * item.quantity;
      cost += totalPrice;
      toInsert.push({
        buyableId: buyable.id,
        variantId: variant.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        discountSavedCents: discount ? (variant.price - unitPrice) * item.quantity : 0,
      });
    }

    feedItems.push({
      name: buyable.name,
      variantName: variant.name,
      count: item.quantity,
    });
    achievementItems.push({
      buyableId: buyable.id,
      variantId: variant.id,
      category: buyable.category,
      quantity: item.quantity,
      buyableName: buyable.name,
    });
  }

  return { toInsert, feedItems, achievementItems, cost, consumedQuantityPromos };
}

// ─── Shared: redeem prost vouchers for a user ─────────────────────────────────

async function redeemVouchers(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  variantIds: string[],
  prices: Map<string, number>,
  txnId: string,
): Promise<{
  credit: number;
  vouchers: { id: string; fromUserId: string; refundAmount: number }[];
}> {
  let totalCredit = 0;
  const redeemedVouchers: {
    id: string;
    fromUserId: string;
    refundAmount: number;
  }[] = [];

  for (const vid of variantIds) {
    const [v] = await tx
      .select()
      .from(prostVouchers)
      .where(
        and(
          eq(prostVouchers.toUserId, userId),
          eq(prostVouchers.variantId, vid),
          isNull(prostVouchers.redeemedAt),
          isNull(prostVouchers.creditedAt),
        ),
      )
      .limit(1);

    if (v) {
      const currentPrice = prices.get(vid) ?? 0;
      const credit = Math.min(v.amount, currentPrice);
      const refundAmount = Math.max(0, v.amount - currentPrice);

      totalCredit += credit;
      redeemedVouchers.push({
        id: v.id,
        fromUserId: v.fromUserId,
        refundAmount,
      });

      await tx
        .update(prostVouchers)
        .set({ redeemedAt: new Date(), redeemedTransactionId: txnId })
        .where(eq(prostVouchers.id, v.id));

      if (refundAmount > 0) {
        // Credit refund back to donor
        await tx
          .update(users)
          .set({
            balance: sql`balance + ${refundAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, v.fromUserId));

        // Create correction transaction for the donor
        await tx.insert(transactions).values({
          userId: v.fromUserId,
          initiatedBy: userId, // Initiated by the person redeeming
          type: 'correction',
          totalAmount: refundAmount,
          note: `Gutschein-Differenz`,
        });
      }
    }
  }
  return { credit: totalCredit, vouchers: redeemedVouchers };
}

router.post(
  '/purchase',
  requireAuth,
  purchaseRateLimit,
  zValidator('json', PurchaseSchema),
  async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');

    // ── Group purchase: split equally among all members ───────────────────────
    if (body.groupId) {
      const [members, [group]] = await Promise.all([
        db
          .select({ userId: groupMembers.userId })
          .from(groupMembers)
          .where(and(eq(groupMembers.groupId, body.groupId), isNull(groupMembers.leftAt))),
        db.select({ name: groups.name }).from(groups).where(eq(groups.id, body.groupId)),
      ]);

      if (members.length === 0)
        return c.json({ error: 'Group not found or empty', code: 'GROUP_ERROR' }, 400);

      // Verify caller is a member of the group
      if (!members.some((m) => m.userId === user.id)) {
        return c.json({ error: 'Not a member of this group', code: 'FORBIDDEN' }, 403);
      }

      const memberIds = members.map((m) => m.userId);
      const n = memberIds.length;

      // resolveItems runs inside the same transaction as balance deduction (fixes TOCTOU)
      const primaryTxn = await db.transaction(async (tx) => {
        const { toInsert, feedItems, achievementItems, cost, consumedQuantityPromos } =
          await resolveItems(tx, body.items);

        // Distribute cost: each member pays ceil(cost/n), buyer absorbs rounding
        const sharePerOther = Math.ceil(cost / n);
        const buyerShare = cost - sharePerOther * (n - 1);
        // Purchaser's transaction (has items)
        const [primary] = await tx
          .insert(transactions)
          .values({
            userId: user.id,
            initiatedBy: user.id,
            type: 'purchase',
            totalAmount: -buyerShare,
            groupId: body.groupId ?? null,
            note: body.note ?? null,
          })
          .returning();

        if (!primary) {
          throw new Error('Failed to create primary transaction');
        }

        await tx
          .insert(transactionItems)
          .values(toInsert.map((i) => ({ transactionId: primary.id, ...i })));

        await tx
          .update(users)
          .set({ balance: sql`balance - ${buyerShare}`, updatedAt: new Date() })
          .where(eq(users.id, user.id));
        await tx
          .update(transactions)
          .set({ totalAmount: -buyerShare })
          .where(eq(transactions.id, primary.id));
        primary.totalAmount = -buyerShare;

        // Other members' split transactions (no items)
        const splitNotifications: {
          memberId: string;
          netShare: number;
          txnId: string;
        }[] = [];
        for (const memberId of memberIds) {
          if (memberId === user.id) continue;
          const [splitTxn] = await tx
            .insert(transactions)
            .values({
              userId: memberId,
              initiatedBy: user.id,
              type: 'purchase',
              totalAmount: -sharePerOther,
              groupId: body.groupId ?? null,
              note: `Gruppenaufteilung`,
            })
            .returning();

          if (!splitTxn) {
            throw new Error('Failed to create split transaction');
          }

          await tx
            .update(users)
            .set({
              balance: sql`balance - ${sharePerOther}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, memberId));
          await tx
            .update(transactions)
            .set({ totalAmount: -sharePerOther })
            .where(eq(transactions.id, splitTxn.id));

          await tx
            .insert(transactionItems)
            .values(toInsert.map((i) => ({ transactionId: splitTxn.id, ...i })));

          splitNotifications.push({
            memberId,
            netShare: sharePerOther,
            txnId: splitTxn.id,
          });
        }

        return {
          txn: primary,
          feedItems,
          achievementItems,
          cost,
          splitNotifications,
          consumedQuantityPromos,
        };
      });

      // Notify split members outside the transaction
      for (const { memberId, netShare, txnId } of primaryTxn.splitNotifications) {
        pushInvalidate(memberId, ['balance', 'transactions']);
        createNotification({
          userId: memberId,
          type: 'system',
          title: 'Gruppenaufteilung',
          message: `${user.displayName} hat eine Gruppenbestellung aufgegeben. Dein Anteil: ${(netShare / 100).toFixed(2)} €`,
          relatedId: txnId,
        }).catch(console.error);
      }

      // Handle exhausted quantity promotions
      if (primaryTxn.consumedQuantityPromos.length > 0) {
        broadcastInvalidate(['buyables']);
        for (const cp of primaryTxn.consumedQuantityPromos) {
          if (cp.isNowExhausted) {
            await db
              .update(promotions)
              .set({ isActive: false })
              .where(eq(promotions.id, cp.promoId));
            emitFeedEvent({
              type: 'promotion_ended',
              userId: user.id,
              metadata: { promoName: cp.name },
            });
          }
        }
      }

      emitFeedEvent({
        type: 'purchase',
        userId: user.id,
        targetGroupId: body.groupId,
        metadata: {
          items: primaryTxn.feedItems,
          totalAmount: primaryTxn.cost,
          groupId: body.groupId,
          groupName: group?.name,
          memberCount: n,
        },
      });

      for (const memberId of memberIds) {
        checkAchievements({
          type: 'purchase',
          userId: memberId,
          now: new Date(),
          items: primaryTxn.achievementItems,
          groupId: body.groupId,
        }).catch(console.error);

        for (const cp of primaryTxn.consumedQuantityPromos) {
          if (cp.wasFirst) {
            checkAchievements({ type: 'promo_first_buyer', userId: memberId }).catch(console.error);
          }
          if (cp.isNowExhausted && cp.consumed > 0) {
            checkAchievements({ type: 'promo_exhausted_buyer', userId: memberId }).catch(
              console.error,
            );
          }
        }
      }

      return c.json({ ...primaryTxn.txn, voucherRedeemed: false }, 201);
    }

    // ── Solo purchase ─────────────────────────────────────────────────────────
    const {
      txn,
      redeemedVouchers,
      voucherCredit,
      feedItems,
      achievementItems,
      consumedQuantityPromos,
    } = await db.transaction(async (tx) => {
      const { toInsert, feedItems, achievementItems, cost, consumedQuantityPromos } =
        await resolveItems(tx, body.items);

      const [created] = await tx
        .insert(transactions)
        .values({
          userId: user.id,
          initiatedBy: user.id,
          type: 'purchase',
          totalAmount: -cost,
          groupId: null,
          note: body.note ?? null,
        })
        .returning();

      if (!created) {
        throw new Error('Failed to create transaction');
      }

      await tx
        .insert(transactionItems)
        .values(toInsert.map((i) => ({ transactionId: created.id, ...i })));

      const variantIds: string[] = [];
      const variantPrices = new Map<string, number>();
      for (const i of toInsert) {
        variantPrices.set(i.variantId, i.unitPrice);
        for (let q = 0; q < i.quantity; q++) {
          variantIds.push(i.variantId);
        }
      }

      const { credit, vouchers } = await redeemVouchers(
        tx,
        user.id,
        variantIds,
        variantPrices,
        created.id,
      );
      const netCost = Math.max(0, cost - credit);

      await tx
        .update(users)
        .set({ balance: sql`balance - ${netCost}`, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      if (credit > 0) {
        await tx
          .update(transactions)
          .set({ totalAmount: -netCost })
          .where(eq(transactions.id, created.id));
        created.totalAmount = -netCost;
      }

      return {
        txn: created,
        redeemedVouchers: vouchers,
        voucherCredit: credit,
        feedItems,
        achievementItems,
        consumedQuantityPromos,
      };
    });

    // Handle exhausted quantity promotions
    if (consumedQuantityPromos.length > 0) {
      broadcastInvalidate(['buyables']);
      for (const cp of consumedQuantityPromos) {
        if (cp.isNowExhausted) {
          await db.update(promotions).set({ isActive: false }).where(eq(promotions.id, cp.promoId));
          emitFeedEvent({
            type: 'promotion_ended',
            userId: user.id,
            metadata: { promoName: cp.name },
          });
        }
      }
    }

    // Fire discount achievement events
    for (const cp of consumedQuantityPromos) {
      if (cp.isNowExhausted && cp.consumed > 0) {
        checkAchievements({ type: 'promo_exhausted_buyer', userId: user.id }).catch(console.error);
      }
      if (cp.wasFirst) {
        checkAchievements({ type: 'promo_first_buyer', userId: user.id }).catch(console.error);
      }
    }

    emitFeedEvent({
      type: 'purchase',
      userId: user.id,
      metadata: { items: feedItems, totalAmount: txn.totalAmount },
    });

    checkAchievements({
      type: 'purchase',
      userId: user.id,
      now: new Date(),
      items: achievementItems,
    }).catch(console.error);

    if (voucherCredit > 0) {
      (async () => {
        for (const rv of redeemedVouchers) {
          const [v] = await db
            .select({
              fromUserId: prostVouchers.fromUserId,
              variantName: productVariants.name,
              productName: buyables.name,
            })
            .from(prostVouchers)
            .innerJoin(productVariants, eq(prostVouchers.variantId, productVariants.id))
            .innerJoin(buyables, eq(productVariants.buyableId, buyables.id))
            .where(eq(prostVouchers.id, rv.id));

          if (v) {
            const refundNote =
              rv.refundAmount > 0
                ? ` Da das Produkt günstiger war, wurden dir ${formatCents(rv.refundAmount)} erstattet.`
                : '';

            createNotification({
              userId: v.fromUserId,
              type: 'prost',
              title: `${user.displayName} hat deinen Gutschein eingelöst.`,
              message: `Und sich ${v.productName} (${v.variantName}) gekauft.${refundNote}`,
              relatedId: txn.id,
            }).catch(console.error);

            // Also invalidate donor balance if they got a refund
            if (rv.refundAmount > 0) {
              pushInvalidate(v.fromUserId, ['balance', 'transactions']);
            }
          }
        }
      })().catch(console.error);
    }

    return c.json({ ...txn, voucherRedeemed: voucherCredit > 0 }, 201);
  },
);

// ─── DELETE /api/transactions/:id (cancel) ────────────────────────────────────

router.delete('/:id', requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const isMod = user.role === 'admin' || user.role === 'moderator';

  const [txn] = await db.select().from(transactions).where(eq(transactions.id, id));

  if (!txn) return c.json({ error: 'Transaction not found', code: 'NOT_FOUND' }, 404);

  if (txn.cancelledAt)
    return c.json({ error: 'Already cancelled', code: 'ALREADY_CANCELLED' }, 409);

  // Permission check
  if (!isMod && txn.userId !== user.id) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
  }

  // Jackpot: only mod+ can cancel
  if (txn.type === 'jackpot' && !isMod) {
    return c.json(
      {
        error: 'Jackpot transactions cannot be self-cancelled',
        code: 'FORBIDDEN',
      },
      403,
    );
  }

  // 5-minute cancel window applies to everyone
  const ageMs = Date.now() - txn.createdAt.getTime();
  if (ageMs > 5 * 60 * 1000) {
    return c.json(
      {
        error: 'Cancel window expired (5 minutes)',
        code: 'CANCEL_WINDOW_EXPIRED',
      },
      403,
    );
  }

  const cancelledAt = new Date();

  await db.transaction(async (tx) => {
    const cancelTxn = async (t: typeof txn): Promise<void> => {
      await tx
        .update(transactions)
        .set({ cancelledAt, cancelledBy: user.id })
        .where(eq(transactions.id, t.id));
      // totalAmount is negative for purchases, so subtracting it adds back the balance
      await tx
        .update(users)
        .set({
          balance: sql`balance - ${t.totalAmount}`,
          updatedAt: cancelledAt,
        })
        .where(eq(users.id, t.userId));
      // Reinstate any vouchers that were redeemed as part of this transaction
      await tx
        .update(prostVouchers)
        .set({ redeemedAt: null, redeemedTransactionId: null })
        .where(eq(prostVouchers.redeemedTransactionId, t.id));
    };

    await cancelTxn(txn);

    // Cascade: cancel all split transactions created in the same group purchase
    if (txn.groupId && txn.initiatedBy === txn.userId) {
      const splits = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.groupId, txn.groupId),
            eq(transactions.initiatedBy, txn.userId),
            eq(transactions.createdAt, txn.createdAt),
            isNull(transactions.cancelledAt),
            sql`${transactions.id} != ${txn.id}`,
          ),
        );
      for (const split of splits) {
        await cancelTxn(split);
      }
    }
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'transaction.cancelled',
    resourceType: 'transaction',
    resourceId: id,
    changes: {
      before: { cancelledAt: null },
      after: { cancelledAt: new Date(), cancelledBy: user.id },
    },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  });

  return c.body(null, 204);
});

export default router;
