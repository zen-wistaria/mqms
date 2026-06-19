#!/bin/sh
set -e

# Start worker as background process
bun worker.js &
WORKER_PID=$!

# Handle graceful shutdown
trap "kill $WORKER_PID 2>/dev/null; exit 0" SIGTERM SIGINT

# Run Next.js (foreground — keeps container alive)
exec bun server.js
