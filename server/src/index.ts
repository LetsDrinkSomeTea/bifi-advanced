import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { sessionMiddleware } from './middleware/session.ts';
import { APP_TZ } from './services/achievements.ts';
import { globalRateLimit } from './middleware/rateLimit.ts';
import { initRedis } from './db/redis.ts';
import { initOIDC } from './services/oidc.ts';
import authRoutes from './routes/auth.ts';
import localAuthRoutes from './routes/auth.local.ts';
import buyablesRoutes from './routes/buyables.ts';
import transactionsRoutes from './routes/transactions.ts';
import favoritesRoutes from './routes/favorites.ts';
import adminRoutes from './routes/admin.ts';
import adminPromotionsRoutes from './routes/admin.promotions.ts';
import usersRoutes from './routes/users.ts';
import friendsRoutes from './routes/friends.ts';
import nudgesRoutes from './routes/nudges.ts';
import prostRoutes from './routes/prost.ts';
import groupsRoutes from './routes/groups.ts';
import notificationsRoutes from './routes/notifications.ts';
import feedRoutes from './routes/feed.ts';
import leaderboardRoutes from './routes/leaderboard.ts';
import achievementsRoutes from './routes/achievements.ts';
import jackpotRoutes from './routes/jackpot.ts';
import statsRoutes from './routes/stats.ts';

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '/api/*',
  cors({
    // In production: only allow the configured APP_URL.
    // In development: reflect any origin so Vite's dev server (port 5173) works.
    origin: (origin): string | null => {
      if (process.env.NODE_ENV !== 'production') return origin;
      return process.env.APP_URL ?? null;
    },
    credentials: true,
  }),
);
app.use('/api/*', globalRateLimit);
app.use('*', sessionMiddleware);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.route('/api/auth', authRoutes);
app.route('/api/auth/local', localAuthRoutes);
app.route('/api/buyables', buyablesRoutes);
app.route('/api/transactions', transactionsRoutes);
app.route('/api/favorites', favoritesRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/admin/promotions', adminPromotionsRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/friends', friendsRoutes);
app.route('/api/nudges', nudgesRoutes);
app.route('/api/prost', prostRoutes);
app.route('/api/groups', groupsRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/feed', feedRoutes);
app.route('/api/leaderboard', leaderboardRoutes);
app.route('/api/achievements', achievementsRoutes);
app.route('/api/jackpot', jackpotRoutes);
app.route('/api/stats', statsRoutes);

app.get('/health', (c): Response => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Translate thrown errors that carry a status/code (e.g. from resolveItems) into proper responses
app.onError((err, c): Response => {
  const e = err as Error & { status?: number; code?: string };
  if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) {
    return c.json(
      { error: e.message, code: e.code },
      e.status as 400 | 403 | 404 | 409 | 422 | 429,
    );
  }
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

// ─── Static files (production) ────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist/client' }));
  // SPA fallback
  app.get('/*', serveStatic({ path: './dist/client/index.html' }));
}

// ─── Startup ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await initRedis();
  await initOIDC();
  console.log(`Starting BiFi with TZ: ${APP_TZ}`);
  const port = parseInt(process.env.PORT ?? '3000');
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main().catch((err: unknown) => {
  console.error('Startup failed:', err);
  process.exit(1);
});

export default app;
