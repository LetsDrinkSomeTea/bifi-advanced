import { isIP } from 'node:net';
import type { Context } from 'hono';

function parseForwardedFor(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split(',').map((part) => part.trim());
  for (const part of parts) {
    if (isIP(part)) return part;
  }
  return null;
}

export function getClientIp(c: Context): string | null {
  if (process.env.TRUST_PROXY !== 'true') {
    return null;
  }

  const forwarded = parseForwardedFor(c.req.header('x-forwarded-for'));
  if (forwarded) return forwarded;

  const realIp = c.req.header('x-real-ip')?.trim();
  if (realIp && isIP(realIp)) return realIp;

  return null;
}
