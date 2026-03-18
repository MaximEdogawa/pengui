# syntax=docker/dockerfile:1.7
#
# splash-relay build compiles the relay binary inside Docker and validates it
# at build time to prevent publishing broken/no-op relay images.
#

FROM rust:1-bookworm AS builder
WORKDIR /app

COPY crates/splash-relay/Cargo.toml crates/splash-relay/Cargo.lock ./

RUN cargo fetch --locked

COPY crates/splash-relay/src ./src
RUN cargo build --locked --release

# Sanity check: ensure the binary is really our clap-based relay.
RUN /app/target/release/splash-relay --help 2>&1 | grep -q "Maximum concurrent WebSocket"

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates netcat-openbsd && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/splash-relay /usr/local/bin/splash-relay

EXPOSE 11511 9090

# TCP 11511 = Splash network, 9090 = WebSocket for browsers
ENTRYPOINT ["splash-relay"]
CMD ["--tcp-port", "11511", "--ws-port", "9090"]
