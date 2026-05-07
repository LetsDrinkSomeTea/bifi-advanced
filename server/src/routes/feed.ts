import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { alias } from 'drizzle-orm/pg-core';
import {
  and,
  desc,
  eq,
  exists,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '../db/index.ts';
import { activityFeed, groupMembers, groups, userFriendships, users } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { type PaginatedResponse, type FeedEvent } from '../../../shared/src/types.ts';
import { decodeCursor, encodeCursor } from '../lib/cursor.ts';

const router = new Hono();

const targetUsers = alias(users, 'target_users');
const targetGroups = alias(groups, 'target_groups');

const QuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─── GET /api/feed ───────────────────────────────────────────────────────────

router.get('/', requireAuth, zValidator('query', QuerySchema), async (c): Promise<Response> => {
  const user = c.get('user');
  const { cursor, limit } = c.req.valid('query');

  const parsed = cursor ? decodeCursor(cursor) : null;
  const cursorDate = parsed ? new Date(parsed.t) : null;
  const cursorId = parsed?.id ?? null;

  const friendRows = await db
    .select({ requesterId: userFriendships.requesterId, addresseeId: userFriendships.addresseeId })
    .from(userFriendships)
    .where(
      and(
        or(eq(userFriendships.requesterId, user.id), eq(userFriendships.addresseeId, user.id)),
        eq(userFriendships.status, 'accepted'),
      ),
    );

  const friendIds = friendRows.map((f) =>
    f.requesterId === user.id ? f.addresseeId : f.requesterId,
  );

  // Events by self or friends (or targeting self/friend)
  const selfOrFriendFilter =
    friendIds.length > 0
      ? or(
          eq(activityFeed.userId, user.id),
          inArray(activityFeed.userId, friendIds),
          eq(activityFeed.targetUserId, user.id),
          inArray(activityFeed.targetUserId, friendIds),
        )
      : or(eq(activityFeed.userId, user.id), eq(activityFeed.targetUserId, user.id));

  // Group events: visible only while the user was an active member at event time
  const wasGroupMember = exists(
    db
      .select({ one: sql`1` })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, activityFeed.targetGroupId),
          eq(groupMembers.userId, user.id),
          lte(groupMembers.joinedAt, activityFeed.createdAt),
          or(isNull(groupMembers.leftAt), gt(groupMembers.leftAt, activityFeed.createdAt)),
        ),
      ),
  );

  // Events with a targetGroupId use membership-based visibility
  // All other events use self/friends filter
  const visibilityFilter = or(
    and(isNotNull(activityFeed.targetGroupId), wasGroupMember),
    and(isNull(activityFeed.targetGroupId), selfOrFriendFilter),
  );

  const cursorFilter =
    cursorDate && cursorId
      ? or(
          lt(activityFeed.createdAt, cursorDate),
          and(eq(activityFeed.createdAt, cursorDate), lt(activityFeed.id, cursorId)),
        )
      : undefined;

  const rows = await db
    .select({
      id: activityFeed.id,
      userId: activityFeed.userId,
      type: activityFeed.type,
      targetUserId: activityFeed.targetUserId,
      targetGroupId: activityFeed.targetGroupId,
      metadata: activityFeed.metadata,
      createdAt: activityFeed.createdAt,
      userDisplayName: users.displayName,
      userAvatarUrl: users.avatarUrl,
      targetDisplayName: targetUsers.displayName,
      targetAvatarUrl: targetUsers.avatarUrl,
      targetGroupImageUrl: targetGroups.imageUrl,
    })
    .from(activityFeed)
    .innerJoin(users, eq(activityFeed.userId, users.id))
    .leftJoin(targetUsers, eq(activityFeed.targetUserId, targetUsers.id))
    .leftJoin(targetGroups, eq(activityFeed.targetGroupId, targetGroups.id))
    .where(and(visibilityFilter, cursorFilter))
    .orderBy(desc(activityFeed.createdAt), desc(activityFeed.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const lastItem = page[page.length - 1];
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

  const data: FeedEvent[] = page.map((r) => ({
    id: r.id,
    userId: r.userId,
    type: r.type,
    targetUserId: r.targetUserId,
    targetGroupId: r.targetGroupId,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.createdAt.toISOString(),
    user: {
      id: r.userId,
      displayName: r.userDisplayName,
      avatarUrl: r.userAvatarUrl,
    },
    targetUser: r.targetUserId
      ? {
          id: r.targetUserId,
          displayName: r.targetDisplayName ?? 'Unbekannt',
          avatarUrl: r.targetAvatarUrl,
        }
      : null,
    targetGroupImageUrl: r.targetGroupImageUrl ?? null,
  }));

  const response: PaginatedResponse<FeedEvent> = {
    data,
    nextCursor,
  };

  return c.json(response);
});

export default router;
