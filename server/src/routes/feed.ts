import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { alias } from 'drizzle-orm/pg-core'
import { and, desc, eq, inArray, lt, ne, or } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { activityFeed, userFriendships, users } from '../db/schema.ts'
import { requireAuth } from '../middleware/auth.ts'

const router = new Hono()

const targetUsers = alias(users, 'target_users')

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id })).toString('base64url')
}

function decodeCursor(cursor: string): { t: string; id: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'))
  } catch {
    return null
  }
}

const QuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

router.get('/', requireAuth, zValidator('query', QuerySchema), async (c) => {
  const user = c.get('user')
  const { cursor, limit } = c.req.valid('query')
  const parsed = cursor ? decodeCursor(cursor) : null
  const cursorDate = parsed ? new Date(parsed.t) : null
  const cursorId = parsed?.id ?? null

  // Collect accepted friend IDs for purchase filtering
  const friendRows = await db
    .select({ requesterId: userFriendships.requesterId, addresseeId: userFriendships.addresseeId })
    .from(userFriendships)
    .where(
      and(
        or(eq(userFriendships.requesterId, user.id), eq(userFriendships.addresseeId, user.id)),
        eq(userFriendships.status, 'accepted'),
      ),
    )

  const friendIds = friendRows.map((f) => (f.requesterId === user.id ? f.addresseeId : f.requesterId))

  // Purchases are visible only for self and friends; all other event types are global
  const purchaseFilter =
    friendIds.length > 0
      ? or(
          ne(activityFeed.type, 'purchase'),
          eq(activityFeed.userId, user.id),
          inArray(activityFeed.userId, friendIds),
        )
      : or(ne(activityFeed.type, 'purchase'), eq(activityFeed.userId, user.id))

  const cursorFilter =
    cursorDate && cursorId
      ? or(
          lt(activityFeed.createdAt, cursorDate),
          and(eq(activityFeed.createdAt, cursorDate), lt(activityFeed.id, cursorId)),
        )
      : undefined

  const rows = await db
    .select({
      id: activityFeed.id,
      type: activityFeed.type,
      userId: activityFeed.userId,
      targetUserId: activityFeed.targetUserId,
      targetGroupId: activityFeed.targetGroupId,
      metadata: activityFeed.metadata,
      createdAt: activityFeed.createdAt,
      user: {
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
      targetUser: {
        id: targetUsers.id,
        displayName: targetUsers.displayName,
        avatarUrl: targetUsers.avatarUrl,
      },
    })
    .from(activityFeed)
    .innerJoin(users, eq(activityFeed.userId, users.id))
    .leftJoin(targetUsers, eq(activityFeed.targetUserId, targetUsers.id))
    .where(and(purchaseFilter, cursorFilter))
    .orderBy(desc(activityFeed.createdAt), desc(activityFeed.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? encodeCursor(page.at(-1)!.createdAt, page.at(-1)!.id) : null

  const data = page.map((row) => ({
    ...row,
    targetUser: row.targetUser?.id ? row.targetUser : null,
  }))

  return c.json({ data, nextCursor })
})

export default router
