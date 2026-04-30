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
}

// ─── Achievement registry ─────────────────────────────────────────────────────
//
// To add a new achievement:
//   1. Add its definition here (and the group key if tiered)
//   2. Add a rule to server/src/services/achievements.ts
//
// Key naming convention:
//   standalone  → descriptive_name  (e.g. early_bird)
//   tiered      → group_tier        (e.g. purchases_bronze)

export const ACHIEVEMENTS = {

  // ── Käufe (tiered) ─────────────────────────────────────────────────────────

  purchases_bronze: {
    key: 'purchases_bronze',
    name: 'Stammkunde',
    description: '1 Kauf getätigt',
    icon: '🛒',
    tier: 'bronze',
    groupKey: 'purchases',
  },
  purchases_silver: {
    key: 'purchases_silver',
    name: 'Stammkunde',
    description: '10 Käufe getätigt',
    icon: '🛒',
    tier: 'silver',
    groupKey: 'purchases',
  },
  purchases_gold: {
    key: 'purchases_gold',
    name: 'Stammkunde',
    description: '100 Käufe getätigt',
    icon: '🛒',
    tier: 'gold',
    groupKey: 'purchases',
  },

  // ── Prost gesendet (tiered) ────────────────────────────────────────────────

  prost_sent_bronze: {
    key: 'prost_sent_bronze',
    name: 'Großzügig',
    description: '5× Prost gesendet',
    icon: '🥂',
    tier: 'bronze',
    groupKey: 'prost_sent',
  },
  prost_sent_silver: {
    key: 'prost_sent_silver',
    name: 'Großzügig',
    description: '15× Prost gesendet',
    icon: '🥂',
    tier: 'silver',
    groupKey: 'prost_sent',
  },
  prost_sent_gold: {
    key: 'prost_sent_gold',
    name: 'Großzügig',
    description: '30× Prost gesendet',
    icon: '🥂',
    tier: 'gold',
    groupKey: 'prost_sent',
  },

  // ── Prost erhalten (tiered) ────────────────────────────────────────────────

  prost_received_bronze: {
    key: 'prost_received_bronze',
    name: 'Beliebt',
    description: '10× Prost erhalten',
    icon: '❤️',
    tier: 'bronze',
    groupKey: 'prost_received',
  },
  prost_received_silver: {
    key: 'prost_received_silver',
    name: 'Beliebt',
    description: '25× Prost erhalten',
    icon: '❤️',
    tier: 'silver',
    groupKey: 'prost_received',
  },
  prost_received_gold: {
    key: 'prost_received_gold',
    name: 'Beliebt',
    description: '50× Prost erhalten',
    icon: '❤️',
    tier: 'gold',
    groupKey: 'prost_received',
  },

  // ── Spenden (tiered, hidden) ───────────────────────────────────────────────

  donations_bronze: {
    key: 'donations_bronze',
    name: 'Spendenritter',
    description: '3× zum Ziel beigetragen',
    icon: '🦸',
    tier: 'bronze',
    groupKey: 'donations',
    hidden: true,
  },
  donations_silver: {
    key: 'donations_silver',
    name: 'Spendenritter',
    description: '10× zum Ziel beigetragen',
    icon: '🦸',
    tier: 'silver',
    groupKey: 'donations',
    hidden: true,
  },
  donations_gold: {
    key: 'donations_gold',
    name: 'Spendenritter',
    description: '25× zum Ziel beigetragen',
    icon: '🦸',
    tier: 'gold',
    groupKey: 'donations',
    hidden: true,
  },

  // ── Standalone ────────────────────────────────────────────────────────────

  group_founder: {
    key: 'group_founder',
    name: 'Gruppeninitiator',
    description: 'Erste Gruppe gegründet',
    icon: '👥',
  },
  early_bird: {
    key: 'early_bird',
    name: 'Frühaufsteher',
    description: 'Kauf vor 8:00 Uhr',
    icon: '🌅',
  },
  night_owl: {
    key: 'night_owl',
    name: 'Nachteule',
    description: 'Kauf nach 23:00 Uhr',
    icon: '🦉',
  },
  jackpot_winner: {
    key: 'jackpot_winner',
    name: 'Glückspilz',
    description: 'Jackpot mit 0× Multiplikator',
    icon: '🎰',
    hidden: true,
  },

} as const satisfies Record<string, AchievementDef>

export type AchievementKey = keyof typeof ACHIEVEMENTS
