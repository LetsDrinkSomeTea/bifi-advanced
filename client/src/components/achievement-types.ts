import type { AchievementTier } from '@shared/achievements';

export interface TierEntry {
  tier: AchievementTier;
  key: string;
  description: string;
  unlocked: boolean;
}

export interface GroupCard {
  kind: 'group';
  groupKey: string;
  name: string;
  icon: string;
  color?: string;
  hidden: boolean;
  tiers: TierEntry[];
  anyUnlocked: boolean;
  highestUnlocked: AchievementTier | null;
  latestUnlockedAt: Date | null;
}

export interface StandaloneCard {
  kind: 'standalone';
  key: string;
  name: string;
  icon: string;
  color?: string;
  description: string;
  hidden: boolean;
  unlocked: boolean;
  unlockedAt: Date | null;
}

export type Card = GroupCard | StandaloneCard;

export const TIER_ORDER: Record<AchievementTier, number> = { bronze: 0, silver: 1, gold: 2 };

export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: 'text-medal-bronze',
  silver: 'text-medal-silver',
  gold: 'text-medal-gold',
};
