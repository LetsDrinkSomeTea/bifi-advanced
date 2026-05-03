import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { notifications } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { addSSEClient, removeSSEClient } from '../services/notifications.ts';

const router = new Hono();

// ─── GET /api/notifications ───────────────────────────────────────────────────

router.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  return c.json(rows);
});

// ─── POST /api/notifications/read-all ────────────────────────────────────────

router.post('/read-all', requireAuth, async (c) => {
  const user = c.get('user');
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  return c.json({ success: true });
});

// ─── POST /api/notifications/:id/read ────────────────────────────────────────

router.post('/:id/read', requireAuth, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  return c.json({ success: true });
});

// ─── GET /api/notifications/count ────────────────────────────────────────────

router.get('/count', requireAuth, async (c) => {
  const user = c.get('user');
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  return c.json({ count: row?.count ?? 0 });
});

// ─── GET /api/notifications/stream (SSE) ─────────────────────────────────────

router.get('/stream', requireAuth, (c) => {
  const user = c.get('user');

  return streamSSE(c, async (stream) => {
    const writer = async (event: string, data: unknown): Promise<void> => {
      await stream.writeSSE({ event, data: JSON.stringify(data) });
    };

    addSSEClient(user.id, writer);

    try {
      // Send current unread count on connect
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({ unreadCount: row?.count ?? 0 }),
      });

      // Keep-alive pings every 30 s
      for (;;) {
        await stream.sleep(30_000);
        await stream.writeSSE({ event: 'ping', data: '{}' });
      }
    } finally {
      removeSSEClient(user.id, writer);
    }
  });
});

export default router;
