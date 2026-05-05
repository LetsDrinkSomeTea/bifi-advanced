import { and, gte, isNull, lte, or, eq, lt } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { promotions } from '../db/schema.ts';

interface AppliesToConfig {
  buyableId?: string;
  variantId?: string;
  categoryIds?: string[];
}

export interface ActiveDiscount {
  type: 'percent' | 'fixed';
  value: number;
  name: string;
  endTime: string | null;
  quantityRemaining: number | null;
  promoId: string;
  startTime?: Date | null;
}

type PromotionRow = typeof promotions.$inferSelect;

export async function listActivePromotions(now: Date = new Date()): Promise<PromotionRow[]> {
  return db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        or(isNull(promotions.startTime), lte(promotions.startTime, now)),
        or(isNull(promotions.endTime), gte(promotions.endTime, now)),
        // Exclude exhausted quantity promotions
        or(isNull(promotions.quantityLimit), lt(promotions.quantityUsed, promotions.quantityLimit)),
      ),
    );
}

export function findBestDiscount(
  activePromotions: PromotionRow[],
  buyableId: string,
  variantId: string | null,
  category: string | null,
): ActiveDiscount | null {
  // Sort by specificity: variant > buyable > category > global
  let bestDiscount: ActiveDiscount | null = null;
  let bestPriority = -1;
  let bestIsQuantity = false;

  for (const promo of activePromotions) {
    const appliesTo = promo.appliesTo as AppliesToConfig | null;
    let priority = 0; // Global

    if (appliesTo) {
      if (appliesTo.variantId) {
        if (appliesTo.variantId === variantId) {
          priority = 3;
        } else {
          continue;
        }
      } else if (appliesTo.buyableId) {
        if (appliesTo.buyableId === buyableId) {
          priority = 2;
        } else {
          continue;
        }
      } else if (category && (appliesTo.categoryIds?.includes(category) ?? false)) {
        priority = 1;
      } else {
        continue;
      }
    }

    const isQuantityBased = promo.quantityLimit !== null;
    const quantityRemaining =
      isQuantityBased && promo.quantityLimit !== null
        ? promo.quantityLimit - promo.quantityUsed
        : null;

    const current: ActiveDiscount | null =
      promo.discountFixedCents !== null
        ? {
            type: 'fixed',
            value: promo.discountFixedCents,
            name: promo.name,
            endTime: promo.endTime?.toISOString() ?? null,
            quantityRemaining,
            promoId: promo.id,
            startTime: promo.startTime,
          }
        : promo.discountPercent !== null
          ? {
              type: 'percent',
              value: promo.discountPercent,
              name: promo.name,
              endTime: promo.endTime?.toISOString() ?? null,
              quantityRemaining,
              promoId: promo.id,
              startTime: promo.startTime,
            }
          : null;

    if (current === null) continue;

    if (priority > bestPriority) {
      bestPriority = priority;
      bestDiscount = current;
      bestIsQuantity = isQuantityBased;
    } else if (priority === bestPriority) {
      if (isQuantityBased && !bestIsQuantity) {
        bestDiscount = current;
        bestIsQuantity = true;
      } else if (isQuantityBased === bestIsQuantity) {
        if (current.type === 'fixed') {
          bestDiscount = current;
        } else if (bestDiscount?.type === 'percent' && current.value > bestDiscount.value) {
          bestDiscount = current;
        }
      }
    }
  }

  if (bestDiscount !== null && bestDiscount.quantityRemaining !== null) {
    // quantityRemaining is already calculated.
    return bestDiscount;
  }
  return bestDiscount;
}

export async function getActiveDiscount(
  buyableId: string,
  variantId: string | null,
  category: string | null,
): Promise<ActiveDiscount | null> {
  const activePromotions = await listActivePromotions();
  if (activePromotions.length === 0) return null;
  return findBestDiscount(activePromotions, buyableId, variantId, category);
}

export function calculateDiscountedPrice(
  basePrice: number,
  discount: ActiveDiscount | null,
): number {
  if (!discount) return basePrice;
  if (discount.type === 'fixed') return Math.max(0, basePrice - discount.value);
  const factor = (100 - discount.value) / 100;
  return Math.max(0, Math.round(basePrice * factor));
}

export async function consumeQuantityPromotion(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  promoId: string,
  requestedQty: number,
): Promise<{ consumed: number; isNowExhausted: boolean; wasFirst: boolean }> {
  const [promo] = await tx
    .select()
    .from(promotions)
    .where(eq(promotions.id, promoId))
    .for('update');

  if (!promo) throw new Error('Promotion not found');

  if (promo.quantityLimit === null) {
    return { consumed: requestedQty, isNowExhausted: false, wasFirst: false };
  }

  const remaining = promo.quantityLimit - promo.quantityUsed;
  const consumed = Math.min(requestedQty, Math.max(0, remaining));
  const wasFirst = promo.quantityUsed === 0 && consumed > 0;
  const newUsed = promo.quantityUsed + consumed;
  const isNowExhausted = newUsed >= promo.quantityLimit;

  await tx.update(promotions).set({ quantityUsed: newUsed }).where(eq(promotions.id, promoId));

  return { consumed, isNowExhausted, wasFirst };
}
