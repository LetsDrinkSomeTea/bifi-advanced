# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

All tooling runs inside a Docker dev container. Do **not** run `node_modules/.bin/*` or `npx` commands directly on the host.

```bash
make dev        # Build and start full dev stack (app + postgres + redis)
make up         # Start in background
make down       # Stop all services
make shell      # Open shell inside the app container
make logs       # Tail all logs
make logs-app   # App logs only
```

## Common Commands (run inside the container via `make shell`)

```bash
npm run dev          # Start server + client concurrently (tsx watch + vite)
npm run test         # Run tests (vitest)
npm run build        # Production build (vite → dist/client)
```

## Database Migrations

Use `make` targets, not `npx drizzle-kit` directly:

```bash
make db-setup   # Generate migrations from schema.ts + apply them (inside container)
make migrate    # Apply pending migrations only
```

Schema lives in `server/src/db/schema.ts`. After editing the schema, always run `make db-setup`.

## Architecture

**Monorepo layout:**

- `server/` — Hono API server (Node 22, TypeScript)
- `client/` — React 18 SPA (Vite, Wouter, TanStack Query, Tailwind)
- `shared/` — Shared types (`types.ts`), Zod schemas (`schemas.ts`), achievement definitions (`achievements.ts`)

**Request lifecycle:**

1. Hono middleware: rate limiting → session (Redis-backed cookies) → auth enforcement
2. Route handlers in `server/src/routes/` call DB via Drizzle ORM
3. Side effects (notifications, audit log, activity feed, achievements) go through `server/src/services/`
4. Client fetches via `client/src/lib/api.ts`, cached with TanStack Query

**Authentication:**

- Primary: OIDC via Authentik (`server/src/services/oidc.ts`)
- Optional: local email/password (`server/src/routes/auth.local.ts`, Argon2 hashing)
- Sessions stored in Redis; roles (admin/moderator/member) can sync from OIDC groups claim

**Database (PostgreSQL + Drizzle ORM):**
Key tables: `users`, `buyables`, `productVariants`, `transactions`, `transactionItems`, `groups`, `groupMembers`, `userFriendships`, `nudges`, `prostVouchers`, `userAchievements`, `notifications`, `activityFeed`, `auditLogs`, `promotions`, `donationGoals`

**Frontend routing:** Wouter (lightweight, no React Router). Pages in `client/src/pages/`, shared layout in `client/src/components/layout/`. Bottom nav for mobile-first UX.

**Achievement system:** Registry-based in `server/src/services/achievements/`. Definitions shared via `shared/src/achievements.ts`.

**API docs:** Auto-generated OpenAPI spec available at `/api/openapi.json`; Swagger UI at `/docs`.

## Conventions & Decisions

**TanStack Query invalidation:**

- User balance is part of the `['auth', 'me']` query (not a separate `['balance']` key). Always invalidate `['auth', 'me']` after mutations that affect the balance (purchases, jackpot spins, etc.). Match the pattern in `usePurchase` in `hooks/useTransactions.ts`.
- For delayed effects (e.g. after an animation), trigger invalidation in the `setTimeout` callback rather than in the mutation's `onSuccess`.

**New server routes:**

- Register in `server/src/index.ts` via `app.route('/api/<name>', ...)`
- Always check both `JACKPOT_ENABLED` env flag (global) and `user.jackpotAllowed` (per-user) for jackpot-gated endpoints.

**Adding a new feed event type:**

1. Add the union member to `FeedEvent` in `server/src/services/feed.ts`
2. Call `emitFeedEvent(...)` from the route/service
3. Add a `case` to `feedText()` in `client/src/components/FeedItem.tsx`
4. Add an entry to `TYPE_EMOJI` in the same file

**Adding a new achievement:**

1. Add the event type to `AchievementEvent` in `shared/src/achievements.ts`
2. Add registry entries in `server/src/services/achievements/registry.ts`
3. Call `checkAchievements({ type, userId, ... })` from the relevant route (fire-and-forget with `.catch(console.error)`)

**Jackpot wheel (client):**

- `MULTIPLIERS` array on the client defines segment _order_ on the wheel (alternating low/high). The server picks randomly from its own pool of the same 20 values.
- Rotation formula: `targetMod = (360 - segmentCenterDeg) % 360` — clockwise rotation θ brings the segment originally at `(360 - θ) % 360` to the top pointer.
- Balance invalidation happens _after_ the animation (`setTimeout` 4200 ms), not on `onSuccess`.

## Environment Variables

See `.env.example`. Required:

- `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` (≥32 chars)
- `OIDC_ISSUER`, `CLIENT_ID`, `CLIENT_SECRET` (Authentik)
- `APP_URL` — used for CORS and OIDC redirect URIs

Feature flags: `JACKPOT_ENABLED`, `ROLE_SYNC` (always | on_creation | never), `BALANCE_WARN_THRESHOLD`
