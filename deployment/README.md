# Pengui Deployment Guide

Pengui runs as Docker images pulled and managed by [ONCE](https://github.com/basecamp/once),
Basecamp's self-hosting platform. ONCE owns TLS (Let's Encrypt), the reverse proxy, and the
container lifecycle for every hostname - there's no nginx, Certbot, or bespoke deploy script to
maintain here.

**How deploys work:** CI only ever builds and pushes images to `ghcr.io` - it never touches the
server. You run `once deploy` **once per app, by hand**. After that ONCE keeps that app updated
itself, because `once deploy` sets `--auto-update` (on by default) and polls the registry for new
images on the tag you deployed. So shipping a new version is just: merge/release → CI pushes the
image → ONCE picks it up.

**Everything runs behind the single `once-proxy`** - the app and both relays, each a plain ONCE
app with one image and one hostname. No sidecars, no side-channel containers, nothing to babysit.

| What | Image | Hostname |
| --- | --- | --- |
| App (Next.js) | `ghcr.io/maximedogawa/pengui:latest` | `pengui.space` |
| Relay (mainnet) | `ghcr.io/maximedogawa/pengui:splash-relay` | `relay.pengui.space` |
| Relay (testnet) | `ghcr.io/maximedogawa/pengui:splash-relay` | `relay-testnet.pengui.space` |

## Prerequisites (once per server)

- A server reachable on the public Internet with Docker installed.
- A DNS **A record per hostname**, all pointing at the server's IP. A hostname without a record
  makes `once deploy` fail with *"The application couldn't be verified. Please check that you have
  a valid DNS record set up"* - ONCE needs the name to resolve before it can issue a certificate.
  If you'll add more apps later, a wildcard `*.pengui.space` record covers them all at once.
- [ONCE](https://github.com/basecamp/once) installed:

  ```bash
  curl https://get.once.com | sh
  ```

Check what's currently deployed any time with `once list`.

## Deploy the app

```bash
once deploy ghcr.io/maximedogawa/pengui:latest --host pengui.space
```

Run once, on the server. ONCE fetches the image, boots it, provisions TLS, and from then on
auto-updates it as CI pushes new `:latest` images. Verify:

```bash
curl https://pengui.space/up
```

The image serves plain HTTP on port 80 with a `/up` health route (`src/app/up/route.ts`) - that's
ONCE's whole app contract.

## Deploy the relays

The Splash relay (`crates/splash-relay`) powers the Stream tab's live offers. The app works
without it; the Stream tab just won't have anything to stream. Two instances, one per network:

```bash
# mainnet
once deploy ghcr.io/maximedogawa/pengui:splash-relay --host relay.pengui.space

# testnet - the --env flag is what makes it join splash-testnet instead of mainnet
once deploy ghcr.io/maximedogawa/pengui:splash-relay --host relay-testnet.pengui.space --env RELAY_TESTNET=1
```

Verify:

```bash
curl https://relay.pengui.space/up
curl https://relay-testnet.pengui.space/up
```

The app connects to these over `wss://` - which is why they must be behind ONCE's TLS proxy
rather than exposed as plain ports: a page served over `https://` cannot open a `ws://`
connection, browsers block it as mixed content.

### How the relay satisfies ONCE's contract

The relay binary serves the `/up` health check and browser WebSocket traffic on the **same single
port**, so it meets ONCE's contract directly - the image is just the binary, with no proxy,
sidecar, or entrypoint script inside it.

libp2p's WebSocket transport can't answer a plain `GET /up` on its own, so the relay listens on
the public port itself: it replies to `/up`, and hands every other connection straight to libp2p's
WebSocket listener on loopback. Incoming bytes are only peeked at, never consumed, so the libp2p
handshake arrives exactly as the browser sent it (`serve_public_port` in
[`crates/splash-relay/src/main.rs`](../crates/splash-relay/src/main.rs)).

The two roles are cleanly separated, which is what makes the relay deployable as an ordinary ONCE
app:

- **Browser/WebSocket side** - one public HTTP port, proxied and TLS-terminated by ONCE.
- **P2P peering side** - a libp2p TCP listener, **off by default** (`RELAY_TCP_PORT=0` in the
  image). ONCE's proxy handles HTTP/TLS only and can't publish a raw TCP port, and the relay
  still dials *out* to Splash bootstrap peers without a listener, so it receives and relays
  offers normally. The only thing it gives up is being dialable *by* other nodes as a bootstrap
  peer, which doesn't affect the Stream tab. To run a full peering node, set `RELAY_TCP_PORT` and
  publish that port outside ONCE.

### Relay configuration

Set with `--env KEY=VALUE` on `once deploy` (repeatable), or later via `once update`:

| Variable | Default in image | Purpose |
| --- | --- | --- |
| `RELAY_TESTNET` | unset | Set to `1` to join `splash-testnet` instead of mainnet |
| `RELAY_MAX_WS_CONNECTIONS` | `500` | Max concurrent browser WebSocket connections |
| `RELAY_KNOWN_PEERS` | unset | Space-separated multiaddrs to dial explicitly |
| `RELAY_WS_PORT` | `80` | Public port serving `/up` + WebSocket |
| `RELAY_TCP_PORT` | `0` (disabled) | Inbound libp2p peering port; `0` disables the listener |
| `RUST_LOG` | `info` | Set to `debug` for verbose libp2p logs while troubleshooting |

## Building the images

Two independent build pipelines. Neither one deploys, and neither needs SSH access to the server:

- [`build-app.yml`](../.github/workflows/build-app.yml) - builds `splash-wasm` (a build-time input
  baked into the app image) then the app image, and pushes both. Runs on every GitHub release, or
  manually via `workflow_dispatch`. `NEXT_PUBLIC_*` build args come from GitHub Actions
  variables/secrets - see the workflow for the full list.
- [`build-relay.yml`](../.github/workflows/build-relay.yml) - builds and pushes the relay image.
  Runs on release, on pushes to `main` that touch `crates/splash-relay` or
  `deployment/splash-relay` (GitHub's native path filter), or manually.

To build locally instead:

```bash
docker build -f deployment/splash-wasm/Dockerfile -t pengui:splash-wasm .
docker build -f deployment/Dockerfile --build-arg SPLASH_WASM_IMAGE=pengui:splash-wasm -t pengui:app .
docker build -f deployment/splash-relay/Dockerfile -t pengui:splash-relay .
```

## Operating

`once` on the server opens a dashboard listing every app, with logs and status. Useful commands:

```bash
once list                                   # what's deployed
once update <host> --env KEY=VALUE          # change settings on a deployed app
once stop <host> / once start <host>        # stop or start an app
once exec <host> -- <command>               # run a command in the app's container
once remove <host>                          # remove an app entirely
```

To roll back or pin a version, deploy an explicit tag - this also turns off auto-update drift by
pinning what ONCE tracks:

```bash
once deploy ghcr.io/maximedogawa/pengui:v1.2.3 --host pengui.space
```

Raw Docker still works for inspection, since ONCE is Docker underneath:

```bash
docker ps
docker logs -f <container>
```

## Server access

Nothing in CI needs SSH anymore - deploys are manual, so the server only needs to be reachable by
you. The [`test-connection.yml`](../.github/workflows/test-connection.yml) workflow can verify a
deploy user's SSH key and that `docker`/`once` are usable, if you keep the `DEPLOY_HOST`,
`DEPLOY_USER`, and `DEPLOY_SSH_KEY` secrets configured for it.

To set up a dedicated non-root deploy user for your own SSH access:

```bash
# on the server, as root
adduser deploy --disabled-password --gecos ""
usermod -aG docker deploy          # lets it run docker and once without sudo

# from your machine
ssh-keygen -t ed25519 -f ~/.ssh/pengui_deploy_key -C "pengui-deploy" -N ""
ssh-copy-id -i ~/.ssh/pengui_deploy_key.pub deploy@<server-ip>
ssh -i ~/.ssh/pengui_deploy_key deploy@<server-ip> 'docker --version && once list'
```

## Health checks

- App: `https://pengui.space/up`
- Relays: `https://relay.pengui.space/up`, `https://relay-testnet.pengui.space/up`

ONCE polls these itself and won't route traffic to a container that isn't answering.
