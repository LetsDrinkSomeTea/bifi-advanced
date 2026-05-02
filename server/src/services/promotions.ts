import { and, gte, isNull, lte, or, eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { promotions } from '../db/schema.ts'

interface AppliesToConfig {
  buyableId?: string
  variantId?: string
  categoryIds?: string[] // Kept for backward compatibility or future use
}

export interface ActiveDiscount {
  type: 'percent' | 'fixed'
  value: number // Percent (0-100) or Fixed price in Cents
  name: string
  endTime: string | null
}

export async function getActiveDiscount(
  buyableId: string,
  variantId: string | null,
  category: string | null,
): Promise<ActiveDiscount | null> {
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

  if (active.length === 0) return null

  // Sort by specificity: variant > buyable > category > global
  // And prefer fixed price over percentage if both apply to the same level
  let bestDiscount: ActiveDiscount | null = null
  let bestPriority = -1

  for (const promo of active) {
    const appliesTo = promo.appliesTo as AppliesToConfig | null
    let priority = 0 // Global

    if (appliesTo) {
      if (appliesTo.variantId) {
        if (appliesTo.variantId === variantId) {
          priority = 3 // Matches specific variant
        } else {
          continue // Targeted at a different variant, skip
        }
      } else if (appliesTo.buyableId) {
        if (appliesTo.buyableId === buyableId) {
          priority = 2 // Matches product
        } else {
          continue // Targeted at a different product, skip
        }
      } else if (category && appliesTo.categoryIds?.includes(category)) {
        priority = 1 // Specific category
      } else {
        // Targeted at something else, skip
        continue
      }
    }

    const current: ActiveDiscount | null = promo.discountFixedCents != null
      ? { 
          type: 'fixed', 
          value: promo.discountFixedCents,
          name: promo.name,
          endTime: promo.endTime?.toISOString() ?? null 
        }
      : promo.discountPercent != null
        ? { 
            type: 'percent', 
            value: promo.discountPercent,
            name: promo.name,
            endTime: promo.endTime?.toISOString() ?? null 
          }
        : null

    if (!current) continue

    if (priority > bestPriority) {
      bestPriority = priority
      bestDiscount = current
    } else if (priority === bestPriority) {
      // Tie-breaker at same level: prefer lower absolute price (hard to calculate here without base price)
      // For simplicity: prefer fixed price over percent, or higher percent
      if (current.type === 'fixed') {
        bestDiscount = current
      } else if (bestDiscount?.type === 'percent' && current.value > bestDiscount.value) {
        bestDiscount = current
      }
    }
  }

  return bestDiscount
}

export function calculateDiscountedPrice(basePrice: number, discount: ActiveDiscount | null): number {
  if (!discount) return basePrice
  if (discount.type === 'fixed') return Math.max(0, discount.value)
  const factor = (100 - discount.value) / 100
  return Math.max(0, Math.round(basePrice * factor))
}
