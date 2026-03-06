# Build splash-relay (libp2p Splash network relay)
# Layer order: deps cached first so we only rebuild the binary when source changes
FROM rust:1-bookworm AS builder
WORKDIR /app

# Copy manifest and lockfile first for better layer caching
COPY crates/splash-relay/Cargo.toml crates/splash-relay/Cargo.lock ./

# Dummy source so we can build and cache dependencies without our code
RUN mkdir -p src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release

# Copy real source; only this layer and the final build step change when relay code changes
COPY crates/splash-relay/src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/splash-relay /usr/local/bin/
EXPOSE 11511 9090
# TCP 11511 = Splash network, 9090 = WebSocket for browsers
ENTRYPOINT ["splash-relay"]
CMD ["--tcp-port", "11511", "--ws-port", "9090"]
