# ─── Stage 1: Base ────────────────────────────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /build

RUN npm install -g pnpm

# ─── Stage 2: Install & Build ─────────────────────────────────────────────
FROM base AS builder

RUN apk update && apk upgrade

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate && pnpm build

# ─── Stage 3: Development (used by docker compose watch) ──────────────────
FROM base AS development
WORKDIR /src

COPY --from=builder /build ./

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ─── Stage 4: Production ─────────────────────────────────────────────────
# Nitro produces a self-contained bundle — no node_modules required.
FROM node:24-alpine AS production
WORKDIR /server

COPY --from=builder /build/.output ./.output

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]
