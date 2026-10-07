#!/bin/sh
set -e

echo "[start.sh] MQMS container initializing..."

# Ensure required directories exist
mkdir -p /app/data/wireguard /etc/wireguard

# Ensure TUN device exists for WireGuard userspace fallback
mkdir -p /dev/net
if [ ! -c /dev/net/tun ]; then
  mknod /dev/net/tun c 10 200 2>/dev/null || true
  chmod 600 /dev/net/tun 2>/dev/null || true
fi

# Pre-enable WAL mode on SQLite if file exists
if command -v sqlite3 >/dev/null 2>&1 && [ -f /app/data/data.db ]; then
  sqlite3 /app/data/data.db "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 10000;" 2>/dev/null || true
fi

# Apply database migrations before starting application processes (zero lock conflict)
echo "[start.sh] Running database migrations..."
if command -v prisma >/dev/null 2>&1; then
  prisma migrate deploy || true
elif [ -f /app/node_modules/.bin/prisma ]; then
  /app/node_modules/.bin/prisma migrate deploy || true
fi

# Ensure WAL mode is active on database
if command -v sqlite3 >/dev/null 2>&1 && [ -f /app/data/data.db ]; then
  sqlite3 /app/data/data.db "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 10000;" 2>/dev/null || true
fi

# Restore and auto-start WireGuard if configured
if [ -f /app/data/wireguard/wg0.conf ] && [ ! -f /etc/wireguard/wg0.conf ]; then
  cp -f /app/data/wireguard/wg0.conf /etc/wireguard/wg0.conf 2>/dev/null || true
fi
if [ -f /etc/wireguard/wg0.conf ]; then
  echo "[start.sh] Restoring WireGuard interface..."
  wg-quick up wg0 2>/dev/null || true
fi

# Supervisor loop to keep background worker alive
run_worker() {
  while true; do
    echo "[Supervisor] Starting background worker..."
    if command -v node >/dev/null 2>&1; then
      node worker.js || true
    else
      bun worker.js || true
    fi
    echo "[Supervisor] Worker exited with code $?. Restarting in 5s..."
    sleep 5
  done
}

# Start worker supervisor in background
run_worker &
WORKER_PID=$!

# Start Next.js server in background
echo "[start.sh] Starting Next.js web application..."
if command -v node >/dev/null 2>&1; then
  node server.js &
else
  bun server.js &
fi
SERVER_PID=$!

# Handle graceful shutdown (POSIX signal names without SIG prefix)
shutdown() {
  echo "[start.sh] Received shutdown signal. Stopping services..."
  wg-quick down wg0 2>/dev/null || true
  kill "$WORKER_PID" 2>/dev/null || true
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  wait "$WORKER_PID" 2>/dev/null || true
  exit 0
}

trap shutdown TERM INT

# Wait for Next.js server process
wait "$SERVER_PID"
