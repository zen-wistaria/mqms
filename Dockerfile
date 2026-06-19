# ---- Dependencies ----
FROM oven/bun:alpine AS deps
WORKDIR /app

COPY package.json bun.lock* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN bun install --frozen-lockfile

# ---- Builder ----
FROM oven/bun:alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_CLIENT_ENGINE_TYPE=library

RUN bunx prisma generate
RUN bun run build
RUN bun build ./src/worker/index.ts \
    --target=bun \
    --outfile=./worker.js \
    --external=@prisma/client
RUN bun build ./prisma/seed.ts \
    --target=bun \
    --outfile=./seed.js \
    --external=@prisma/client \
    --external=bcrypt-ts

# ---- Prisma ----
FROM oven/bun:alpine AS prisma
WORKDIR /app

RUN bun add prisma@7.8.0 @prisma/adapter-libsql@7.8.0 --omit=dev
RUN bun pm cache rm

# ---- Runner ----
FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_CLIENT_ENGINE_TYPE=library
ENV DATABASE_URL=file:./data/data.db

# Install wireguard-tools for VPN feature
RUN apk add --no-cache wireguard-tools

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Minimal Prisma
COPY --from=prisma /app/node_modules ./node_modules

# Bundled scripts
COPY --from=builder /app/worker.js ./worker.js
COPY --from=builder /app/seed.js ./seed.js

RUN mkdir -p /app/data /etc/wireguard

EXPOSE 3000
EXPOSE 51820/udp

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]
