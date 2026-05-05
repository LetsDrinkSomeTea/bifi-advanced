import { type MiddlewareHandler, type Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie } from 'hono/cookie';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { redis } from '../db/redis.ts';

const COOKIE_NAME = 'bifi_session';
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

const SessionSchema = z
  .object({
    userId: z.string().uuid().optional(),
    oidcState: z.string().optional(),
    pkceVerifier: z.string().optional(),
    oidcRedirectUri: z.string().optional(),
  })
  .strict();

export interface SessionData {
  userId?: string;
  oidcState?: string;
  pkceVerifier?: string;
  oidcRedirectUri?: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    sessionId: string;
    session: SessionData;
  }
}

export const sessionMiddleware: MiddlewareHandler = createMiddleware(async (c, next) => {
  let sessionId = getCookie(c, COOKIE_NAME);
  sessionId ??= randomUUID();

  const raw = await redis.get(`session:${sessionId}`);
  let session: SessionData = {};
  if (raw !== null) {
    try {
      const parsed = SessionSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        session = parsed.data;
      } else {
        console.warn(`Invalid session payload for ${sessionId}, dropping session`);
        await redis.del(`session:${sessionId}`);
      }
    } catch {
      console.warn(`Broken session JSON for ${sessionId}, dropping session`);
      await redis.del(`session:${sessionId}`);
    }
  }

  c.set('sessionId', sessionId);
  c.set('session', session);

  await next();

  const isProduction = process.env.NODE_ENV === 'production';
  setCookie(c, COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax',
    maxAge: SESSION_TTL,
    path: '/',
  });

  const parsedUpdated = SessionSchema.safeParse(c.get('session'));
  if (!parsedUpdated.success) {
    throw new Error('Attempted to persist invalid session data');
  }
  const updatedSession = parsedUpdated.data;
  if (Object.keys(updatedSession).length > 0) {
    await redis.setEx(`session:${sessionId}`, SESSION_TTL, JSON.stringify(updatedSession));
  } else {
    await redis.del(`session:${sessionId}`);
  }
});

export async function linkSessionToUser(sessionId: string, userId: string): Promise<void> {
  await redis.sAdd(`user:sessions:${userId}`, sessionId);
  await redis.expire(`user:sessions:${userId}`, SESSION_TTL);
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  const sessionIds = await redis.sMembers(`user:sessions:${userId}`);
  if (sessionIds.length > 0) {
    await Promise.all(sessionIds.map((id) => redis.del(`session:${id}`)));
  }
  await redis.del(`user:sessions:${userId}`);
}

export async function regenerateSession(c: Context): Promise<SessionData> {
  const oldId = c.get('sessionId');
  await redis.del(`session:${oldId}`);
  const newId = randomUUID();
  c.set('sessionId', newId);
  const fresh: SessionData = {};
  c.set('session', fresh);
  return fresh;
}
