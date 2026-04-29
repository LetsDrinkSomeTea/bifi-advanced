import { createMiddleware } from 'hono/factory'
import { db } from '../db/index.ts'
import { users } from '../db/schema.ts'
import { eq } from 'drizzle-orm'

export type Role = 'admin' | 'moderator' | 'member'

const ROLE_LEVEL: Record<Role, number> = {
  member: 0,
  moderator: 1,
  admin: 2,
}

declare module 'hono' {
  interface ContextVariableMap {
    user: typeof users.$inferSelect
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const session = c.get('session')

  if (!session.userId) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId))

  if (!user || !user.isActive) {
    const s = c.get('session')
    delete s.userId
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }

  c.set('user', user)
  return next()
})

export function requireRole(minRole: Role) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }

    if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) {
      return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)
    }

    return next()
  })
}
