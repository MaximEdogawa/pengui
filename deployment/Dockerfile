FROM oven/bun:1.2.23 AS builder

EXPOSE 3000

COPY ./ /app
WORKDIR /app

RUN bun install

CMD bun run build && bun run start
