# syntax=docker/dockerfile:1.7
#
# splash-relay runtime image that bakes the relay binary at docker build time
# by downloading it from the GitHub Release for RELEASE_TAG.
#
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates curl netcat-openbsd && rm -rf /var/lib/apt/lists/*

ARG RELEASE_TAG
ARG GITHUB_REPOSITORY

# Download the correct relay binary from the release assets and validate it.
RUN --mount=type=secret,id=GITHUB_TOKEN,required=false \
  set -eu; \
  TAG="${RELEASE_TAG}"; \
  REPO="${GITHUB_REPOSITORY}"; \
  URL="https://github.com/${REPO}/releases/download/${TAG}/splash-relay-${TAG}-linux-amd64"; \
  token="$(cat /run/secrets/GITHUB_TOKEN 2>/dev/null || true)"; \
  if [ -n "$token" ]; then \
    curl -fsSL -L -H "Authorization: Bearer $token" "$URL" -o /usr/local/bin/splash-relay; \
  else \
    curl -fsSL -L "$URL" -o /usr/local/bin/splash-relay; \
  fi; \
  chmod +x /usr/local/bin/splash-relay; \
  /usr/local/bin/splash-relay --help 2>&1 | grep -q "Maximum concurrent WebSocket"

EXPOSE 11511 9090

# TCP 11511 = Splash network, 9090 = WebSocket for browsers
ENTRYPOINT ["splash-relay"]
CMD ["--tcp-port", "11511", "--ws-port", "9090"]
