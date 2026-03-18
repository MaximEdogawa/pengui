FROM rust:1-bookworm AS builder

WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY crates/splash-wasm /build/crates/splash-wasm
WORKDIR /build/crates/splash-wasm
RUN wasm-pack build --target web --out-dir /out

# Final image is only the compiled wasm bundle.
FROM alpine:3.20
WORKDIR /out
COPY --from=builder /out /out

