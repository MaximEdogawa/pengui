FROM oven/bun:1.2.23 AS builder

EXPOSE 3000

COPY ./ /app
WORKDIR /app

RUN bun install

# Create app user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser


HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD bun run build && bun run start
