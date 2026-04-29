import { createMiddleware } from 'hono/factory'
import { getCookie, setCookie } from 'hono/cookie'
import { randomUUID } from 'crypto'
import { redis } from '../db/redis.ts'

const COOKIE_NAME = 'bifi_session'
const SESSION_TTL = 8 * 60 * 60 // 8 hours in seconds

export interface SessionData {
  userId?: string
  oidcState?: string
  pkceVerifier?: string
  oidcRedirectUri?: string
}

declare module 'hono' {
  interface ContextVariableMap {
    sessionId: string
    session: SessionData
  }
}

export const sessionMiddleware = createMiddleware(async (c, next) => {
  let sessionId = getCookie(c, COOKIE_NAME)

  if (!sessionId) {
    sessionId = randomUUID()
  }

  const raw = await redis.get(`session:${sessionId}`)
  const session: SessionData = raw ? (JSON.parse(raw) as SessionData) : {}

  c.set('sessionId', sessionId)
  c.set('session', session)

  await next()

  const isProduction = process.env.NODE_ENV === 'production'
  setCookie(c, COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax',
    maxAge: SESSION_TTL,
    path: '/',
  })

  const updatedSession = c.get('session')
  if (updatedSession && Object.keys(updatedSession).length > 0) {
    await redis.setEx(`session:${sessionId}`, SESSION_TTL, JSON.stringify(updatedSession))
  } else {
    await redis.del(`session:${sessionId}`)
  }
})

export async function linkSessionToUser(sessionId: string, userId: string) {
  await redis.sAdd(`user:sessions:${userId}`, sessionId)
  await redis.expire(`user:sessions:${userId}`, SESSION_TTL)
}

export async function invalidateSession(sessionId: string) {
  await redis.del(`session:${sessionId}`)
}

export async function invalidateUserSessions(userId: string) {
  const sessionIds = await redis.sMembers(`user:sessions:${userId}`)
  if (sessionIds.length > 0) {
    await Promise.all(sessionIds.map((id) => redis.del(`session:${id}`)))
  }
  await redis.del(`user:sessions:${userId}`)
}
