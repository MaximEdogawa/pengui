# Build stage
FROM oven/bun:1.2.23 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Minimal data container
FROM busybox:latest
WORKDIR /app
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Add metadata and volume declaration
LABEL maintainer="pengui-data"
VOLUME ["/app"]

CMD ["sh"]