import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { buyables, transactionItems, transactions, userAchievements, userFriendships, users } from '../db/schema.ts'
import { requireAuth } from '../middleware/auth.ts'

const router = new Hono()

// ─── GET /api/users/search ────────────────────────────────────────────────────

const SearchSchema = z.object({ q: z.string().min(1).max(80) })

router.get('/search', requireAuth, zValidator('query', SearchSchema), async (c) => {
  const self = c.get('user')
  const { q } = c.req.valid('query')
  const term = `%${q}%`

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        or(ilike(users.displayName, term), ilike(users.username, term)),
      ),
    )
    .limit(20)

  // Exclude self from results
  return c.json(rows.filter((u) => u.id !== self.id))
})

// ─── GET /api/users/:id/profile ───────────────────────────────────────────────

router.get('/:id/profile', requireAuth, async (c) => {
  const { id } = c.req.param()
  const self = c.get('user')

  const [user] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
      hasSso: sql<boolean>`(${users.ssoClaim} IS NOT NULL)`,
      hasPassword: sql<boolean>`(${users.passwordHash} IS NOT NULL)`,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.isActive, true)))

  if (!user) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404)

  // Purchase count
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, id), eq(transactions.type, 'purchase'), isNull(transactions.cancelledAt)))

  // Leaderboard rank by total spent alltime
  const rankResult = await db.execute(sql`
    WITH totals AS (
      SELECT user_id, SUM(ABS(total_amount)) AS total
      FROM transactions
      WHERE type = 'purchase' AND cancelled_at IS NULL
      GROUP BY user_id
    ),
    ranked AS (
      SELECT user_id, RANK() OVER (ORDER BY total DESC)::int AS rank
      FROM totals
    )
    SELECT rank FROM ranked WHERE user_id = ${id}
  `)
  const rank = (rankResult.rows[0] as { rank: number } | undefined)?.rank ?? null

  // Favorite product
  const [favProduct] = await db
    .select({
      name: buyables.name,
      count: sql<number>`count(*)::int`,
    })
    .from(transactionItems)
    .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
    .innerJoin(buyables, eq(transactionItems.buyableId, buyables.id))
    .where(and(eq(transactions.userId, id), eq(transactions.type, 'purchase'), isNull(transactions.cancelledAt)))
    .groupBy(buyables.id, buyables.name)
    .orderBy(desc(sql`count(*)`))
    .limit(1)

  // Friendship status (skip if own profile)
  let friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' | null = null
  if (id !== self.id) {
    const [fs] = await db
      .select()
      .from(userFriendships)
      .where(
        or(
          and(eq(userFriendships.requesterId, self.id), eq(userFriendships.addresseeId, id)),
          and(eq(userFriendships.requesterId, id), eq(userFriendships.addresseeId, self.id)),
        ),
      )

    if (!fs) {
      friendshipStatus = 'none'
    } else if (fs.status === 'accepted') {
      friendshipStatus = 'friends'
    } else if (fs.requesterId === self.id) {
      friendshipStatus = 'pending_sent'
    } else {
      friendshipStatus = 'pending_received'
    }
  }

  const achievementRows = await db
    .select({ key: userAchievements.achievementKey, unlockedAt: userAchievements.unlockedAt })
    .from(userAchievements)
    .where(eq(userAchievements.userId, id))
    .orderBy(desc(userAchievements.unlockedAt))

  return c.json({
    ...user,
    friendshipStatus,
    stats: {
      purchaseCount: countRow?.count ?? 0,
      leaderboardRank: rank,
      favoriteProduct: favProduct ?? null,
    },
    achievements: achievementRows,
  })
})

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  username: z.string().min(2).max(32).regex(/^[a-z0-9_-]+$/i).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

router.patch('/me', requireAuth, zValidator('json', UpdateProfileSchema), async (c) => {
  const self = c.get('user')
  const body = c.req.valid('json')

  const isLocalUser = !!self.passwordHash || !self.ssoClaim
  const patch: Record<string, unknown> = { updatedAt: new Date() }

  if (body.avatarUrl !== undefined) patch.avatarUrl = body.avatarUrl
  if (isLocalUser) {
    if (body.displayName !== undefined) patch.displayName = body.displayName
    if (body.username !== undefined) patch.username = body.username
  }

  try {
    const [updated] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, self.id))
      .returning()

    await c.get('session' as never)
    return c.json({
      id: updated!.id,
      displayName: updated!.displayName,
      username: updated!.username,
      avatarUrl: updated!.avatarUrl,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return c.json({ error: 'Benutzername bereits vergeben', code: 'CONFLICT' }, 409)
    }
    throw err
  }
})

export default router
