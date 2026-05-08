# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:25-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY client ./client
COPY server ./server
COPY shared ./shared
COPY tsconfig.json vite.config.ts postcss.config.js tailwind.config.ts ./

RUN npm run build && npm prune --omit=dev

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:25-alpine AS runtime

RUN addgroup -S bifi && adduser -S bifi -G bifi

WORKDIR /app

COPY --from=builder --chown=bifi:bifi /app/dist         ./dist
COPY --from=builder --chown=bifi:bifi /app/node_modules ./node_modules
COPY --from=builder --chown=bifi:bifi /app/server       ./server
COPY --from=builder --chown=bifi:bifi /app/shared       ./shared
COPY --from=builder --chown=bifi:bifi /app/package.json ./package.json
COPY --from=builder --chown=bifi:bifi /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /app/uploads && chown bifi:bifi /app/uploads

USER bifi

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
