import { type MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { type Role } from '../../../shared/src/types.ts';

const ROLE_LEVEL: Record<Role, number> = {
  member: 0,
  moderator: 1,
  admin: 2,
};

declare module 'hono' {
  interface ContextVariableMap {
    user: typeof users.$inferSelect;
  }
}

export const requireAuth: MiddlewareHandler = createMiddleware(async (c, next) => {
  const session = c.get('session');

  if (!session.userId) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));

  if (!user?.isActive) {
    const s = c.get('session');
    delete s.userId;
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  c.set('user', user);
  await next();
});

export function requireRole(minRole: Role): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');

    if (ROLE_LEVEL[user.role as Role] < ROLE_LEVEL[minRole]) {
      return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
    }

    await next();
  });
}
