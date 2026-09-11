# Splash WASM is built in a separate image to keep caching independent.
# The image must contain the compiled wasm bundle at `/out`.
ARG SPLASH_WASM_IMAGE=ghcr.io/maximedogawa/pengui:splash-wasm
FROM ${SPLASH_WASM_IMAGE} AS wasm-builder

# Build stage
FROM oven/bun:1.2.23-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .

# Override public/wasm with built WASM (not in repo due to .gitignore)
COPY --from=wasm-builder /out ./public/wasm

# Build arguments for environment variables at build time
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_COMMIT_SHA
ARG NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
ARG NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL
ARG NEXT_PUBLIC_DEXIE_MAINNET_API_URL
ARG NEXT_PUBLIC_DEXIE_TESTNET_API_URL
# TibetSwap v2 API — backs the Swap / Add liquidity / Remove liquidity tab.
# Without these the swap tab falls back to the built-in default; pass them so
# every environment can be pointed at the same (or an alternative) Tibet API.
ARG NEXT_PUBLIC_TIBET_API_URL
ARG NEXT_PUBLIC_TIBET_MAINNET_API_URL
ARG NEXT_PUBLIC_TIBET_TESTNET_API_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL
ARG NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL
ARG NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL
# Feature flags (comma-separated list of enabled features)
ARG NEXT_PUBLIC_FEATURE_FLAGS

# Set environment variables for build
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_COMMIT_SHA=$NEXT_PUBLIC_COMMIT_SHA
ENV NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
ENV NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL=$NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL
ENV NEXT_PUBLIC_DEXIE_MAINNET_API_URL=$NEXT_PUBLIC_DEXIE_MAINNET_API_URL
ENV NEXT_PUBLIC_DEXIE_TESTNET_API_URL=$NEXT_PUBLIC_DEXIE_TESTNET_API_URL
ENV NEXT_PUBLIC_TIBET_API_URL=$NEXT_PUBLIC_TIBET_API_URL
ENV NEXT_PUBLIC_TIBET_MAINNET_API_URL=$NEXT_PUBLIC_TIBET_MAINNET_API_URL
ENV NEXT_PUBLIC_TIBET_TESTNET_API_URL=$NEXT_PUBLIC_TIBET_TESTNET_API_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL=$NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL
ENV NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL=$NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL
ENV NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL=$NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL
ENV NEXT_PUBLIC_FEATURE_FLAGS=$NEXT_PUBLIC_FEATURE_FLAGS

# Sage static snapshot: built first into ./out (its own `next build --output export`
# run), served by src/middleware.ts from the same origin as the hosted app below.
# Must run before the standalone build - both invoke `next build` and would
# otherwise overwrite each other's .next/ artifacts.
RUN bun run build:sage

RUN bun run build

# Production stage - minimal image
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for health checks; libcap so non-root `node` can bind port 80
RUN apk add --no-cache curl libcap

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Allow the non-root user to bind port 80 (privileged port) without running as root.
# /usr/local/bin/node is the fixed install path in the official node:*-alpine images.
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

# Set production environment
# PORT=80 because ONCE (https://github.com/basecamp/once) requires apps to
# serve HTTP on port 80; it terminates TLS and reverse-proxies to this port.
ENV NODE_ENV=production
ENV PORT=80
ENV HOSTNAME="0.0.0.0"

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Sage static snapshot, read by src/middleware.ts at request time (not part of
# Next's own module graph, so it must be copied explicitly - see the ARG/ENV
# and comment above the `RUN bun run build:sage` step in the builder stage).
COPY --from=builder --chown=nextjs:nodejs /app/out ./sage-snapshot

# Switch to non-root user
USER nextjs

EXPOSE 80

# Health check using curl (ONCE also polls /up itself before routing traffic)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:80/up || exit 1

# Start the server
CMD ["node", "server.js"]
