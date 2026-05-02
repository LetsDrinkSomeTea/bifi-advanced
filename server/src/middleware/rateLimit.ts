import { createMiddleware } from 'hono/factory';
import type { Context, MiddlewareHandler } from 'hono';
import { redis } from '../db/redis.ts';

export function rateLimit(
  limit: number,
  windowSeconds: number,
  keyFn?: (c: Context) => string,
): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = keyFn ? keyFn(c) : `rl:${c.req.path}:${ip}`;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (current > limit) {
      return c.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, 429);
    }

    return next();
  });
}

// Pre-configured limiters per spec §11
export const purchaseRateLimit = rateLimit(20, 60);
export const nudgeRateLimit = rateLimit(6, 3600);
export const globalRateLimit = rateLimit(100, 60);
