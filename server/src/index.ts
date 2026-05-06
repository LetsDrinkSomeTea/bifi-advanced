import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import { sessionMiddleware } from './middleware/session.ts';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { mkdir } from 'node:fs/promises';
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
import uploadRoutes, { getUploadDir } from './routes/upload.ts';

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use('*', logger());
app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
    },
  }),
);
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
app.route('/api/upload', uploadRoutes);

// ─── Serve uploaded files ─────────────────────────────────────────────────────

app.get('/api/uploads/:filename', async (c) => {
  const filename = c.req.param('filename');
  if (!filename || filename.includes('/') || filename.includes('..') || extname(filename) !== '.webp') {
    return c.json({ error: 'Not found' }, 404);
  }
  try {
    const data = await readFile(join(getUploadDir(), filename));
    return new Response(data, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});

app.get('/health', (c): Response => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Translate thrown errors that carry a status/code (e.g. from resolveItems) into proper responses
app.onError((err, c): Response => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  const errWithMeta = err as Error & { status?: number; code?: string };
  const status = errWithMeta.status;
  const code = errWithMeta.code;

  if (status !== undefined && status >= 400 && status < 500) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Request failed', code },
      status as 400 | 403 | 404 | 409 | 422 | 429,
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
  await mkdir(getUploadDir(), { recursive: true });
  await initRedis();
  await initOIDC();
  if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY !== 'true') {
    console.warn(
      '[WARN] TRUST_PROXY is not set to "true". IP-based rate limiting will share a single bucket ' +
      'across all clients. Set TRUST_PROXY=true when running behind a reverse proxy.',
    );
  }
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
