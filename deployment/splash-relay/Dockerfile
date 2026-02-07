# Build splash-relay (libp2p Splash network relay)
FROM rust:1-bookworm AS builder
WORKDIR /app
COPY crates/splash-relay /app
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/splash-relay /usr/local/bin/
EXPOSE 11511 9090
# TCP 11511 = Splash network, 9090 = WebSocket for browsers
ENTRYPOINT ["splash-relay"]
CMD ["--tcp-port", "11511", "--ws-port", "9090"]
