import type { z } from 'zod';
import {
  type MeResponseSchema,
  type BUYABLE_CATEGORIES,
  type ROLES,
  type TRANSACTION_TYPES,
  type NOTIFICATION_TYPES,
  type FEED_TYPES,
  type NUDGE_TYPES,
  type FRIENDSHIP_STATUSES,
  type GROUP_ROLES,
} from './schemas.ts';
import type { AchievementKey, AchievementTier, PublicAchievementDef } from './achievements.ts';

export type User = z.infer<typeof MeResponseSchema>;
export type Role = (typeof ROLES)[number];

export const ROLE_LEVEL: Record<Role, number> = {
  member: 0,
  moderator: 1,
  admin: 2,
};

export type BuyableCategory = (typeof BUYABLE_CATEGORIES)[number];

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type NudgeType = (typeof NUDGE_TYPES)[number];

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type FeedType = (typeof FEED_TYPES)[number];

export type FriendshipStatusType = (typeof FRIENDSHIP_STATUSES)[number];
export type GroupRole = (typeof GROUP_ROLES)[number];

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

export interface ActiveDiscount {
  type: 'percent' | 'fixed';
  value: number;
  name: string;
  endTime: string | null;
  quantityRemaining: number | null;
  promoId: string;
}

export interface BuyableWithVariants {
  id: string;
  name: string;
  category: BuyableCategory | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  variants: {
    id: string;
    buyableId: string;
    name: string;
    price: number;
    isActive: boolean;
    sortOrder: number;
    activeDiscount: ActiveDiscount | null;
    discountedPrice: number;
  }[];
}

export interface Favorite {
  variantId: string;
  variantName: string;
  price: number;
  buyableId: string;
  buyableName: string;
  category: BuyableCategory | null;
  isAvailable: boolean;
  activeDiscount: ActiveDiscount | null;
  discountedPrice: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  balance: number;
  isActive: boolean;
  jackpotAllowed: boolean;
  hasSso: boolean;
  hasPassword: boolean;
  createdAt: string;
}

export interface SettlementEntry {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  balance: number;
}

export interface TransactionWithItems {
  id: string;
  userId: string;
  initiatedBy: string;
  type: TransactionType;
  totalAmount: number;
  groupId: string | null;
  note: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  jackpotMultiplier: string | null;
  createdAt: string;
  items: {
    id: string;
    buyableId: string;
    variantId: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    buyableName: string;
    variantName: string | null;
  }[];
}

export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  hasSso: boolean;
  hasPassword: boolean;
  friendshipStatus: FriendshipStatus | null;
  stats: {
    purchaseCount: number;
    leaderboardRank: { rank: number; categories: string[] } | null;
    favoriteProduct: { name: string; count: number } | null;
    friendCount: number;
  };
  achievements: { key: string; unlockedAt: string; meta?: PublicAchievementDef }[];
  achievementProgress: Record<string, number>;
}

export interface FeedEntry {
  id: string;
  type: FeedType;
  userId: string;
  targetUserId: string | null;
  targetGroupId: string | null;
  targetGroupImageUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; displayName: string; avatarUrl: string | null };
  targetUser: { id: string; displayName: string; avatarUrl: string | null } | null;
}

export type FeedEvent = FeedEntry;

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export interface Friend {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  since: string;
}

export interface FriendRequest {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  requestedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  value: number | null; // null = hidden (non-friend spending)
}

export interface AchievementWithDef {
  key: AchievementKey;
  unlockedAt: string;
}

export { AchievementKey, AchievementTier };
