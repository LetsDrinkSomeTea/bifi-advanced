import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { alias } from 'drizzle-orm/pg-core'
import { and, eq, sql } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { db } from '../db/index.ts'
import { groupMembers, groups, users } from '../db/schema.ts'
import { emitFeedEvent } from '../services/feed.ts'
import { requireAuth } from '../middleware/auth.ts'
import { checkAchievements } from '../services/achievements.ts'

const router = new Hono()

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

const allMembers = alias(groupMembers, 'all_members')

// ─── GET /api/groups ──────────────────────────────────────────────────────────

router.get('/', requireAuth, async (c) => {
  const user = c.get('user')

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      inviteCode: groups.inviteCode,
      createdBy: groups.createdBy,
      createdAt: groups.createdAt,
      memberCount: sql<number>`count(distinct ${allMembers.userId})::int`,
      myRole: groupMembers.role,
    })
    .from(groups)
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, user.id)))
    .leftJoin(allMembers, eq(allMembers.groupId, groups.id))
    .where(eq(groups.isActive, true))
    .groupBy(groups.id, groupMembers.role)

  return c.json(rows)
})

// ─── GET /api/groups/:id ──────────────────────────────────────────────────────

router.get('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  const [group] = await db.select().from(groups).where(and(eq(groups.id, id), eq(groups.isActive, true)))
  if (!group) return c.json({ error: 'Group not found', code: 'NOT_FOUND' }, 404)

  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, user.id)))
  if (!membership) return c.json({ error: 'Not a member', code: 'FORBIDDEN' }, 403)

  const members = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, id))

  return c.json({ ...group, members, myRole: membership.role })
})

// ─── POST /api/groups ─────────────────────────────────────────────────────────

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
})

router.post('/', requireAuth, zValidator('json', CreateGroupSchema), async (c) => {
  const user = c.get('user')
  const { name, description } = c.req.valid('json')

  const inviteCode = generateInviteCode()

  const [group] = await db
    .insert(groups)
    .values({
      name,
      description: description ?? null,
      createdBy: user.id,
      inviteCode,
    })
    .returning()

  await db.insert(groupMembers).values({
    groupId: group!.id,
    userId: user.id,
    role: 'owner',
  })

  emitFeedEvent({ type: 'group_created', userId: user.id, targetGroupId: group!.id, metadata: { groupName: name } })

  checkAchievements({ type: 'group_founded', userId: user.id }).catch(console.error)

  return c.json(group, 201)
})

// ─── POST /api/groups/join ────────────────────────────────────────────────────

router.post('/join', requireAuth, zValidator('json', z.object({ inviteCode: z.string() })), async (c) => {
  const user = c.get('user')
  const { inviteCode } = c.req.valid('json')

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.inviteCode, inviteCode.toUpperCase()), eq(groups.isActive, true)))
  if (!group) return c.json({ error: 'Invalid invite code', code: 'INVALID_CODE' }, 404)

  // Check if already a member
  const [existing] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)))
  if (existing) return c.json({ error: 'Already a member', code: 'ALREADY_MEMBER' }, 409)

  await db.insert(groupMembers).values({ groupId: group.id, userId: user.id, role: 'member' })

  emitFeedEvent({ type: 'group_join', userId: user.id, targetGroupId: group.id, metadata: { groupName: group.name } })

  return c.json(group, 201)
})

// ─── POST /api/groups/:id/leave ───────────────────────────────────────────────

router.post('/:id/leave', requireAuth, async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  const [[membership], [group]] = await Promise.all([
    db.select().from(groupMembers).where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, user.id))),
    db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.id, id)),
  ])
  if (!membership) return c.json({ error: 'Not a member', code: 'NOT_MEMBER' }, 404)

  if (membership.role === 'owner') {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, id))

    if (count <= 1) {
      // Last member — archive the group
      await db.update(groups).set({ isActive: false }).where(eq(groups.id, id))
      await db.delete(groupMembers).where(eq(groupMembers.groupId, id))
      emitFeedEvent({ type: 'group_deleted', userId: user.id, metadata: { groupName: group?.name ?? id } })
      return c.body(null, 204)
    }
    return c.json({ error: 'Transfer ownership before leaving', code: 'OWNER_MUST_TRANSFER' }, 400)
  }

  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, user.id)))
  emitFeedEvent({ type: 'group_left', userId: user.id, targetGroupId: id, metadata: { groupName: group?.name ?? id } })
  return c.body(null, 204)
})

// ─── DELETE /api/groups/:id/members/:userId ───────────────────────────────────

router.delete('/:id/members/:userId', requireAuth, async (c) => {
  const self = c.get('user')
  const { id, userId } = c.req.param()

  const [myMembership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, self.id)))
  if (myMembership?.role !== 'owner') return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)

  if (userId === self.id) return c.json({ error: 'Cannot remove yourself', code: 'SELF_REMOVE' }, 400)

  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, userId)))
  return c.body(null, 204)
})

// ─── DELETE /api/groups/:id ───────────────────────────────────────────────────

router.delete('/:id', requireAuth, async (c) => {
  const self = c.get('user')
  const { id } = c.req.param()

  const [[myMembership], [group]] = await Promise.all([
    db.select().from(groupMembers).where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, self.id))),
    db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.id, id)),
  ])
  if (myMembership?.role !== 'owner') return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)

  await db.update(groups).set({ isActive: false }).where(eq(groups.id, id))
  await db.delete(groupMembers).where(eq(groupMembers.groupId, id))
  emitFeedEvent({ type: 'group_deleted', userId: self.id, metadata: { groupName: group?.name ?? id } })
  return c.body(null, 204)
})

// ─── PATCH /api/groups/:id/invite-code ───────────────────────────────────────

router.patch('/:id/invite-code', requireAuth, async (c) => {
  const self = c.get('user')
  const { id } = c.req.param()

  const [myMembership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, self.id)))
  if (myMembership?.role !== 'owner') return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)

  const newCode = generateInviteCode()
  await db.update(groups).set({ inviteCode: newCode }).where(eq(groups.id, id))
  return c.json({ inviteCode: newCode })
})

export default router
