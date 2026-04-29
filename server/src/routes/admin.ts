import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, asc, eq, lt, sql } from 'drizzle-orm'
import * as argon2 from 'argon2'
import { db } from '../db/index.ts'
import { transactions, users } from '../db/schema.ts'
import { requireAuth, requireRole } from '../middleware/auth.ts'
import { invalidateUserSessions } from '../middleware/session.ts'
import { writeAuditLog } from '../services/audit.ts'

const router = new Hono()

router.use('*', requireAuth, requireRole('moderator'))

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', async (c) => {
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      balance: users.balance,
      isActive: users.isActive,
      jackpotAllowed: users.jackpotAllowed,
      hasSso: sql<boolean>`(${users.ssoClaim} IS NOT NULL)`,
      hasPassword: sql<boolean>`(${users.passwordHash} IS NOT NULL)`,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.displayName))

  return c.json(allUsers)
})

// ─── POST /api/admin/users ────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(32).regex(/^[a-z0-9_-]+$/i).optional(),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8),
  role: z.enum(['admin', 'moderator', 'member']).default('member'),
})

router.post('/users', requireRole('admin'), zValidator('json', CreateUserSchema), async (c) => {
  const body = c.req.valid('json')
  const actor = c.get('user')
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  const passwordHash = await argon2.hash(body.password)

  const [created] = await db
    .insert(users)
    .values({ email: body.email, username: body.username ?? null, displayName: body.displayName, passwordHash, role: body.role })
    .returning()

  await writeAuditLog({
    actorId: actor.id,
    action: 'user.created',
    resourceType: 'user',
    resourceId: created!.id,
    changes: { after: { id: created!.id, email: body.email, role: body.role, via: 'admin' } },
    ipAddress: ip,
  })

  return c.json({
    id: created!.id,
    email: created!.email,
    username: created!.username,
    displayName: created!.displayName,
    avatarUrl: null,
    role: created!.role,
    balance: created!.balance,
    isActive: created!.isActive,
    jackpotAllowed: created!.jackpotAllowed,
    hasSso: false,
    hasPassword: true,
    createdAt: created!.createdAt,
  }, 201)
})

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────

const UpdateUserSchema = z.object({
  role: z.enum(['admin', 'moderator', 'member']).optional(),
  isActive: z.boolean().optional(),
  jackpotAllowed: z.boolean().optional(),
  displayName: z.string().min(1).max(80).optional(),
})

router.patch('/users/:id', zValidator('json', UpdateUserSchema), async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const actor = c.get('user')

  const [before] = await db.select().from(users).where(eq(users.id, id))
  if (!before) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404)

  const [updated] = await db
    .update(users)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()

  if (body.role !== undefined || body.isActive !== undefined) {
    await invalidateUserSessions(id)
  }

  await writeAuditLog({
    actorId: actor.id,
    action: 'user.updated',
    resourceType: 'user',
    resourceId: id,
    changes: { before, after: updated },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return c.json(updated)
})

// ─── POST /api/admin/users/:id/deposit ───────────────────────────────────────

const DepositSchema = z.object({
  amount: z.number().int().min(1),
  note: z.string().max(200).optional(),
})

router.post('/users/:id/deposit', zValidator('json', DepositSchema), async (c) => {
  const { id } = c.req.param()
  const { amount, note } = c.req.valid('json')
  const actor = c.get('user')

  const [target] = await db.select().from(users).where(eq(users.id, id))
  if (!target) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404)

  const txn = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(transactions)
      .values({ userId: id, initiatedBy: actor.id, type: 'deposit', totalAmount: amount, note: note ?? null })
      .returning()

    await tx
      .update(users)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(users.id, id))

    return created!
  })

  await writeAuditLog({
    actorId: actor.id,
    action: 'deposit',
    resourceType: 'transaction',
    resourceId: txn.id,
    changes: { after: { userId: id, amount } },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return c.json(txn, 201)
})

// ─── GET /api/admin/settlement ────────────────────────────────────────────────

router.get('/settlement', async (c) => {
  const debtors = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      balance: users.balance,
    })
    .from(users)
    .where(and(lt(users.balance, 0), eq(users.isActive, true)))
    .orderBy(asc(users.balance))

  return c.json(debtors)
})

export default router
