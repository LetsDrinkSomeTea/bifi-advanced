// ─── Tier metadata ────────────────────────────────────────────────────────────

export type AchievementTier = 'bronze' | 'silver' | 'gold'

export const TIER_META: Record<AchievementTier, { label: string; emoji: string }> = {
  bronze: { label: 'Bronze', emoji: '🥉' },
  silver: { label: 'Silber', emoji: '🥈' },
  gold:   { label: 'Gold',   emoji: '🥇' },
}

// ─── Definition type ──────────────────────────────────────────────────────────

export interface AchievementDef {
  key: string
  name: string         // group label (same across tiers)
  description: string  // describes this tier's threshold
  icon: string
  tier?: AchievementTier
  groupKey?: string    // ties tiers together in the UI
  hidden?: boolean     // true = show as ??? until any tier in the group is unlocked
  threshold?: number              // numeric threshold for this tier (used for progress bars)
  progressFormat?: 'count' | 'cents'  // how to display the progress value (default: count)
}

// ─── Event types ──────────────────────────────────────────────────────────────

export type AchievementEventType =
  | 'purchase'
  | 'prost_sent'
  | 'prost_received'
  | 'group_founded'
  | 'jackpot'
  | 'contribution'
  | 'deposit'
  | 'friendship_accepted'
  | 'promo_first_buyer'
  | 'promo_exhausted_buyer'

export type AchievementEvent =
  | {
      type: 'purchase'
      userId: string
      now: Date
      items: Array<{ buyableId: string; variantId: string; category: string | null; quantity: number; buyableName: string }>
      groupId?: string
    }
  | { type: 'prost_sent'; userId: string }
  | { type: 'prost_received'; userId: string }
  | { type: 'group_founded'; userId: string }
  | { type: 'jackpot'; userId: string; multiplier: number }
  | { type: 'contribution'; userId: string }
  | { type: 'deposit'; userId: string; amount: number; balanceBefore: number; balanceAfter: number }
  | { type: 'friendship_accepted'; userId: string }
  | { type: 'promo_first_buyer'; userId: string }
  | { type: 'promo_exhausted_buyer'; userId: string }

export type AchievementKey = string
