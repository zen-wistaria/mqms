# ---- Dependencies ----
FROM oven/bun:1-debian AS deps
WORKDIR /app

COPY package.json bun.lock* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN bun install --frozen-lockfile

# ---- Builder ----
FROM oven/bun:1-debian AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_CLIENT_ENGINE_TYPE=library

RUN bunx prisma generate
RUN bun run build
RUN bun build ./src/worker/index.ts \
    --target=node \
    --outfile=./worker.js \
    --external=@prisma/client
RUN bun build ./prisma/seed.ts \
    --target=node \
    --outfile=./seed.js \
    --external=@prisma/client

# ---- Prisma ----
FROM oven/bun:1-debian AS prisma
WORKDIR /app

RUN bun add prisma@7.8.0 @prisma/adapter-libsql@7.8.0 --omit=dev
RUN bun pm cache rm

# ---- Runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_CLIENT_ENGINE_TYPE=library
ENV DATABASE_URL=file:./data/data.db

# Install wireguard-tools, wireguard-go, iptables, iproute2, procps, and sqlite3 for networking/VPN and DB management
RUN apt-get update && apt-get install -y --no-install-recommends \
    wireguard-tools \
    wireguard-go \
    iptables \
    iproute2 \
    procps \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && (update-alternatives --set iptables /usr/sbin/iptables-legacy 2>/dev/null || true) \
    && (update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy 2>/dev/null || true)

# Copy bun binary from builder so bun commands continue to work seamlessly
COPY --from=builder /usr/local/bin/bun /usr/local/bin/bun

# Copy Next.js standalone output and public assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Complete Prisma CLI + all its dependencies (effect, jiti, c12, @prisma, etc.)
COPY --from=prisma /app/node_modules ./node_modules
# Ensure generated Prisma client from builder is preserved
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Symlink prisma CLI to PATH
RUN ln -sf /app/node_modules/.bin/prisma /usr/local/bin/prisma

# Bundled scripts
COPY --from=builder /app/worker.js ./worker.js
COPY --from=builder /app/seed.js ./seed.js

RUN mkdir -p /app/data /etc/wireguard

COPY start.sh .
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

EXPOSE 3000
EXPOSE 51820/udp

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]
