import { Hono } from 'hono'
import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { buyables, productVariants, userFavorites } from '../db/schema.ts'
import { requireAuth } from '../middleware/auth.ts'
import { getActiveDiscount, calculateDiscountedPrice } from '../services/promotions.ts'

const router = new Hono()

// ─── GET /api/favorites ───────────────────────────────────────────────────────

router.get('/', requireAuth, async (c) => {
  const user = c.get('user')

  const rows = await db
    .select({
      variantId: userFavorites.variantId,
      variantName: productVariants.name,
      price: productVariants.price,
      buyableId: buyables.id,
      buyableName: buyables.name,
      category: buyables.category,
      isAvailable: sql<boolean>`(${productVariants.isActive} AND ${buyables.isActive})`,
    })
    .from(userFavorites)
    .innerJoin(productVariants, eq(userFavorites.variantId, productVariants.id))
    .innerJoin(buyables, eq(productVariants.buyableId, buyables.id))
    .where(eq(userFavorites.userId, user.id))
    .orderBy(asc(buyables.name), asc(productVariants.name))

  const favorites = await Promise.all(rows.map(async (row) => {
    const discount = await getActiveDiscount(row.buyableId, row.variantId, row.category)
    return {
      ...row,
      activeDiscount: discount,
      discountedPrice: calculateDiscountedPrice(row.price, discount)
    }
  }))

  return c.json(favorites)
})

// ─── POST /api/favorites/:variantId ──────────────────────────────────────────

router.post('/:variantId', requireAuth, async (c) => {
  const user = c.get('user')
  const { variantId } = c.req.param()

  const [variant] = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.isActive, true)))

  if (!variant) return c.json({ error: 'Variant not found', code: 'NOT_FOUND' }, 404)

  await db
    .insert(userFavorites)
    .values({ userId: user.id, variantId })
    .onConflictDoNothing()

  return c.json({ success: true }, 201)
})

// ─── DELETE /api/favorites/:variantId ─────────────────────────────────────────

router.delete('/:variantId', requireAuth, async (c) => {
  const user = c.get('user')
  const { variantId } = c.req.param()

  await db
    .delete(userFavorites)
    .where(and(eq(userFavorites.userId, user.id), eq(userFavorites.variantId, variantId)))

  return c.body(null, 204)
})

export default router
