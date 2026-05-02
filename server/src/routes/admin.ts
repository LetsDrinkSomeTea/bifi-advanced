import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, desc, eq, lt, or, sql } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { db } from '../db/index.ts';
import { redis } from '../db/redis.ts';
import {
  activityFeed,
  donationContributions,
  groupMembers,
  notifications,
  nudges,
  prostVouchers,
  transactions,
  userAchievements,
  userFavorites,
  userFriendships,
  users,
} from '../db/schema.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { invalidateUserSessions } from '../middleware/session.ts';
import { writeAuditLog } from '../services/audit.ts';
import { pushInvalidate, createNotification } from '../services/notifications.ts';
import { checkAchievements } from '../services/achievements.ts';

const router = new Hono();

router.use('*', requireAuth, requireRole('moderator'));

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
    .orderBy(asc(users.displayName));

  return c.json(allUsers);
});

// ─── POST /api/admin/users ────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/i)
    .optional(),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8),
  role: z.enum(['admin', 'moderator', 'member']).default('member'),
});

router.post('/users', requireRole('admin'), zValidator('json', CreateUserSchema), async (c) => {
  const body = c.req.valid('json');
  const actor = c.get('user');
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const passwordHash = await argon2.hash(body.password);

  const [created] = await db
    .insert(users)
    .values({
      email: body.email,
      username: body.username ?? null,
      displayName: body.displayName,
      passwordHash,
      role: body.role,
    })
    .returning();

  await writeAuditLog({
    actorId: actor.id,
    action: 'user.created',
    resourceType: 'user',
    resourceId: created!.id,
    changes: {
      after: {
        id: created!.id,
        email: body.email,
        role: body.role,
        via: 'admin',
      },
    },
    ipAddress: ip,
  });

  return c.json(
    {
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
    },
    201,
  );
});

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────

const UpdateUserSchema = z.object({
  role: z.enum(['admin', 'moderator', 'member']).optional(),
  isActive: z.boolean().optional(),
  jackpotAllowed: z.boolean().optional(),
  displayName: z.string().min(1).max(80).optional(),
});

router.patch('/users/:id', zValidator('json', UpdateUserSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const actor = c.get('user');

  // Only admins can assign the admin role
  if (body.role === 'admin' && actor.role !== 'admin') {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
  }

  const [before] = await db.select().from(users).where(eq(users.id, id));
  if (!before) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);

  const [updated] = await db
    .update(users)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (body.role !== undefined || body.isActive !== undefined) {
    await invalidateUserSessions(id);
  }

  await writeAuditLog({
    actorId: actor.id,
    action: 'user.updated',
    resourceType: 'user',
    resourceId: id,
    changes: { before, after: updated },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  });

  return c.json(updated);
});

// ─── POST /api/admin/users/:id/deposit ───────────────────────────────────────

const DepositSchema = z.object({
  amount: z.number().int().min(1),
  note: z.string().max(200).optional(),
});

router.post('/users/:id/deposit', zValidator('json', DepositSchema), async (c) => {
  const { id } = c.req.param();
  const { amount, note } = c.req.valid('json');
  const actor = c.get('user');

  const [target] = await db.select().from(users).where(eq(users.id, id));
  if (!target) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);

  const txn = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(transactions)
      .values({
        userId: id,
        initiatedBy: actor.id,
        type: 'deposit',
        totalAmount: amount,
        note: note ?? null,
      })
      .returning();

    await tx
      .update(users)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(users.id, id));

    return created!;
  });

  await writeAuditLog({
    actorId: actor.id,
    action: 'deposit',
    resourceType: 'transaction',
    resourceId: txn.id,
    changes: { after: { userId: id, amount } },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  });

  checkAchievements({
    type: 'deposit',
    userId: id,
    amount,
    balanceBefore: target.balance,
    balanceAfter: target.balance + amount,
  }).catch(console.error);

  pushInvalidate(id, ['balance', 'transactions']);

  return c.json(txn, 201);
});

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
    .orderBy(asc(users.balance));

  return c.json(debtors);
});

// ─── GET /api/admin/transactions ─────────────────────────────────────────────

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id })).toString('base64url');
}

function decodeCursor(cursor: string): { t: string; id: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as {
      t: string;
      id: string;
    };
  } catch {
    return null;
  }
}

const TxnQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/transactions', zValidator('query', TxnQuerySchema), async (c) => {
  const { cursor, limit } = c.req.valid('query');
  const parsed = cursor ? decodeCursor(cursor) : null;

  const rows = await db
    .select()
    .from(transactions)
    .where(
      parsed
        ? or(
            lt(transactions.createdAt, new Date(parsed.t)),
            and(eq(transactions.createdAt, new Date(parsed.t)), lt(transactions.id, parsed.id)),
          )
        : undefined,
    )
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
    : null;

  return c.json({ data: page, nextCursor });
});

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────

router.delete('/users/:id', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  const actor = c.get('user');

  const [target] = await db.select().from(users).where(eq(users.id, id));
  if (!target) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);

  // Check for transactions
  const [txn] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(or(eq(transactions.userId, id), eq(transactions.initiatedBy, id)));

  if (Number(txn?.count) > 0) {
    return c.json(
      {
        error:
          'User has transaction history and cannot be deleted. Please deactivate the account instead.',
        code: 'HAS_HISTORY',
      },
      400,
    );
  }

  await db.transaction(async (tx) => {
    // Clean up safe references
    await tx.delete(userFavorites).where(eq(userFavorites.userId, id));
    await tx.delete(userAchievements).where(eq(userAchievements.userId, id));
    await tx.delete(groupMembers).where(eq(groupMembers.userId, id));
    await tx.delete(notifications).where(eq(notifications.userId, id));
    await tx
      .delete(activityFeed)
      .where(or(eq(activityFeed.userId, id), eq(activityFeed.targetUserId, id)));
    await tx.delete(donationContributions).where(eq(donationContributions.userId, id));
    await tx
      .delete(userFriendships)
      .where(or(eq(userFriendships.requesterId, id), eq(userFriendships.addresseeId, id)));
    await tx.delete(nudges).where(or(eq(nudges.senderId, id), eq(nudges.recipientId, id)));
    await tx
      .delete(prostVouchers)
      .where(or(eq(prostVouchers.fromUserId, id), eq(prostVouchers.toUserId, id)));

    // Finally delete user
    await tx.delete(users).where(eq(users.id, id));
  });

  await writeAuditLog({
    actorId: actor.id,
    action: 'user.deleted',
    resourceType: 'user',
    resourceId: id,
    changes: { before: target },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  });

  await invalidateUserSessions(id);

  return c.body(null, 204);
});

// ─── POST /api/admin/users/:id/remind ────────────────────────────────────────

const REMIND_TEXT = 'Denk dran, dein Konto mal wieder aufzuladen! 💸';

router.post('/users/:id/remind', async (c) => {
  const { id } = c.req.param();
  const actor = c.get('user');

  const [target] = await db.select().from(users).where(eq(users.id, id));
  if (!target) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);

  // Rate limit: 1 reminder per admin→recipient per 10 minutes
  const cdKey = `remind:cd:${actor.id}:${id}`;
  const exists = await redis.exists(cdKey);
  if (exists) {
    const ttl = await redis.ttl(cdKey);
    return c.json({ error: 'Cooldown active', retryAfterSeconds: ttl }, 429);
  }

  // Store as a private nudge
  const [nudge] = await db
    .insert(nudges)
    .values({
      senderId: actor.id,
      recipientId: id,
      type: 'nudge',
      message: REMIND_TEXT,
      isPublic: false,
    })
    .returning();

  await redis.setEx(cdKey, 60, '1');

  createNotification({
    userId: id,
    type: 'nudge',
    title: 'Zahlungserinnerung',
    message: REMIND_TEXT,
    relatedId: nudge!.id,
  }).catch(console.error);

  return c.json({ ok: true });
});

export default router;
