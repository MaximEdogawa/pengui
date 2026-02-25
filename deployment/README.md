# Pengui Deployment Guide

This directory contains everything needed to deploy Pengui to production with **zero manual configuration** using Docker, nginx, and automatic SSL.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Production Server                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Certbot   │    │    Nginx    │    │   Next.js   │  │
│  │  (SSL Cert) │───▶│  (Reverse   │───▶│    App      │  │
│  │             │    │   Proxy)    │    │  (Port 3000)│  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│        │                  │                   │          │
│        └──────────────────┼───────────────────┘          │
│                           ▼                              │
│  ┌─────────────┐    ┌─────────────┐   Docker Network    │
│  │splash-relay │    │splash-relay │                      │
│  │ (mainnet)   │    │ (testnet)   │   (optional)        │
│  │ :9090/:11511│    │ :9091       │                      │
│  └─────────────┘    └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Quick Start (Automated CI/CD)

### 1. Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description | Example |
|--------|-------------|---------|
| `DEPLOY_HOST` | Server hostname/IP | `deploy.example.com` |
| `DEPLOY_USER` | SSH username | `deploy` |
| `DEPLOY_SSH_KEY` | Private SSH key | *(see below)* |
| `DEPLOY_PORT` | SSH port (optional) | `22` |
| `DOMAIN` | Your domain name | `pengui.example.com` |
| `CERTBOT_EMAIL` | Email for SSL certs | `admin@example.com` |
| `CERTBOT_STAGING` | Use staging SSL (testing) | `0` |
| `PRODUCTION_ENV` | Multiline env vars | *(see below)* |

### 2. Configure GitHub Variables

Go to **Settings → Secrets and variables → Actions → Variables** and add:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID |
| `NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL` | WalletConnect relay URL |
| `NEXT_PUBLIC_DEXIE_MAINNET_API_URL` | Dexie mainnet API |
| `NEXT_PUBLIC_DEXIE_TESTNET_API_URL` | Dexie testnet API |
| `NEXT_PUBLIC_API_BASE_URL` | Your API base URL |
| `NEXT_PUBLIC_APP_URL` | Your app URL |

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

## Manual Deployment

If you need to deploy manually without CI/CD:

### Prerequisites

- Docker and Docker Compose on the server
- SSH access to the server
- Domain pointing to server IP

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

- **splash-relay** (mainnet): WebSocket on port **9090**, TCP on 11511.
- **splash-relay-testnet**: WebSocket on host port **9091** (container 9090), `--testnet`.

To have the app **auto-connect** to these relays, set at **build time** (e.g. in CI or when building the image):

- `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL` – default relay (e.g. `wss://relay.penguinpool.space`)
- `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL` – mainnet relay (e.g. `wss://relay.penguinpool.space`)
- `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL` – testnet relay (e.g. `wss://testnet-relay.penguinpool.space`)

For production with your own domain, set the relay subdomain in GitHub vars (see “DNS for relays” below) and use `wss://relay.yourdomain.com` in the app build vars. For local testing, use `ws://localhost:9090` and `ws://localhost:9091`.

## DNS for relays (penguinpool.space)

DNS for your domain (e.g. penguinpool.space) is managed at your DNS provider, not in this repo. To expose the Splash relay so the app can connect via `wss://…`:

1. **Add a subdomain** for the relay (e.g. `relay.penguinpool.space`).
2. **Create an A record** (or CNAME if you use a hostname) pointing that subdomain to the **relay server’s public IP** (the host where the relay container runs; it can be the same machine as the app or a different one).
3. For testnet relay, add `testnet-relay.penguinpool.space` (same A record → relay server IP). For more relays later: `relay-2.penguinpool.space`, etc.

No zone file or DNS code is stored in this repository; configure these records in your DNS provider’s dashboard.

**To make `relay.penguinpool.space` work end-to-end:**

1. **DNS**: A record `relay.penguinpool.space` → your relay server’s public IP (you’ve done this).
2. **GitHub Actions variable**: Set `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL=wss://relay.penguinpool.space` (and optionally `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL`). The app build uses this for the Stream tab. The workflow derives the relay subdomain from this URL and passes it to the deploy script, which requests an SSL cert that includes it and generates the nginx WebSocket proxy for the mainnet relay.

If the server already has an SSL cert that does not include the relay subdomain, either run certbot once with `-d penguinpool.space -d relay.penguinpool.space` to expand the cert, or trigger a new certificate request (e.g. by removing the existing cert and redeploying).

**To enable the testnet relay and `testnet-relay.penguinpool.space`:**

1. **DNS**: A record `testnet-relay.penguinpool.space` → your relay server’s public IP (same as mainnet if both run on the same host).
2. **GitHub Actions variable**: Set `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL=wss://testnet-relay.penguinpool.space`. Same as mainnet: the workflow derives the testnet relay subdomain from this URL for nginx and certbot; the app uses it for the Stream tab in testnet mode.

The testnet relay container (`splash-relay-testnet`) is always started with the mainnet relay when `SPLASH_RELAY_IMAGE` is set; the subdomain config only exposes it over HTTPS. Nginx config is generated from `nginx/templates/relay-mainnet.conf.template` and `nginx/templates/relay-testnet.conf.template` when the corresponding WS URL vars are set (subdomains are derived from those URLs).

## Files

| File | Description |
|------|-------------|
| `Dockerfile` | Multi-stage build for Next.js standalone server |
| `docker-compose.yml` | Service orchestration (Next.js + nginx + certbot + splash-relay) |
| `splash-relay/Dockerfile` | Build for splash-relay (Rust) |
| `nginx/nginx.conf` | Base nginx configuration |
| `nginx/templates/*.conf.template` | Domain-specific nginx configs (including optional relay subdomain) |
| `scripts/deploy.sh` | Automated deployment script |
| `.env.example` | Environment variable template |

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
