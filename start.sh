#!/bin/sh
set -e

echo "[start.sh] MQMS container initializing..."

# Ensure required directories exist
mkdir -p /app/data /etc/wireguard

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
  kill "$WORKER_PID" 2>/dev/null || true
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  wait "$WORKER_PID" 2>/dev/null || true
  exit 0
}

trap shutdown TERM INT

# Wait for Next.js server process
wait "$SERVER_PID"
