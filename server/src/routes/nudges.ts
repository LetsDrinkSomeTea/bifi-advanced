import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { redis } from '../db/redis.ts';
import { nudges, users } from '../db/schema.ts';
import { emitFeedEvent } from '../services/feed.ts';
import { requireAuth } from '../middleware/auth.ts';
import { nudgeRateLimit } from '../middleware/rateLimit.ts';
import { createNotification } from '../services/notifications.ts';
import { writeAuditLog } from '../services/audit.ts';
import { getClientIp } from '../lib/ip.ts';

const router = new Hono();

const PRESETS: Record<string, string> = {
  bring: 'Bring mir eins mit! 🍺',
  thirsty: 'Hast du Durst? 🤔',
  cheers: 'Prost! 🥂',
  hurry: 'Beeil dich! ⚡',
};

const NudgeSchema = z
  .object({
    preset: z.enum(['bring', 'thirsty', 'cheers', 'hurry']).optional(),
    message: z.string().min(1).max(200).optional(),
  })
  .refine((d) => d.preset ?? d.message, { message: 'preset or message required' });

// ─── POST /api/nudges/:recipientId ────────────────────────────────────────────

router.post(
  '/:recipientId',
  requireAuth,
  nudgeRateLimit,
  zValidator('json', NudgeSchema),
  async (c) => {
    const sender = c.get('user');
    const { recipientId } = c.req.param();
    const body = c.req.valid('json');

    if (recipientId === sender.id) {
      return c.json({ error: 'Cannot nudge yourself', code: 'SELF_NUDGE' }, 400);
    }

    const [recipient] = await db
      .select({ id: users.id, displayName: users.displayName, isActive: users.isActive })
      .from(users)
      .where(and(eq(users.id, recipientId), eq(users.isActive, true)));

    if (!recipient) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);

    // Rate limit: 1 nudge per sender→recipient per 10 minutes
    const cdKey = `nudge:cd:${sender.id}:${recipientId}`;
    const exists = await redis.exists(cdKey);
    if (exists) {
      const ttl = await redis.ttl(cdKey);
      return c.json(
        { error: 'Cooldown active', code: 'RATE_LIMITED', retryAfterSeconds: ttl },
        429,
      );
    }

    const presetMessage = body.preset ? PRESETS[body.preset] : null;
    const message = presetMessage ?? body.message;

    if (!message) {
      return c.json({ error: 'Message required', code: 'BAD_REQUEST' }, 400);
    }

    const isPublic = !!body.preset;

    // Store nudge
    const [nudge] = await db
      .insert(nudges)
      .values({
        senderId: sender.id,
        recipientId,
        type: 'nudge',
        message,
        isPublic,
      })
      .returning();

    if (!nudge) {
      throw new Error('Failed to create nudge');
    }

    // Set cooldown (10 minutes)
    await redis.setEx(cdKey, 600, '1');

    // Private notification to recipient
    createNotification({
      userId: recipientId,
      type: 'nudge',
      title: `Stupser von ${sender.displayName}`,
      message,
      relatedId: nudge.id,
    }).catch(console.error);

    if (isPublic) {
      emitFeedEvent({
        type: 'nudge',
        userId: sender.id,
        targetUserId: recipientId,
        metadata: { message },
      });
    }

    await writeAuditLog({
      actorId: sender.id,
      action: 'nudge.sent',
      resourceType: 'user',
      resourceId: recipientId,
      resourceName: `${sender.displayName} ➔ ${recipient.displayName}`,
      severity: 'info',
      ipAddress: getClientIp(c),
    });

    return c.json({ ok: true, message, isPublic }, 201);
  },
);

// ─── GET /api/nudges/presets ──────────────────────────────────────────────────

router.get('/presets', requireAuth, (c) => {
  return c.json(Object.entries(PRESETS).map(([key, text]) => ({ key, text })));
});

export default router;
