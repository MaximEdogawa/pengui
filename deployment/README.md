# Pengui Deployment Guide

This directory contains everything needed to deploy Pengui to production with **zero manual configuration** using Docker, nginx, and automatic SSL.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       Production Server                          │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────────────────┐   │
│  │ Certbot  │──▶│   Nginx     │──▶│  Pengui (Next.js)        │   │
│  │ (certs)  │   │ (TLS + path │   │  pengui:3000 (Docker)    │   │
│  └──────────┘   │  routing)   │   └──────────────────────────┘   │
│                 └──────┬──────┘                                    │
│                        │ proxy (optional)                         │
│                        ▼                                          │
│              host:1422  ◀── Pengine (Vite SPA, separate compose) │
│              (static-web-server; repo: pengine)                 │
│  ┌─────────────┐    ┌─────────────┐   Docker Network             │
│  │splash-relay │    │splash-relay │                                 │
│  │ (mainnet)   │    │ (testnet)   │                                 │
│  └─────────────┘    └─────────────┘                                 │
└──────────────────────────────────────────────────────────────────┘
```

Pengui’s app image is built from [`Dockerfile`](Dockerfile): **Next.js** `standalone` output (`node server.js`), not a static export — see [How Pengui is built](#how-pengine-differs-vite--nextjs) vs Pengine.

## Quick Start (Automated CI/CD)

### 1. Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret            | Description               | Example              |
| ----------------- | ------------------------- | -------------------- |
| `DEPLOY_HOST`     | Server hostname/IP        | `deploy.example.com` |
| `DEPLOY_USER`     | SSH username              | `deploy`             |
| `DEPLOY_SSH_KEY`  | Private SSH key           | _(see below)_        |
| `DEPLOY_PORT`     | SSH port (optional)       | `22`                 |
| `DOMAIN`          | Your domain name          | `pengui.example.com` |
| `CERTBOT_EMAIL`   | Email for SSL certs       | `admin@example.com`  |
| `CERTBOT_STAGING` | Use staging SSL (testing) | `0`                  |
| `PRODUCTION_ENV`  | Multiline env vars        | _(see below)_        |

Optional: set **`DOMAIN2`** (e.g. **`pengine.net`**) so the main Pengui nginx vhost and TLS cert include that hostname — see [Pengine behind Pengui nginx](#pengine-behind-pengui-nginx). For **`DOMAIN=penguinpool.space`**, **`deploy.sh`** still merges **`pengine.net`** into the Let’s Encrypt request unless **`CERT_SKIP_PENGINE_SAN=1`**.

### 2. Configure GitHub Variables

Go to **Settings → Secrets and variables → Actions → Variables** and add:

| Variable                                | Description              |
| --------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID |
| `NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL`  | WalletConnect relay URL  |
| `NEXT_PUBLIC_DEXIE_MAINNET_API_URL`     | Dexie mainnet API        |
| `NEXT_PUBLIC_DEXIE_TESTNET_API_URL`     | Dexie testnet API        |
| `NEXT_PUBLIC_API_BASE_URL`              | Your API base URL        |
| `NEXT_PUBLIC_APP_URL`                   | Your app URL             |

### 3. Create SSH Key Pair

```bash
# Generate key pair
ssh-keygen -t ed25519 -f deploy_key -C "GitHub Actions"

# Copy public key to server
ssh-copy-id -i deploy_key.pub user@server

# Add private key content to DEPLOY_SSH_KEY secret
cat deploy_key
```

### 4. Prepare PRODUCTION_ENV Secret

Create a multiline secret with runtime environment variables:

```
NODE_ENV=production
```

### 5. Deploy

**Option A: Create a GitHub Release**

- Go to Releases → Create new release
- Tag with version (e.g., `v1.0.0`)
- Publish release
- Deployment starts automatically

**Option B: Manual Dispatch**

- Go to Actions → Deploy Release (Docker)
- Click "Run workflow"
- Select environment and optionally specify a tag
- Enable **need_cert** to force a new or expanded Let’s Encrypt certificate on that run (runs certbot with **`--force-renewal`** so issuance is not skipped as “not yet due”). Releases and normal deploys otherwise reuse a valid cert.

## Manual Deployment

If you need to deploy manually without CI/CD:

### Prerequisites

- Docker and Docker Compose on the server
- SSH access to the server
- Domain pointing to server IP

### Optional: sudo for the deploy user

TLS files under `certbot/` are often **root-owned**; `openssl` to read SANs needs **`sudo`**. To allow the deploy user to run **`openssl`** without a password prompt, install the drop-in from this repo:

```bash
sudo install -m 440 -o root -g root ~/pengui/sudoers.d/pengui-deploy /etc/sudoers.d/pengui-deploy
```

(If you keep a full clone with a `deployment/` subfolder, use `~/pengui/deployment/sudoers.d/pengui-deploy` instead.) Edit `/etc/sudoers.d/pengui-deploy` first if your SSH user is not named **`deploy`**. Validate with `sudo visudo -c`. For Docker, prefer adding the user to the **`docker`** group instead of blanket `sudo docker`.

### Inspect certificate SANs on the server

Use the **real** path under your deployment tree — not a placeholder like `/full/path/to/...`. From the directory that contains `certbot/` (often `~/pengui/deployment` if you use a full clone, or `~/pengui` if you copied `deployment/*` there):

```bash
cd ~/pengui/deployment   # or: cd ~/pengui
ls certbot/conf/live/
```

The folder name under `live/` is the Let’s Encrypt **lineage** (usually your `DOMAIN`). Then:

```bash
sudo openssl x509 -in certbot/conf/live/penguinpool.space/fullchain.pem -noout -text | grep -A5 'Subject Alternative Name'
```

Adjust `penguinpool.space` if `ls` shows a different directory name. If `sudo` still asks for a password, install the **`sudoers.d/pengui-deploy`** drop-in above (or run the check as root). You can also read the cert **without filesystem access** (uses what the server presents on TLS):

```bash
echo | openssl s_client -servername penguinpool.space -connect penguinpool.space:443 2>/dev/null | openssl x509 -noout -text | grep -A5 'Subject Alternative Name'
```

### Steps

```bash
# 1. Clone/copy deployment files to server
scp -r deployment/* user@server:~/pengui/

# 2. SSH into server
ssh user@server
cd ~/pengui

# 3. Create environment file
cp .env.example .env
nano .env  # Edit with your values

# 4. Run deployment
export DOMAIN="your-domain.com"
export EMAIL="your-email@example.com"
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## Splash relay (Stream tab)

The **splash-relay** services join the Splash network (libp2p) and expose WebSocket so the app’s Stream tab can receive live offers. They are included in `docker-compose.yml`.

The Docker images compile both `splash-wasm` and `splash-relay` from source during the CI image build, so you only need to pull the versioned images for a reproducible deployment.

- **splash-relay** (mainnet): WebSocket on port **9090**, TCP on 11511.

To have the app **auto-connect** to these relays, set at **build time** (e.g. in CI or when building the image):

- `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL` – default relay (e.g. `wss://relay.penguinpool.space`)
- `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL` – mainnet relay (e.g. `wss://relay.penguinpool.space`)

For production with your own domain, set the relay subdomain in GitHub vars (see “DNS for relays” below) and use `wss://relay.yourdomain.com` in the app build vars. For local testing, use `ws://localhost:9090` and `ws://localhost:9091`.

## Pengine behind Pengui nginx

The **Pengine** web UI (separate repository) is shipped as a Docker image. **Run it in this stack** using the Compose **profile `pengine`** ([`docker-compose.yml`](docker-compose.yml) service `pengine-web`): set **`PENGINE_ENABLE=1`** and **`PENGINE_WEB_IMAGE`** (e.g. in GitHub Actions variables or `.env`). [`deploy.sh`](scripts/deploy.sh) runs **`docker compose --profile pengine up -d pengine-web`** so Pengine shares **`pengui-network`** with nginx — no second compose file and no `external` network. Nginx proxies to **`http://pengine-app:1422`**.

**Do not** run a separate `docker network create` for `pengui-network`; Compose creates it with the correct labels. **Do not** run a second Pengine compose on the same host (duplicate `pengine-app`).

Expose it under the path **`/pengine/`** on the main site (and, if you set **`DOMAIN2`**, on that hostname too):

- **URL:** `https://<DOMAIN>/pengine/` (and `https://<DOMAIN2>/pengine/` when **`DOMAIN2`** is set).
- **Nginx:** [`nginx/templates/https.conf.template`](nginx/templates/https.conf.template) and [`http-only.conf.template`](nginx/templates/http-only.conf.template).
- **Pengine build:** set Vite [`base`](https://vitejs.dev/config/shared-options.html#base) to **`/pengine/`** so JS/CSS paths resolve under that prefix.

**Second apex (optional):** set **`DOMAIN2=pengine.net`** (or rely on automatic **`penguinpool.space` ↔ `pengine.net`** SAN merge when **`DOMAIN`** is one of those). DNS for every name on the cert must point at this host for HTTP-01. Inspect the leaf with **`openssl x509 -in fullchain.pem -noout -text`** (**Subject Alternative Name** lists **`DNS:`** entries).

Ensure the Pengine stack is up on the host before relying on the proxy (`docker ps` / curl `http://127.0.0.1:1422`).

## How Pengine differs (Vite vs Next.js)

|            | **Pengui** ([`deployment/Dockerfile`](Dockerfile))      | **Pengine** (typical separate repo)                       |
| ---------- | ------------------------------------------------------- | --------------------------------------------------------- |
| Framework  | Next.js (App/Pages router)                              | Vite + React                                              |
| Production | Node `standalone` server on **3000**                    | Static files + small HTTP server on **80→1422**           |
| Image      | Multi-stage: Bun build → `node:alpine` runs `server.js` | Multi-stage: Bun build → e.g. static-web-server / similar |

## DNS for relays (penguinpool.space)

DNS for your domain (e.g. penguinpool.space) is managed at your DNS provider, not in this repo. To expose the Splash relay so the app can connect via `wss://…`:

1. **Add a subdomain** for the relay (e.g. `relay.penguinpool.space`).
2. **Create an A record** (or CNAME if you use a hostname) pointing that subdomain to the **relay server’s public IP** (the host where the relay container runs; it can be the same machine as the app or a different one).
3. (Optional) Add additional mainnet relay subdomains later (e.g. `relay-2.penguinpool.space`).

No zone file or DNS code is stored in this repository; configure these records in your DNS provider’s dashboard.

**To make `relay.penguinpool.space` work end-to-end:**

1. **DNS**: A record `relay.penguinpool.space` → your relay server’s public IP (you’ve done this). For testnet, add **`relay-testnet.penguinpool.space`** the same way if you use that hostname.
2. **GitHub Actions variables**: Set **`NEXT_PUBLIC_SPLASH_RELAY_MAINNET_SUBDOMAIN`** to **`relay.penguinpool.space`** (the workflow builds `wss://…` from it and passes **`RELAY_MAINNET_SUBDOMAIN`** to deploy). Set **`NEXT_PUBLIC_SPLASH_RELAY_TESTNET_SUBDOMAIN`** to **`relay-testnet.penguinpool.space`** so CI passes **`RELAY_TESTNET_SUBDOMAIN`** (nginx testnet vhost + cert SAN).
3. **TLS:** For **`DOMAIN=penguinpool.space`**, **`deploy.sh`** adds **`relay.penguinpool.space`** and **`relay-testnet.penguinpool.space`** to the Let’s Encrypt request automatically (deduped with **`RELAY_*_SUBDOMAIN`** / **`CERT_EXTRA_DOMAINS`**). Set **`CERT_SKIP_PENGUINPOOL_RELAY_SAN=1`** if you do not use those hostnames or lack DNS for one of them (HTTP-01 will fail for any name on the request that does not resolve to this host).

If the server already has an SSL cert that does not include a new relay name, trigger an expanded certificate (e.g. **`NEED_CERT_FORCE`**, or remove the existing cert and redeploy).

> Note: the in-repo deployment currently only runs a **mainnet** relay.

### Nginx and relay coupling

- **Nginx image** is built from `deployment/nginx/` (Alpine + relay watchdog).
- With **`RELAY_WATCHDOG=1`** (default in `.env.example`), the nginx container **exits** if `splash-relay` stops accepting TCP on **9090** (and the relay healthcheck requires **9090** and **11511**). Docker’s `restart: unless-stopped` brings nginx back; once the relay is healthy again, nginx stays up.
- **`deploy.sh`** sets **`RELAY_WATCHDOG=0`** only for the initial **ACME / HTTP-only** nginx step (before the relay must be up). After HTTPS is configured, deploy uses **`RELAY_WATCHDOG=1`**.

## Files

| File                                              | Description                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `Dockerfile`                                      | Multi-stage build for Next.js standalone server                              |
| `docker-compose.yml`                              | Service orchestration (Next.js + nginx + certbot + splash-relay)             |
| `splash-relay/Dockerfile`                         | Build for splash-relay (Rust)                                                |
| `nginx/Dockerfile`                                | Nginx image with relay watchdog                                              |
| `nginx/nginx.conf`                                | Base nginx configuration                                                     |
| `nginx/templates/*.conf.template`                 | Domain-specific nginx configs (relay subdomains, HTTPS + HTTP templates)     |
| `scripts/deploy.sh`                               | Automated deployment script                                                  |
| `.env.example`                                    | Environment variable template                                                |

## How It Works

1. **Build Phase** (GitHub Actions)
   - Builds Next.js in standalone mode
   - Creates optimized Docker image (~150MB)
   - Pushes to GitHub Container Registry

2. **Deploy Phase** (GitHub Actions)
   - Copies deployment files to server
   - Pulls Docker image
   - Runs `deploy.sh` script

3. **Deploy Script** (`deploy.sh`)
   - Creates required directories
   - Checks/obtains SSL certificate via Let's Encrypt
   - Configures nginx as reverse proxy
   - Starts all services
   - Verifies deployment health

## SSL Certificates

SSL certificates are automatically obtained from Let's Encrypt:

- **First deployment**: Obtains new certificate
- **Renewal**: Certbot container automatically renews certificates every 12 hours (when within 30 days of expiry)
- **Testing**: Set `CERTBOT_STAGING=1` to use staging environment (avoids rate limits)

## Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f pengui
docker compose logs -f nginx
docker compose logs -f splash-relay
```

### Check Health

```bash
# Container status
docker compose ps

# Application health
curl https://your-domain.com/api/health

# SSL certificate info
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Resource Usage

```bash
docker stats
```

## Troubleshooting

### Application won't start

```bash
docker compose logs pengui --tail 100
```

### SSL certificate issues

```bash
# Check certificate files
ls -la certbot/conf/live/your-domain.com/

# Request new certificate manually
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email your-email@example.com \
  -d your-domain.com \
  --agree-tos --non-interactive
```

### Nginx configuration errors

```bash
# Test nginx config
docker compose exec nginx nginx -t

# Reload nginx
docker compose exec nginx nginx -s reload
```

### Splash relay (Docker)

Deployment sets **`RUST_LOG=info`** by default (startup line, peer warnings, errors). **`deploy.sh`** warns if the relay is **restarting** during deploy and prints the **last 60 log lines** after the relay start window.

#### Where the logs are

- **Service**: `splash-relay` (mainnet) · **Container**: `pengui-splash-relay`
- Relay uses **json-file** with **max-size 5m, max-file 1**: `docker compose logs` works; only the latest 5MB is kept. After a container restart the log file is new, so no long-term log storage.

#### View relay logs on the server

```bash
# From the deployment directory
cd /path/to/deployment

# Follow mainnet relay logs (live)
docker compose logs -f splash-relay

# Last 200 lines
docker compose logs splash-relay --tail 200

# By container name
docker logs -f pengui-splash-relay
docker logs pengui-splash-relay --tail 200
```

#### Verbose logging (troubleshooting)

Default in compose is **`RUST_LOG=info`**. For more detail, in **`deployment/.env`** set:

```bash
RUST_LOG=debug
```

Then `docker compose up -d splash-relay`. Use **`debug`** only while troubleshooting (higher log volume). Remove or set back to **`info`** afterward.

#### Check relay status and restart

```bash
# Container status (running / exit code)
docker compose ps splash-relay

# Restart relay
docker compose restart splash-relay

# View last log lines after restart
docker compose logs splash-relay --tail 50
```

#### Look for errors in logs

```bash
# Lines containing "warn" or "error" (case-insensitive)
docker compose logs splash-relay 2>&1 | grep -iE 'warn|error'

# Common messages:
# - "Failed to resolve DNS peers"     → DNS or network issue on host
# - "Failed to dial bootstrap peer"   → Bootstrap peers down or unreachable
# - "No peers connected"             → Network/DNS or no bootstrap peers
# - "WS connection limit reached"    → Too many browser clients; increase --max-ws-connections or scale
# - "Rejecting oversized offer"      → Normal; a peer sent an offer over size limit
# - "Incoming connection error"      → Client or network issue
```

#### Common issues

| Issue                                             | What to do                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Relay in restart loop** (e.g. `Restarting (0)`) | The relay exits and Docker keeps restarting it. Run it in the foreground to see the real error: `docker compose run --rm splash-relay` (or `docker run --rm -it <SPLASH_RELAY_IMAGE> splash-relay --tcp-port 11511 --ws-port 9090`). You should see `splash-relay starting...` then either the ready line or an error (e.g. bind failure, DNS, or panic). Fix the cause (ports, image platform, DNS) and redeploy. |
| Container exits immediately                       | Run `docker compose logs splash-relay --tail 100` and check for bind/port errors (e.g. 9090 or 11511 in use). Or run the container in the foreground (see "Relay in restart loop" above). Ensure ports are free or change `command`/port mapping.                                                                                                                                                                  |
| "No peers connected"                              | Check DNS from the host (`nslookup _dnsaddr.splash.dexie.space` or similar). If using `--known-peer`, ensure addresses are correct. Restart relay after fixing network.                                                                                                                                                                                                                                            |
| Stream tab in app not updating                    | Confirm app is using the correct relay URL (e.g. `wss://relay.yourdomain.com`). Check nginx is proxying to `splash-relay:9090` and that `docker compose logs splash-relay` shows no repeated errors.                                                                                                                                                                                                               |
| Too many WS connections                           | Increase `--max-ws-connections` in the relay `command` in docker-compose (e.g. `--max-ws-connections 1000`) and redeploy.                                                                                                                                                                                                                                                                                          |
| Need to see what the relay is doing               | Set `RUST_LOG=info` or `RUST_LOG=debug` (see above), reproduce, then turn verbose logging off.                                                                                                                                                                                                                                                                                                                     |

#### Log retention (minimal; no long-term storage)

- Relay uses **json-file** with one 5MB file. After a container restart the log file is new, so no logs are kept from previous runs.
- For longer-term auditing or metrics, use a log aggregator and point it at Docker log files or configure a logging driver that ships to your stack.

### Rollback

```bash
# Pull specific version
export DOCKER_IMAGE=ghcr.io/maximedogawa/pengui:v1.0.0
docker compose pull pengui
docker compose up -d
```

## Cleanup

```bash
# Remove unused images
docker image prune -a

# Full cleanup (careful!)
docker system prune -a --volumes
```
