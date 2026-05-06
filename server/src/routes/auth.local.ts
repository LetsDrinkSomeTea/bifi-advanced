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
import { getClientIp } from '../lib/ip.ts';

const localAuth = new Hono();
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$v/P+IikR3fTgBkoXpxH3rw$HmKhv9N0aN0iZ5/hNQI+2BgcJ5LEPh5xXiEyvasNycY';

const BootstrapSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(32).optional(),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8),
});

// Creates first admin user; only works when NO users exist yet
localAuth.post('/bootstrap', zValidator('json', BootstrapSchema), async (c) => {
  const body = c.req.valid('json');
  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE users IN EXCLUSIVE MODE`);
    const [row] = await tx.select({ count: sql<number>`count(*)::int` }).from(users);
    if ((row?.count ?? 0) > 0) {
      return null;
    }
    const passwordHash = await argon2.hash(body.password);
    const [inserted] = await tx
      .insert(users)
      .values({
        email: body.email,
        username: body.username ?? null,
        displayName: body.displayName,
        passwordHash,
        role: 'admin',
      })
      .returning();
    if (!inserted) {
      throw new Error('Failed to create admin user');
    }
    return inserted;
  });

  if (!created) {
    return c.json(
      { error: 'Bootstrap only allowed when no users exist', code: 'ALREADY_BOOTSTRAPPED' },
      403,
    );
  }


  await writeAuditLog({
    actorId: created.id,
    action: 'user.created',
    resourceType: 'user',
    resourceId: created.id,
    resourceName: created.displayName,
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
  const ip = getClientIp(c) ?? 'untrusted-client';
  return `rl:login:${ip}`;
});

localAuth.post('/login', loginRateLimit, zValidator('json', LoginSchema), async (c) => {
  const { login, password } = c.req.valid('json');

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, login), eq(users.username, login)));

  const passwordHashToVerify = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const valid = await argon2.verify(passwordHashToVerify, password);
  if (!user?.passwordHash || !user.isActive || !valid) {
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
    const ip = getClientIp(c);

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
      resourceName: updated.displayName,
      ipAddress: ip,
    });

    return c.json({ success: true });
  },
);

export default localAuth;
