import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { JackpotSpinSchema } from '../../../shared/src/schemas.ts'
import { db } from '../db/index.ts'
import { buyables, productVariants, transactions, transactionItems, users } from '../db/schema.ts'
import { requireAuth } from '../middleware/auth.ts'
import { emitFeedEvent } from '../services/feed.ts'
import { checkAchievements } from '../services/achievements.ts'

const router = new Hono()

// 20 values in 10% steps: 0,10,...,90,110,...,200 (excludes 100). EV = 2000/20 = 100%.
const MULTIPLIERS: number[] = [
  ...Array.from({ length: 10 }, (_, i) => i * 10),        // 0, 10, ..., 90
  ...Array.from({ length: 10 }, (_, i) => (i + 11) * 10), // 110, 120, ..., 200
]

function pickMultiplierPct(): number {
  return MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)]!
}

function jackpotEnabled(): boolean {
  return process.env.JACKPOT_ENABLED === 'true'
}

router.get('/eligibility', requireAuth, async (c) => {
  const user = c.get('user')
  if (!jackpotEnabled()) return c.json({ eligible: false, reason: 'disabled' as const })
  if (!user.jackpotAllowed) return c.json({ eligible: false, reason: 'not_allowed' as const })
  return c.json({ eligible: true, reason: null })
})

router.post('/spin', requireAuth, zValidator('json', JackpotSpinSchema), async (c) => {
  const user = c.get('user')

  if (!jackpotEnabled()) {
    return c.json({ error: 'Jackpot is disabled', code: 'DISABLED' }, 403)
  }
  if (!user.jackpotAllowed) {
    return c.json({ error: 'Jackpot not allowed for this user', code: 'FORBIDDEN' }, 403)
  }

  const { buyableId, variantId } = c.req.valid('json')

  const [buyable] = await db
    .select()
    .from(buyables)
    .where(and(eq(buyables.id, buyableId), eq(buyables.isActive, true)))

  if (!buyable) return c.json({ error: 'Product not found', code: 'NOT_FOUND' }, 404)

  const allVariants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.buyableId, buyableId), eq(productVariants.isActive, true)))

  if (allVariants.length === 0)
    return c.json({ error: 'No active variants', code: 'NO_VARIANTS' }, 404)

  const variant = variantId
    ? allVariants.find((v) => v.id === variantId)
    : allVariants.sort((a, b) => a.price - b.price)[0]

  if (!variant) return c.json({ error: 'Variant not found', code: 'VARIANT_NOT_FOUND' }, 404)

  // Server-side multiplier: client never influences the outcome
  const multiplierPct = pickMultiplierPct()
  const multiplierDecimal = multiplierPct / 100
  const pricePaid = Math.round(variant.price * multiplierDecimal)

  const txn = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(transactions)
      .values({
        userId: user.id,
        initiatedBy: user.id,
        type: 'jackpot',
        totalAmount: -pricePaid,
        jackpotMultiplier: multiplierDecimal.toFixed(2),
        note: null,
      })
      .returning()

    await tx.insert(transactionItems).values({
      transactionId: created!.id,
      buyableId: buyable.id,
      variantId: variant.id,
      quantity: 1,
      unitPrice: variant.price,
      totalPrice: pricePaid,
    })

    await tx
      .update(users)
      .set({ balance: sql`balance - ${pricePaid}`, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    return created!
  })

  emitFeedEvent({
    type: 'jackpot_win',
    userId: user.id,
    metadata: {
      multiplier: multiplierDecimal,
      multiplierPct,
      productName: buyable.name,
      variantName: variant.name,
    },
  })

  checkAchievements({ type: 'jackpot', userId: user.id, multiplier: multiplierDecimal }).catch(
    console.error,
  )

  return c.json(
    {
      transactionId: txn.id,
      multiplierPct,
      multiplierDecimal,
      variantPrice: variant.price,
      pricePaid,
      productName: buyable.name,
      variantName: variant.name,
    },
    201,
  )
})

export default router
