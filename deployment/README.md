# Pengui Deployment Guide

Pengui deploys as plain Docker images pulled and run by [ONCE](https://github.com/basecamp/once),
Basecamp's self-hosting platform. ONCE owns TLS (Let's Encrypt), the reverse proxy, and the
container lifecycle for each hostname - there's no nginx, Certbot, or bespoke deploy script to
maintain here anymore.

**CI only builds and pushes images - it never SSHes into the server.** Deploying is a separate,
manual `once deploy` step: once per app, ONCE takes over from there (it fetches and runs new
images on its own - that's the platform's whole point). **The app and the relay are two
completely independent deployments** - separate Dockerfiles, separate GitHub Actions workflows,
separate `once deploy` calls, separate hostnames. Nothing about deploying one depends on the
other. Start with the app.

## 1. Deploy the app (do this first)

This is the fast path to get something running and testable.

### Prerequisites

- A server (VPS, Raspberry Pi, etc.) reachable on the public Internet, with Docker installable.
- A DNS **A record** for `pengui.space` pointing at the server's IP.
- [ONCE](https://github.com/basecamp/once) installed on the server:

  ```bash
  curl https://get.once.com | sh
  ```

  For a non-interactive/scripted install, use `ONCE_INTERACTIVE=false`. Manual install and
  background-service registration are documented in the
  [ONCE README](https://github.com/basecamp/once#installing-manually).

### Build the image

[`.github/workflows/build-app.yml`](../.github/workflows/build-app.yml) builds WASM, then the app
image, then pushes `ghcr.io/maximedogawa/pengui:<tag>` - on every GitHub release, or by hand via
`workflow_dispatch`. It does nothing else: no SSH, no server, no relay involved. To build locally
instead:

```bash
docker build -f deployment/splash-wasm/Dockerfile -t pengui:splash-wasm .
docker build -f deployment/Dockerfile --build-arg SPLASH_WASM_IMAGE=pengui:splash-wasm -t pengui:app .
```

The image serves plain HTTP on port 80 with a `/up` health route (`src/app/up/route.ts`) - that's
the whole ONCE contract, nothing else required.

### Deploy it (one-time)

```bash
once deploy ghcr.io/maximedogawa/pengui:latest --host pengui.space
```

Run this once, on the server, to register the app with ONCE. ONCE fetches, installs, boots, and
TLS-provisions it - then keeps it updated on its own as CI pushes new images to the same tag
(ONCE's ["automatic updates"](https://github.com/basecamp/once) feature). Nothing in CI re-runs
this command. If you ever need to point the hostname at a different tag, re-run `once deploy`
by hand with that tag. Check it:

```bash
curl https://pengui.space/up
```

## 2. Deploy the relay (separate, optional, do this whenever)

The Splash relay (`crates/splash-relay`, image built from
[`splash-relay/Dockerfile`](splash-relay/Dockerfile)) powers the Stream tab's live offers. The app
works without it - the Stream tab just won't have anything to stream. Deploy it on your own
schedule via [`.github/workflows/deploy-relay.yml`](../.github/workflows/deploy-relay.yml)
(`workflow_dispatch`, or automatically on release - see [below](#why-two-relay-hostnames-and-a-manual-step)
for why a release only rebuilds it when relay files actually changed).

### DNS

A records for `relay.pengui.space` and `relay-testnet.pengui.space`, pointing at whichever server
runs the relay (can be the same box as the app, or a different one).

### Deploy

```bash
once deploy ghcr.io/maximedogawa/pengui:splash-relay --host relay.pengui.space
once deploy ghcr.io/maximedogawa/pengui:splash-relay --host relay-testnet.pengui.space
```

Plus the P2P side-channel containers - see [below](#why-two-relay-hostnames-and-a-manual-step).

### Why two relay hostnames, and a manual step

`splash-relay` speaks libp2p over two ports: a WebSocket port (what the browser's Stream tab
connects to) and a raw TCP port (peer-to-peer bonding with other relay nodes on the wider Splash
network). ONCE's model is "one hostname -> one container's port 80", which is a perfect fit for
the WebSocket side but has no way to also publish a second raw TCP port. So:

- The **ONCE-managed container** (one per network, hence the two hostnames) serves the WebSocket
  side. Since `splash-relay` isn't itself an HTTP server, the image bakes in a tiny internal nginx
  (`splash-relay/nginx.conf.template`) that listens on port 80, answers `/up` for ONCE's health
  check, and proxies everything else to the relay's WebSocket port on localhost. This satisfies
  [ONCE's app contract](https://github.com/basecamp/once#making-a-once-compatible-application)
  without touching the Rust relay code.
- **First-time only:** the testnet app needs `RELAY_TESTNET=1` set so it joins `splash-testnet`
  instead of mainnet - via the ONCE dashboard (select the app, press `s`) or `once update --help`
  on your server (the public ONCE docs don't yet pin down the exact env-var flag for this
  release). Without it, the testnet app is just a second mainnet relay.
- A **second, plain `docker run` container per network** (same image) keeps the raw TCP port open
  for P2P peering:

  ```bash
  docker run -d --name pengui-relay-p2p-mainnet --restart unless-stopped \
    -p 11511:11511 ghcr.io/maximedogawa/pengui:splash-relay

  docker run -d --name pengui-relay-p2p-testnet --restart unless-stopped \
    -p 11512:11511 -e RELAY_TESTNET=1 ghcr.io/maximedogawa/pengui:splash-relay
  ```

  These aren't managed by ONCE and don't need TLS/a hostname - other relay nodes dial them
  directly by IP:port. If you don't care about this node acting as a bootstrap/peering node for
  others (the app's own WebSocket connectivity works fine either way), skip these two containers
  entirely.

## 3. Server SSH access (only needed for the relay CI pipeline)

[`build-app.yml`](../.github/workflows/build-app.yml) never touches the server - it only builds
and pushes images (see [above](#1-deploy-the-app-do-this-first)). **Only
[`deploy-relay.yml`](../.github/workflows/deploy-relay.yml) SSHes in**, to run `once deploy` and
manage the P2P side-channel containers on every relay-affecting release. Set this up once, on
whichever server runs the relay.

### 3.1 Create a dedicated deploy user on the server

Don't reuse your personal login or `root`. As root (or via `sudo`) on the server:

```bash
adduser deploy --disabled-password --gecos ""
usermod -aG docker deploy
```

`docker` group membership means `deploy` can run `docker`/`once` without `sudo` - important,
because [ONCE's own docs](https://github.com/basecamp/once#installing) note that if you need
`sudo` for Docker, you'll also need `sudo` for `once`, and `appleboy/ssh-action` runs a
non-interactive shell where an unattended `sudo` prompt would just hang the job. If ONCE was
installed as root before this user existed, confirm `deploy` can actually run it:

```bash
su - deploy -c 'once --help'   # should print usage, not a permissions error
```

### 3.2 Generate an SSH key pair (on your own machine, not the server)

```bash
ssh-keygen -t ed25519 -f pengui_deploy_key -C "github-actions-pengui-relay" -N ""
```

This writes `pengui_deploy_key` (private) and `pengui_deploy_key.pub` (public) to your current
directory. Never commit either file to git.

### 3.3 Install the public key on the server

```bash
ssh-copy-id -i pengui_deploy_key.pub deploy@your-server-ip
```

Or, if `ssh-copy-id` isn't available:

```bash
cat pengui_deploy_key.pub | ssh deploy@your-server-ip \
  'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

Confirm it works before moving on: `ssh -i pengui_deploy_key deploy@your-server-ip`.

### 3.4 Add the key and connection details as GitHub secrets

Repo → **Settings → Secrets and variables → Actions → Secrets**, add:

| Secret          | Value                                                    |
| ---------------- | --------------------------------------------------------- |
| `DEPLOY_SSH_KEY` | The full contents of `pengui_deploy_key` (the private key, `cat pengui_deploy_key`) |
| `DEPLOY_HOST`    | The server's hostname or IP                              |
| `DEPLOY_USER`    | `deploy`                                                 |
| `DEPLOY_PORT`    | Only if SSH isn't on port 22 - the workflows default to 22 |

Then delete `pengui_deploy_key`/`pengui_deploy_key.pub` from your machine (or move them to a
password manager) - once they're in GitHub Secrets there's no reason to keep a plaintext copy
lying around.

### 3.5 Verify

Actions → **Test SSH Connection** ([`test-connection.yml`](../.github/workflows/test-connection.yml))
→ **Run workflow**. It confirms the key works and that both `docker` and `once` are reachable for
the `deploy` user without `sudo`.

## Relay image configuration

Configured entirely via environment variables, since ONCE deploys by image + env vars, not custom
commands/CLI flags:

| Variable                  | Default | Purpose                                         |
| -------------------------- | ------- | ------------------------------------------------ |
| `RELAY_TCP_PORT`           | `11511` | libp2p TCP port (P2P peering)                   |
| `RELAY_WS_PORT`            | `9090`  | libp2p WebSocket port (internal; nginx proxies port 80 -> this) |
| `RELAY_TESTNET`            | unset   | Set to `1` to join `splash-testnet`             |
| `RELAY_MAX_WS_CONNECTIONS` | `500`   | Passed through as `--max-ws-connections`        |
| `RELAY_KNOWN_PEERS`        | unset   | Space-separated multiaddrs, passed as repeated `--known-peer` |

## Building the images

Two independent workflows, matching the two independent deployments:

- [`build-app.yml`](../.github/workflows/build-app.yml) - builds `splash-wasm` (build-time input
  from `crates/splash-wasm`) then the app image (`deployment/Dockerfile`), and pushes it to
  `ghcr.io`. That's all it does - it never deploys (see [above](#1-deploy-the-app-do-this-first)
  for the one-time `once deploy` step ONCE needs, and it fetches new images automatically after
  that). Runs on every GitHub release, or manually via `workflow_dispatch`.
- [`deploy-relay.yml`](../.github/workflows/deploy-relay.yml) - builds the relay image
  (`deployment/splash-relay/Dockerfile`, from `crates/splash-relay`) **and** deploys it (unlike the
  app, it still SSHes in and runs `once deploy` plus the P2P side-channel containers on every run -
  those aren't fully ONCE-managed, see [below](#why-two-relay-hostnames-and-a-manual-step)). Runs
  on every GitHub release too, but **skips the build/deploy entirely if nothing under
  `crates/splash-relay` or `deployment/splash-relay` changed since the previous release** - so
  shipping an app-only release stays fast and doesn't bounce the relay containers for no reason.
  `workflow_dispatch` always runs (that's an explicit "redeploy the relay" request).

`NEXT_PUBLIC_*` build args come from GitHub Actions variables/secrets - see
[`build-app.yml`](../.github/workflows/build-app.yml) for the full list.

## Monitoring, logs, rollback

Managed through ONCE's TUI dashboard (run `once` on the server) rather than `docker compose`:

- Dashboard shows live status for every app; select one to see logs.
- Press `s` on an app for settings (backups, hostname, image, environment variables).
- Press `a` for actions (start/stop/remove).
- To roll back, `once deploy <previous-image-tag> --host <hostname>`.

For the manual P2P side-channel containers (not visible in the ONCE dashboard):

```bash
docker logs -f pengui-relay-p2p-mainnet
docker logs -f pengui-relay-p2p-testnet
docker ps --filter name=pengui-relay-p2p
```

## Health checks

- App: `https://pengui.space/up`
- Relay: `https://relay.pengui.space/up` / `https://relay-testnet.pengui.space/up`

Both are served by ONCE itself before it'll route traffic to a new container, and are what ONCE
polls to decide an app is healthy.
