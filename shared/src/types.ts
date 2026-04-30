import type { z } from 'zod'
import type { MeResponseSchema } from './schemas.ts'
import type { AchievementKey, AchievementTier } from './achievements.ts'

export type User = z.infer<typeof MeResponseSchema>
export type Role = User['role']

export interface ApiError {
  error: string
  code: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
}

export interface BuyableWithVariants {
  id: string
  name: string
  imageUrl: string | null
  category: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  variants: Array<{
    id: string
    buyableId: string
    name: string
    price: number
    isActive: boolean
    sortOrder: number
  }>
}

export interface Favorite {
  variantId: string
  variantName: string
  price: number
  buyableId: string
  buyableName: string
  category: string | null
  isAvailable: boolean
}

export interface AdminUser {
  id: string
  email: string
  username: string | null
  displayName: string
  avatarUrl: string | null
  role: Role
  balance: number
  isActive: boolean
  jackpotAllowed: boolean
  hasSso: boolean
  hasPassword: boolean
  createdAt: string
}

export interface SettlementEntry {
  id: string
  displayName: string
  email: string
  avatarUrl: string | null
  balance: number
}

export interface TransactionWithItems {
  id: string
  userId: string
  initiatedBy: string
  type: 'purchase' | 'deposit' | 'correction' | 'jackpot' | 'prost'
  totalAmount: number
  groupId: string | null
  note: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  jackpotMultiplier: string | null
  createdAt: string
  items: Array<{
    id: string
    buyableId: string
    variantId: string | null
    quantity: number
    unitPrice: number
    totalPrice: number
    buyableName: string
    variantName: string | null
  }>
}

export interface PublicProfile {
  id: string
  displayName: string
  avatarUrl: string | null
  role: 'admin' | 'moderator' | 'member'
  createdAt: string
  hasSso: boolean
  hasPassword: boolean
  friendshipStatus: FriendshipStatus | null
  stats: {
    purchaseCount: number
    leaderboardRank: number | null
    favoriteProduct: { name: string; count: number } | null
  }
  achievements: Array<{ key: string; unlockedAt: string }>
}

export interface FeedEvent {
  id: string
  userId: string
  type:
    | 'purchase'
    | 'achievement'
    | 'group_join'
    | 'prost_sent'
    | 'prost_received'
    | 'goal_reached'
    | 'jackpot_win'
  targetUserId: string | null
  targetGroupId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { id: string; displayName: string; avatarUrl: string | null }
  targetUser?: { id: string; displayName: string; avatarUrl: string | null }
}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends'

export interface Friend {
  id: string
  displayName: string
  avatarUrl: string | null
  since: string
}

export interface FriendRequest {
  id: string
  displayName: string
  avatarUrl: string | null
  requestedAt: string
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  avatarUrl: string | null
  value: number | null  // null = hidden (non-friend spending)
}

export interface AchievementWithDef {
  key: AchievementKey
  unlockedAt: string
}

export { AchievementKey, AchievementTier }
