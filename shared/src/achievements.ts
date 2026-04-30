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
  threshold?: number   // numeric threshold for this tier (used for progress bars)
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
    threshold: 1,
  },
  purchases_silver: {
    key: 'purchases_silver',
    name: 'Stammkunde',
    description: '10 Käufe getätigt',
    icon: '🛒',
    tier: 'silver',
    groupKey: 'purchases',
    threshold: 10,
  },
  purchases_gold: {
    key: 'purchases_gold',
    name: 'Stammkunde',
    description: '100 Käufe getätigt',
    icon: '🛒',
    tier: 'gold',
    groupKey: 'purchases',
    threshold: 100,
  },

  // ── Prost gesendet (tiered) ────────────────────────────────────────────────

  prost_sent_bronze: {
    key: 'prost_sent_bronze',
    name: 'Großzügig',
    description: '5× Prost gesendet',
    icon: '🥂',
    tier: 'bronze',
    groupKey: 'prost_sent',
    threshold: 5,
  },
  prost_sent_silver: {
    key: 'prost_sent_silver',
    name: 'Großzügig',
    description: '15× Prost gesendet',
    icon: '🥂',
    tier: 'silver',
    groupKey: 'prost_sent',
    threshold: 15,
  },
  prost_sent_gold: {
    key: 'prost_sent_gold',
    name: 'Großzügig',
    description: '30× Prost gesendet',
    icon: '🥂',
    tier: 'gold',
    groupKey: 'prost_sent',
    threshold: 30,
  },

  // ── Prost erhalten (tiered) ────────────────────────────────────────────────

  prost_received_bronze: {
    key: 'prost_received_bronze',
    name: 'Beliebt',
    description: '10× Prost erhalten',
    icon: '❤️',
    tier: 'bronze',
    groupKey: 'prost_received',
    threshold: 10,
  },
  prost_received_silver: {
    key: 'prost_received_silver',
    name: 'Beliebt',
    description: '25× Prost erhalten',
    icon: '❤️',
    tier: 'silver',
    groupKey: 'prost_received',
    threshold: 25,
  },
  prost_received_gold: {
    key: 'prost_received_gold',
    name: 'Beliebt',
    description: '50× Prost erhalten',
    icon: '❤️',
    tier: 'gold',
    groupKey: 'prost_received',
    threshold: 50,
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

  // ── Erfolgsjäger (tiered) ──────────────────────────────────────────────────

  achievements_collected_bronze: {
    key: 'achievements_collected_bronze',
    name: 'Erfolgsjäger',
    description: '10 Achievements gesammelt',
    icon: '🏆',
    tier: 'bronze',
    groupKey: 'achievements_collected',
    threshold: 10,
  },
  achievements_collected_silver: {
    key: 'achievements_collected_silver',
    name: 'Erfolgsjäger',
    description: '20 Achievements gesammelt',
    icon: '🏆',
    tier: 'silver',
    groupKey: 'achievements_collected',
    threshold: 20,
  },
  achievements_collected_gold: {
    key: 'achievements_collected_gold',
    name: 'Erfolgsjäger',
    description: '30 Achievements gesammelt',
    icon: '🏆',
    tier: 'gold',
    groupKey: 'achievements_collected',
    threshold: 30,
  },

  // ── Kategorie-Tränke (silver/gold only) ───────────────────────────────────

  alcoholic_drinker_silver: {
    key: 'alcoholic_drinker_silver',
    name: 'Hopfenheld',
    description: '100 alkoholische Getränke',
    icon: '🍺',
    tier: 'silver',
    groupKey: 'alcoholic_drinker',
    threshold: 100,
  },
  alcoholic_drinker_gold: {
    key: 'alcoholic_drinker_gold',
    name: 'Hopfenheld',
    description: '1337 alkoholische Getränke — Legende im Krug',
    icon: '🍺',
    tier: 'gold',
    groupKey: 'alcoholic_drinker',
    threshold: 1337,
  },

  softdrink_lover_silver: {
    key: 'softdrink_lover_silver',
    name: 'Zuckerschock',
    description: '100 Softdrinks',
    icon: '🥤',
    tier: 'silver',
    groupKey: 'softdrink_lover',
    threshold: 100,
  },
  softdrink_lover_gold: {
    key: 'softdrink_lover_gold',
    name: 'Zuckerschock',
    description: 'Limo-Legende: 1337 Softdrinks',
    icon: '🥤',
    tier: 'gold',
    groupKey: 'softdrink_lover',
    threshold: 1337,
  },

  food_fan_silver: {
    key: 'food_fan_silver',
    name: 'Schlemmerchampion',
    description: '100 Speisen',
    icon: '🍔',
    tier: 'silver',
    groupKey: 'food_fan',
    threshold: 100,
  },
  food_fan_gold: {
    key: 'food_fan_gold',
    name: 'Schlemmerchampion',
    description: 'Teller-Titan: 1337 Speisen',
    icon: '🍔',
    tier: 'gold',
    groupKey: 'food_fan',
    threshold: 1337,
  },

  snack_king_silver: {
    key: 'snack_king_silver',
    name: 'Snack-König',
    description: '100 Snacks',
    icon: '🍿',
    tier: 'silver',
    groupKey: 'snack_king',
    threshold: 100,
  },
  snack_king_gold: {
    key: 'snack_king_gold',
    name: 'Snack-König',
    description: 'Knusper-Kaiser: 1337 Snacks',
    icon: '🍿',
    tier: 'gold',
    groupKey: 'snack_king',
    threshold: 1337,
  },

  misc_collector_silver: {
    key: 'misc_collector_silver',
    name: 'Sammler',
    description: '100 sonstige Artikel',
    icon: '📦',
    tier: 'silver',
    groupKey: 'misc_collector',
    threshold: 100,
  },
  misc_collector_gold: {
    key: 'misc_collector_gold',
    name: 'Sammler',
    description: 'Kuriositäten-König: 1337 sonstige Artikel',
    icon: '📦',
    tier: 'gold',
    groupKey: 'misc_collector',
    threshold: 1337,
  },

  // ── Balance-related (standalone) ──────────────────────────────────────────

  pleite: {
    key: 'pleite',
    name: 'Pleite',
    description: 'Kontostand fiel unter -10 €',
    icon: '💸',
    hidden: true,
  },
  tief_verschuldet: {
    key: 'tief_verschuldet',
    name: 'Tief verschuldet',
    description: 'Kontostand fiel unter -20 €',
    icon: '🕳️',
    hidden: true,
  },
  verantwortungsvoll: {
    key: 'verantwortungsvoll',
    name: 'Verantwortungsvoll',
    description: 'Einen positiven Kontostand gehalten',
    icon: '💚',
  },
  passendes_kleingeld: {
    key: 'passendes_kleingeld',
    name: 'Passendes Kleingeld',
    description: 'Exakten Betrag eingezahlt, um auf Null zu kommen',
    icon: '🪙',
    hidden: true,
  },
  grosse_einzahlung: {
    key: 'grosse_einzahlung',
    name: 'Große Einzahlung',
    description: 'Einzahlung von 50 € oder mehr',
    icon: '💰',
  },
  dreistellig: {
    key: 'dreistellig',
    name: 'Dreistellig',
    description: 'Kontostand von 100 € erreicht',
    icon: '🤑',
    hidden: true,
  },
  finanz_phoenix: {
    key: 'finanz_phoenix',
    name: 'Finanz-Phönix',
    description: 'Von unter -20 € auf über 20 € in einer Einzahlung',
    icon: '🔥',
    hidden: true,
  },
  ich_habs_ja: {
    key: 'ich_habs_ja',
    name: 'Ich habs ja',
    description: 'Eingezahlt obwohl der Kontostand positiv war',
    icon: '😏',
    hidden: true,
  },

  // ── Tageszeit (standalone) ─────────────────────────────────────────────────

  fruher_vogel: {
    key: 'fruher_vogel',
    name: 'Früher Vogel',
    description: 'Kauf zwischen 6 und 10 Uhr',
    icon: '🌅',
  },
  morgenrote: {
    key: 'morgenrote',
    name: 'Morgenröte',
    description: 'Kauf zwischen 4 und 6 Uhr früh',
    icon: '🌄',
    hidden: true,
  },
  geisterstunde: {
    key: 'geisterstunde',
    name: 'Geisterstunde',
    description: 'Kauf um genau Mitternacht (±10 Sek.)',
    icon: '👻',
    hidden: true,
  },
  happy_hour: {
    key: 'happy_hour',
    name: 'Happy Hour',
    description: 'Kauf zwischen 16 und 18 Uhr',
    icon: '🍻',
  },
  mittagspause: {
    key: 'mittagspause',
    name: 'Mittagspause',
    description: 'Kauf zwischen 12 und 13 Uhr',
    icon: '☀️',
  },
  monday_blues: {
    key: 'monday_blues',
    name: 'Monday Blues',
    description: 'Mehr als 3 Getränke an einem Montag',
    icon: '😩',
    hidden: true,
  },

  // ── Muster (standalone) ────────────────────────────────────────────────────

  shopper: {
    key: 'shopper',
    name: 'Shopper',
    description: '5 Käufe für sich selbst an einem BiFi-Tag',
    icon: '🛍️',
  },
  schnellfeuer: {
    key: 'schnellfeuer',
    name: 'Schnellfeuer',
    description: 'Mindestens 3 Käufe innerhalb einer Stunde mit je mind. 5 Min. Abstand',
    icon: '⚡',
    hidden: true,
  },
  intervall_trinker: {
    key: 'intervall_trinker',
    name: 'Intervall-Trinker',
    description: 'Drei aufeinanderfolgende Käufe mit gleichen Pausen (±1 Min.)',
    icon: '⏱️',
    hidden: true,
  },
  pünktlich_pils: {
    key: 'pünktlich_pils',
    name: 'Pünktlich-Pils',
    description: '5 BiFi-Tage in Folge zur gleichen Zeit (±30 Min.)',
    icon: '⌚',
    hidden: true,
  },
  tagliches_ritual: {
    key: 'tagliches_ritual',
    name: 'Tägliches Ritual',
    description: '5 BiFi-Tage in Folge mindestens einen Kauf',
    icon: '📅',
  },
  monats_streak: {
    key: 'monats_streak',
    name: 'Monats Streak',
    description: '4 aufeinanderfolgende ISO-Wochen mit mind. einem Kauf',
    icon: '🗓️',
  },
  weekend_warrior: {
    key: 'weekend_warrior',
    name: 'Weekend-Warrior',
    description: 'An einem Wochenende sowohl Samstag als auch Sonntag gekauft',
    icon: '🏖️',
  },
  saisontrinker: {
    key: 'saisontrinker',
    name: 'Saisontrinker',
    description: 'In allen vier Jahreszeiten gekauft',
    icon: '🌍',
    hidden: true,
  },
  feierlaune: {
    key: 'feierlaune',
    name: 'Feierlaune',
    description: 'An einem Feiertag (Weihnachten, Neujahr, Halloween) gekauft',
    icon: '🎉',
    hidden: true,
  },

  // ── Sozial (standalone) ────────────────────────────────────────────────────

  die_runde_geht_auf_mich: {
    key: 'die_runde_geht_auf_mich',
    name: 'Die Runde geht auf mich',
    description: '5 Items in einer Transaktion',
    icon: '🥳',
  },
  wein_buddy: {
    key: 'wein_buddy',
    name: 'Wein-Buddy',
    description: 'Gruppenbestellung mit einem Wein',
    icon: '🍷',
    hidden: true,
  },
  party: {
    key: 'party',
    name: 'Party',
    description: 'Erste Gruppenbestellung',
    icon: '🎊',
  },

  // ── Lucky (standalone) ─────────────────────────────────────────────────────

  lucky_seven: {
    key: 'lucky_seven',
    name: 'Lucky Seven',
    description: 'Die 7., 77., 777., ... Transaktion im System',
    icon: '7️⃣',
    hidden: true,
  },

  // ── Jackpot (standalone) ───────────────────────────────────────────────────

  die_sonne_lacht: {
    key: 'die_sonne_lacht',
    name: 'Die Sonne lacht',
    description: 'Am Jackpot gespielt',
    icon: '🎰',
  },
  gluckspilz: {
    key: 'gluckspilz',
    name: 'Glückspilz',
    description: 'Jackpot mit 0× — kostenlos!',
    icon: '🍀',
    hidden: true,
  },
  pechvogel: {
    key: 'pechvogel',
    name: 'Pechvogel',
    description: 'Jackpot mit 2× — doppelter Preis',
    icon: '🐦',
    hidden: true,
  },

} as const satisfies Record<string, AchievementDef>

export type AchievementKey = keyof typeof ACHIEVEMENTS
