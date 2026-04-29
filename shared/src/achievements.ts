export interface AchievementDef {
  key: string
  name: string
  description: string
  icon: string
}

export const ACHIEVEMENTS = {
  first_purchase: {
    key: 'first_purchase',
    name: 'Erster Strich',
    description: 'Ersten Kauf getätigt',
    icon: '🎉',
  },
  ten_purchases: {
    key: 'ten_purchases',
    name: 'Stammkunde',
    description: '10 Käufe getätigt',
    icon: '⭐',
  },
  hundred_purchases: {
    key: 'hundred_purchases',
    name: 'Getränke-Legende',
    description: '100 Käufe getätigt',
    icon: '🏆',
  },
  prost_sender_5: {
    key: 'prost_sender_5',
    name: 'Großzügiger Geist',
    description: '5× Prost gesendet',
    icon: '🥂',
  },
  prost_receiver_10: {
    key: 'prost_receiver_10',
    name: 'Beliebteste Person',
    description: '10× Prost erhalten',
    icon: '❤️',
  },
  group_founder: {
    key: 'group_founder',
    name: 'Gruppeninitiator',
    description: 'Erste Gruppe gegründet',
    icon: '👥',
  },
  jackpot_winner: {
    key: 'jackpot_winner',
    name: 'Glückspilz',
    description: 'Jackpot mit 0× Multiplikator gewonnen',
    icon: '🎰',
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
  donation_hero: {
    key: 'donation_hero',
    name: 'Spendenritter',
    description: '3× zum Donation Goal beigetragen',
    icon: '🦸',
  },
} as const satisfies Record<string, AchievementDef>

export type AchievementKey = keyof typeof ACHIEVEMENTS
