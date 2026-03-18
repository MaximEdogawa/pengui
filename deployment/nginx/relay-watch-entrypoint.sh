#!/bin/sh
# When RELAY_WATCHDOG=1 (default): nginx exits if splash-relay stops accepting TCP.
# When RELAY_WATCHDOG=0: stock nginx only (e.g. first deploy / ACME before relay is up).
set -eu
RELAY_HOST="${RELAY_UPSTREAM_HOST:-splash-relay}"
RELAY_PORT="${RELAY_UPSTREAM_PORT:-9090}"
CHECK_INTERVAL="${RELAY_HEALTH_CHECK_INTERVAL:-8}"

if [ "${RELAY_WATCHDOG:-1}" = "0" ]; then
  exec /docker-entrypoint.sh nginx -g "daemon off;"
fi

/docker-entrypoint.sh nginx -g "daemon off;" &
NGINX_PID=$!

# Wait until relay answers (depends_on healthy should already guarantee this)
i=0
while [ "$i" -lt 90 ]; do
  if nc -z -w 2 "$RELAY_HOST" "$RELAY_PORT" 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 1
done
if ! nc -z -w 2 "$RELAY_HOST" "$RELAY_PORT" 2>/dev/null; then
  kill -TERM "$NGINX_PID" 2>/dev/null || true
  wait "$NGINX_PID" 2>/dev/null || true
  exit 1
fi

while sleep "$CHECK_INTERVAL"; do
  if ! nc -z -w 3 "$RELAY_HOST" "$RELAY_PORT" 2>/dev/null; then
    kill -TERM "$NGINX_PID" 2>/dev/null || true
    wait "$NGINX_PID" 2>/dev/null || true
    exit 1
  fi
done
