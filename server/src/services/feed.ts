import { db } from '../db/index.ts'
import { activityFeed } from '../db/schema.ts'
import { broadcastInvalidate } from './notifications.ts'

// ─── Event type definitions ────────────────────────────────────────────────────
// To add a new event:
//   1. Add a member to FeedEvent union below
//   2. Call emitFeedEvent({ type: '...', ... }) from the relevant route/service
//   3. Add a case to feedText() in client/src/components/FeedItem.tsx

type PurchaseItem = { name: string; variantName: string; count: number }

export type FeedEvent =
  | {
      type: 'purchase'
      userId: string
      metadata: { items: PurchaseItem[]; totalAmount: number; groupId?: string; memberCount?: number }
    }
  | {
      type: 'prost_sent'
      userId: string
      targetUserId: string
      metadata: { variantId: string; amount: number; buyableName: string; variantName: string }
    }
  | {
      type: 'nudge'
      userId: string
      targetUserId: string
      metadata: { message: string }
    }
  | {
      type: 'group_join'
      userId: string
      targetGroupId: string
      metadata: { groupName: string }
    }
  | {
      type: 'group_created'
      userId: string
      targetGroupId: string
      metadata: { groupName: string }
    }
  | {
      type: 'group_left'
      userId: string
      targetGroupId: string
      metadata: { groupName: string }
    }
  | {
      type: 'group_deleted'
      userId: string
      metadata: { groupName: string }
    }
  | {
      type: 'achievement'
      userId: string
      metadata: { achievementKey: string }
    }
  | {
      type: 'friendship_started'
      userId: string
      targetUserId: string
    }
  | {
      type: 'goal_reached'
      userId: string
      metadata: { goalTitle: string }
    }
  | {
      type: 'jackpot_win'
      userId: string
      metadata: { multiplier: number }
    }

// ─── Emit ──────────────────────────────────────────────────────────────────────

export function emitFeedEvent(event: FeedEvent): void {
  const values: typeof activityFeed.$inferInsert = {
    userId: event.userId,
    type: event.type,
    targetUserId: 'targetUserId' in event ? event.targetUserId : null,
    targetGroupId: 'targetGroupId' in event ? event.targetGroupId : null,
    metadata: 'metadata' in event ? (event.metadata as Record<string, unknown>) : null,
  }
  db.insert(activityFeed)
    .values(values)
    .then(() => broadcastInvalidate(['feed']))
    .catch((err) => console.error('[feed] emit failed:', event.type, err))
}
