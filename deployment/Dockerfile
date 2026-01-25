FROM oven/bun:1.2.23 AS builder

EXPOSE 3000

COPY ./ /app

RUN bun install
RUN bun run build

CMD ["bun", "run", "start"]
