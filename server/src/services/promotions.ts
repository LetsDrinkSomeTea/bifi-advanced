import { and, gte, isNull, lte, or, eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { promotions } from '../db/schema.ts'

interface AppliesToConfig {
  categoryIds?: string[]
  buyableIds?: string[]
}

export async function getActiveDiscount(buyableId: string, category: string | null): Promise<number> {
  const now = new Date()

  const active = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        or(isNull(promotions.startTime), lte(promotions.startTime, now)),
        or(isNull(promotions.endTime), gte(promotions.endTime, now)),
      ),
    )

  let maxDiscount = 0

  for (const promo of active) {
    const appliesTo = promo.appliesTo as AppliesToConfig | null

    if (!appliesTo) {
      // Applies to all products
      maxDiscount = Math.max(maxDiscount, promo.discountPercent)
      continue
    }

    const matchesBuyable = appliesTo.buyableIds?.includes(buyableId)
    const matchesCategory = category != null && appliesTo.categoryIds?.includes(category)

    if (matchesBuyable || matchesCategory) {
      maxDiscount = Math.max(maxDiscount, promo.discountPercent)
    }
  }

  return maxDiscount
}
