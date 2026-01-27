# Build stage
FROM oven/bun:1.2.23 AS builder

COPY . /app
WORKDIR /app

RUN bun install
RUN bun run build

# Data-only stage - just the dist files
FROM scratch AS dist

# Copy only the dist folder
COPY --from=builder /app/dist /dist