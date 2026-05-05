import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq, or, sql } from 'drizzle-orm';
import { linkSessionToUser, regenerateSession } from '../middleware/session.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';
import { writeAuditLog } from '../services/audit.ts';

const localAuth = new Hono();

const BootstrapSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(32).optional(),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8),
});

// Creates first admin user; only works when NO users exist yet
localAuth.post('/bootstrap', zValidator('json', BootstrapSchema), async (c) => {
  const result = (await db.select({ count: sql`count(*)` }).from(users))[0];
  const count = result?.count ?? 0;

  if (Number(count) > 0) {
    return c.json(
      { error: 'Bootstrap only allowed when no users exist', code: 'ALREADY_BOOTSTRAPPED' },
      403,
    );
  }

  const body = c.req.valid('json');
  const passwordHash = await argon2.hash(body.password);

  const [created] = await db
    .insert(users)
    .values({
      email: body.email,
      username: body.username ?? null,
      displayName: body.displayName,
      passwordHash,
      role: 'admin',
    })
    .returning();

  if (!created) {
    return c.json({ error: 'Failed to create admin user', code: 'BOOTSTRAP_FAILED' }, 500);
  }

  await writeAuditLog({
    actorId: created.id,
    action: 'user.created',
    resourceType: 'user',
    resourceId: created.id,
    changes: { after: { id: created.id, email: body.email, role: 'admin', via: 'bootstrap' } },
  });

  return c.json(
    { id: created.id, email: created.email, displayName: created.displayName, role: 'admin' },
    201,
  );
});

const LoginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

const loginRateLimit = rateLimit(10, 60, (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return `rl:login:${ip}`;
});

const CreateLocalUserSchema = z.object({
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

localAuth.post('/login', loginRateLimit, zValidator('json', LoginSchema), async (c) => {
  const { login, password } = c.req.valid('json');

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, login), eq(users.username, login)));

  if (!user?.passwordHash) {
    return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);
  }

  if (!user.isActive) {
    return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);
  }

  const freshSession = await regenerateSession(c);
  freshSession.userId = user.id;
  await linkSessionToUser(c.get('sessionId'), user.id);

  return c.json({
    success: true,
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  });
});

// Admin-only: create a local user (no SSO required)
localAuth.post(
  '/users',
  requireAuth,
  requireRole('admin'),
  zValidator('json', CreateLocalUserSchema),
  async (c) => {
    const body = c.req.valid('json');
    const actor = c.get('user');
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? null;

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

    if (!created) {
      return c.json({ error: 'Failed to create user', code: 'CREATE_FAILED' }, 500);
    }

    await writeAuditLog({
      actorId: actor.id,
      action: 'user.created',
      resourceType: 'user',
      resourceId: created.id,
      changes: { after: { id: created.id, email: body.email, role: body.role, via: 'local' } },
      ipAddress: ip,
    });

    return c.json(
      {
        id: created.id,
        email: created.email,
        username: created.username,
        displayName: created.displayName,
        role: created.role,
        createdAt: created.createdAt,
      },
      201,
    );
  },
);

// Admin-only: set/update password for any user
localAuth.put(
  '/users/:id/password',
  requireAuth,
  requireRole('admin'),
  zValidator('json', z.object({ password: z.string().min(8) })),
  async (c) => {
    const { password } = c.req.valid('json');
    const { id } = c.req.param();
    const actor = c.get('user');
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? null;

    const passwordHash = await argon2.hash(password);

    const [updated] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);
    }

    await writeAuditLog({
      actorId: actor.id,
      action: 'user.password_changed',
      resourceType: 'user',
      resourceId: id,
      ipAddress: ip,
    });

    return c.json({ success: true });
  },
);

export default localAuth;
