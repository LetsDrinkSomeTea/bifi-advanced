import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { notifications, userAchievements, users } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { createNotification } from '../services/notifications.ts';
import { ACHIEVEMENT_REGISTRY } from '../services/achievements/registry.ts';

const router = new Hono();

// ─── POST /api/dev/achievements/unlock-all ────────────────────────────────────

router.post('/achievements/unlock-all', requireAuth, async (c) => {
  const user = c.get('user');
  const now = new Date();
  const rows = ACHIEVEMENT_REGISTRY.map((def) => ({
    userId: user.id,
    achievementKey: def.key,
    unlockedAt: now,
  }));
  await db.insert(userAchievements).values(rows).onConflictDoNothing();
  return c.json({ unlocked: rows.length });
});

// ─── POST /api/dev/achievements/clear ────────────────────────────────────────

router.post('/achievements/clear', requireAuth, async (c) => {
  const user = c.get('user');
  await db.delete(userAchievements).where(eq(userAchievements.userId, user.id));
  return c.json({ success: true });
});

// ─── POST /api/dev/notifications/seed ────────────────────────────────────────

router.post('/notifications/seed', requireAuth, async (c) => {
  const user = c.get('user');
  await Promise.all([
    createNotification({
      userId: user.id,
      type: 'achievement',
      title: '[DEV] Achievement freigeschaltet',
      message: 'Du hast "Erstkäufer" freigeschaltet.',
    }),
    createNotification({
      userId: user.id,
      type: 'deposit',
      title: '[DEV] Guthaben aufgeladen',
      message: '+20,00 € wurden auf dein Konto gebucht.',
    }),
    createNotification({
      userId: user.id,
      type: 'balance_warning',
      title: '[DEV] Guthaben niedrig',
      message: 'Dein Guthaben ist unter die Warnschwelle gefallen.',
    }),
    createNotification({
      userId: user.id,
      type: 'friend_request',
      title: '[DEV] Freundschaftsanfrage',
      message: 'Max Mustermann möchte dein Freund sein.',
    }),
    createNotification({
      userId: user.id,
      type: 'prost',
      title: '[DEV] Prost-Gutschein erhalten',
      message: 'Du hast einen Gutschein von Anna bekommen.',
    }),
    createNotification({
      userId: user.id,
      type: 'nudge',
      title: '[DEV] Nudge',
      message: 'Jemand hat dich angestupst.',
    }),
    createNotification({
      userId: user.id,
      type: 'system',
      title: '[DEV] Systemnachricht',
      message: 'Das ist eine Systemnachricht.',
    }),
  ]);
  return c.json({ seeded: 7 });
});

// ─── POST /api/dev/notifications/clear ───────────────────────────────────────

router.post('/notifications/clear', requireAuth, async (c) => {
  const user = c.get('user');
  await db.delete(notifications).where(eq(notifications.userId, user.id));
  return c.json({ success: true });
});

// ─── POST /api/dev/balance ────────────────────────────────────────────────────

router.post('/balance', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ cents: number }>();
  const cents = body.cents;
  if (!Number.isInteger(cents)) return c.json({ error: 'cents must be integer' }, 400);
  await db.update(users).set({ balance: cents }).where(eq(users.id, user.id));
  return c.json({ balance: cents });
});

export default router;
