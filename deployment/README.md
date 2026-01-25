# Deployment Guide

This directory contains all necessary files for deploying Pengui to production using Docker.

## Quick Start

### Prerequisites

- Docker and Docker Compose installed on the production server
- SSH access to the server
- GitHub token with read access to `ghcr.io`
- Environment variables configured in GitHub Secrets

### Deployment Flow

1. **Create a Release** in GitHub with a version tag (e.g., `v1.0.0`)
2. **Automated Pipeline Triggers:**
   - Builds Docker image from `deployment/Dockerfile`
   - Pushes to GitHub Container Registry
   - Deploys to production server via SSH
   - Creates `.env` from `PRODUCTION_ENV` secret
   - Runs Docker Compose to start the application
   - Performs health check

## Files

### `Dockerfile`

Multi-stage production Docker image using Bun runtime. Features:

- Optimized for performance with minimal size
- Non-root user for security
- Health checks built-in
- Proper signal handling with dumb-init

### `docker-compose.yml`

Orchestrates the Pengui application container with:

- Automatic restart policy
- Health checks
- Volume and network management
- Logging configuration

### `.env.example`

Template for environment variables. Copy to `.env.production` and fill in actual values.

## Server Setup

### Initial Setup (First Time Only)

1. SSH into the server:

```bash
ssh user@server
```

2. Create deployment directory:

```bash
mkdir -p /pengui
cd /pengui
```

3. Create GitHub token for Docker login:

```bash
# Generate a GitHub PAT with read access to packages
# Store in a secure location
```

4. Copy `docker-compose.yml` and `.env.example`:

```bash
# Copy files from this repository to /var/pengui/
cp deployment/docker-compose.yml /pengui/
touch /pengui/.env
```

5. Edit `.env` with actual production values:

```bash
nano .env
```

### GitHub Secrets Configuration

Set these in your repository settings under **Settings → Secrets and variables → Actions**:

| Secret Name      | Description                                 | Example                      |
| ---------------- | ------------------------------------------- | ---------------------------- |
| `DEPLOY_HOST`    | Production server hostname                  | `deploy.example.com`         |
| `DEPLOY_USER`    | SSH user                                    | `deploy`                     |
| `DEPLOY_SSH_KEY` | Private SSH key for authentication          | _(multiline)_                |
| `DEPLOY_PORT`    | SSH port (optional, defaults to 22)         | `22`                         |
| `DEPLOY_URL`     | Application URL for status updates          | `https://pengui.example.com` |
| `PRODUCTION_ENV` | Environment variables for `.env.production` | `NODE_ENV=production...`     |

#### Creating SSH Key Pair

```bash
# On your local machine
ssh-keygen -t ed25519 -f deploy_key -C "GitHub Actions"

# Copy public key to server
ssh-copy-id -i deploy_key.pub user@server

# Add private key to GitHub Secret (deploy_key content)
```

#### Creating PRODUCTION_ENV Secret

Combine all environment variables in a single multiline secret:

```
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Manual Deployment (Fallback)

If automated deployment fails:

```bash
cd /pengui

# Login to GitHub Container Registry
docker login ghcr.io

# Pull the latest image
docker pull ghcr.io/pengui:v1.0.0

# Update and restart
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Troubleshooting

### Application won't start

```bash
# Check logs
docker-compose logs pengui

# Check health status
docker ps | grep pengui
docker inspect pengui --format='{{.State.Health.Status}}'
```

### Health check failing

```bash
# Test manually
curl http://localhost:3000

# Check container logs
docker logs pengui --tail 50
```

### Port already in use

```bash
# Find what's using port 3000
lsof -i :3000

# Or change port in docker-compose.yml
# Then restart: docker-compose down && docker-compose up -d
```

### Rollback to previous version

```bash
cd /var/pengui

# List available images
docker images | grep pengui

# Run previous version
docker-compose down
export APP_VERSION=v0.9.0  # Set to previous version
docker-compose up -d
```

## Monitoring

### View application logs

```bash
docker-compose logs -f pengui
```

### Check resource usage

```bash
docker stats pengui
```

### Database connections (if applicable)

```bash
docker-compose exec pengui curl -s http://localhost:3000/health
```

## Updating Environment Variables

1. Update the `PRODUCTION_ENV` secret in GitHub
2. Create and publish a new release tag
3. The deployment pipeline will automatically use the new environment variables

Or manually:

```bash
cd /pengui
nano .env
docker-compose down && docker-compose up -d
```

## Cleanup

Remove old Docker images to save space:

```bash
# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Aggressive cleanup (be careful!)
docker system prune -a --volumes
```
