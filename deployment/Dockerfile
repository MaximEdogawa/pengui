# Build stage
FROM oven/bun:1.2.23 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Static export (if using Next.js static export)
RUN bun run export || echo "Skipping export"

# Data-only stage - absolutely minimal
FROM scratch
COPY --from=builder /app/.next/static /app/.next/static
COPY --from=builder /app/public /app/public