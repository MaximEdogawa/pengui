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

RUN apt-get update && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/splash-relay /usr/local/bin/splash-relay

# The relay serves both the `/up` health check and browser WebSocket traffic on
# this one port, so it satisfies ONCE's app contract directly - no proxy or
# entrypoint script in the image. ONCE routes its hostname to port 80.
ENV RELAY_WS_PORT=80

# Inbound P2P peering is off by default: ONCE's proxy handles HTTP/TLS only and
# can't publish a raw TCP port, and the relay still dials out to Splash
# bootstrap peers without a listener. Override to run a full peering node.
ENV RELAY_TCP_PORT=0

EXPOSE 80

# Every setting is env-var driven (RELAY_WS_PORT, RELAY_TCP_PORT, RELAY_TESTNET,
# RELAY_MAX_WS_CONNECTIONS, RELAY_KNOWN_PEERS), which is how ONCE configures an
# app: `once deploy --env KEY=VALUE`.
ENTRYPOINT ["splash-relay"]
