# syntax=docker/dockerfile:1.7
#
# Build stage for pengui.
# Splash WASM bundle is downloaded from the GitHub Release for RELEASE_TAG
# and baked into ./public/wasm before `bun run build`.
#
FROM oven/bun:1.2.23-alpine AS builder
WORKDIR /app

ARG RELEASE_TAG
ARG GITHUB_REPOSITORY

# Tools needed for fetching + extracting WASM bundle.
RUN apk add --no-cache curl tar

# Install dependencies first (better caching)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Download splash-wasm bundle from GitHub Release and bake it into public/wasm.
RUN --mount=type=secret,id=GITHUB_TOKEN,required=false \
  set -eu; \
  TAG="${RELEASE_TAG}"; \
  REPO="${GITHUB_REPOSITORY}"; \
  URL="https://github.com/${REPO}/releases/download/${TAG}/splash-wasm-${TAG}.tar.gz"; \
  token="$(cat /run/secrets/GITHUB_TOKEN 2>/dev/null || true)"; \
  mkdir -p ./public/wasm; \
  if [ -n "$token" ]; then \
    curl -fsSL -L -H "Authorization: Bearer $token" "$URL" -o /tmp/splash-wasm.tar.gz; \
  else \
    curl -fsSL -L "$URL" -o /tmp/splash-wasm.tar.gz; \
  fi; \
  tar -xzf /tmp/splash-wasm.tar.gz -C ./public/wasm; \
  test -f ./public/wasm/splash_wasm.js; \
  test -f ./public/wasm/splash_wasm_bg.wasm

# Build arguments for environment variables at build time
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
ARG NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL
ARG NEXT_PUBLIC_DEXIE_MAINNET_API_URL
ARG NEXT_PUBLIC_DEXIE_TESTNET_API_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL
ARG NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL
ARG NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL

# Set environment variables for build
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
ENV NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL=$NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL
ENV NEXT_PUBLIC_DEXIE_MAINNET_API_URL=$NEXT_PUBLIC_DEXIE_MAINNET_API_URL
ENV NEXT_PUBLIC_DEXIE_TESTNET_API_URL=$NEXT_PUBLIC_DEXIE_TESTNET_API_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL=$NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL
ENV NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL=$NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL
ENV NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL=$NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL

RUN bun run build

# Production stage - minimal image
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "server.js"]
