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

## Environment Variables

See `.env.example`. Required:
- `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` (≥32 chars)
- `OIDC_ISSUER`, `CLIENT_ID`, `CLIENT_SECRET` (Authentik)
- `APP_URL` — used for CORS and OIDC redirect URIs

Feature flags: `JACKPOT_ENABLED`, `ROLE_SYNC` (always | on_creation | never), `BALANCE_WARN_THRESHOLD`
