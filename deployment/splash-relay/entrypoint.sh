#!/bin/sh
# Runs splash-relay plus a tiny internal nginx shim in the same container.
#
# Why: splash-relay speaks libp2p/WebSocket, not plain HTTP, but ONCE
# (https://github.com/basecamp/once) only reverse-proxies HTTP on port 80 and
# health-checks `/up`. nginx (nginx.conf, baked into this image) covers that
# on port 80 -> 127.0.0.1:${RELAY_WS_PORT}. It's inert if this container is
# instead run directly with `docker run -p` for raw P2P peering (see
# deployment/README.md) - nothing has to reach port 80 in that mode.
#
# Config is via env vars (not CLI flags) since ONCE deploys/updates apps by
# image + env vars, not custom commands:
#   RELAY_TCP_PORT (default 11511), RELAY_WS_PORT (default 9090),
#   RELAY_TESTNET (set to "1"/"true" to join splash-testnet),
#   RELAY_MAX_WS_CONNECTIONS, RELAY_KNOWN_PEERS (space-separated multiaddrs)
set -eu

TCP_PORT="${RELAY_TCP_PORT:-11511}"
WS_PORT="${RELAY_WS_PORT:-9090}"

# Point the nginx shim at the actual WS port (nginx.conf.template is static;
# the real config is generated here so the two can never drift apart).
sed "s/__WS_PORT__/$WS_PORT/" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

set -- splash-relay --tcp-port "$TCP_PORT" --ws-port "$WS_PORT"

case "${RELAY_TESTNET:-}" in
  1 | true | TRUE | yes) set -- "$@" --testnet ;;
esac

if [ -n "${RELAY_MAX_WS_CONNECTIONS:-}" ]; then
  set -- "$@" --max-ws-connections "$RELAY_MAX_WS_CONNECTIONS"
fi

for peer in ${RELAY_KNOWN_PEERS:-}; do
  set -- "$@" --known-peer "$peer"
done

"$@" &
RELAY_PID=$!

# If splash-relay exits, bring the container down too (nginx runs as PID 1
# below via `exec`, so `kill 1` here stops the container either way and lets
# Docker/ONCE `restart: unless-stopped` bring it back).
( wait "$RELAY_PID"; echo "splash-relay exited, stopping container" >&2; kill -TERM 1 ) &

exec nginx -g 'daemon off;'
