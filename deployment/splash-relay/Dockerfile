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

RUN apt-get update && apt-get install -y ca-certificates netcat-openbsd nginx-light \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/splash-relay /usr/local/bin/splash-relay
COPY deployment/splash-relay/nginx.conf.template /etc/nginx/nginx.conf.template
COPY deployment/splash-relay/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 80    = HTTP shim for ONCE (https://github.com/basecamp/once): /up health
#         check + WebSocket proxy to 127.0.0.1:9090 (see nginx.conf)
# 9090  = WebSocket for browsers (used directly when not run under ONCE)
# 11511 = Splash network TCP (P2P peering; publish with `docker run -p` for
#         the manual side-channel container - see deployment/README.md)
EXPOSE 80 9090 11511

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
