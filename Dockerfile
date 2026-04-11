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

# ─── Stage 4: Prod deps (pruned, kept separate so dev stage isn't affected)                                                                                                                                               
FROM builder AS prod-deps                                 
RUN pnpm prune --prod                                                                                                                                                                                                      

# ─── Stage 5: Production ─────────────────────────────────────────────────                                                                                                                                                
FROM node:24-alpine AS production
RUN apk add --no-cache dumb-init                                                                                                                                                                                           

ENV NODE_ENV=production
WORKDIR /server

COPY --chown=node:node --from=builder   /build/.output            ./.output                                                                                                                                                
COPY --chown=node:node --from=builder   /build/prisma             ./prisma
COPY --chown=node:node --from=builder   /build/prisma.config.ts   ./prisma.config.ts                                                                                                                                       
COPY --chown=node:node --from=builder   /build/package.json       ./package.json                                                                                                                                           
COPY --chown=node:node --from=prod-deps /build/node_modules       ./node_modules                                                                                                                                           

EXPOSE 3000                                                                                                                                                                                                                

USER node

CMD ["dumb-init", "sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node .output/server/index.mjs"]              