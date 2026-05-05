import { createMiddleware } from 'hono/factory';
import type { Context, MiddlewareHandler } from 'hono';
import { redis } from '../db/redis.ts';

const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export function rateLimit(
  limit: number,
  windowSeconds: number,
  keyFn?: (c: Context) => string,
): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = keyFn ? keyFn(c) : `rl:${c.req.path}:${ip}`;

    const currentRaw = await redis.eval(RATE_LIMIT_SCRIPT, {
      keys: [key],
      arguments: [String(windowSeconds)],
    });
    const current = typeof currentRaw === 'number' ? currentRaw : Number(currentRaw);
    if (!Number.isFinite(current)) {
      throw new Error('Rate limit counter returned a non-numeric value');
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
