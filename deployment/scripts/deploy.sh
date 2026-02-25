#!/bin/bash

# Colors for output
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'
log() { echo -e "${G}[+]${N} $1"; }
err() { echo -e "${R}[!]${N} $1"; exit 1; }  # trap will ensure services start
warn() { echo -e "${Y}[!]${N} $1"; }
info() { echo -e "${B}[*]${N} $1"; }

# Ensure services are always running on exit (even if script fails)
cleanup_and_start() {
    local exit_code=$?
    cd ~/pengui/deployment 2>/dev/null || true
    
    if [ $exit_code -ne 0 ]; then
        warn "Deployment encountered errors (exit code: $exit_code)"
        warn "Ensuring services are running anyway..."
    fi
    
    # Always try to ensure services are running
    # Start pengui if not running
    if ! docker compose ps pengui 2>/dev/null | grep -q "Up\|running"; then
        docker compose up -d pengui 2>/dev/null || true
    fi
    
    # Start relay services if not running
    if [ -n "${SPLASH_RELAY_IMAGE:-}" ]; then
        docker compose up -d splash-relay splash-relay-testnet 2>/dev/null || true
    fi
    # Start nginx if not running, or reload if it is
    if docker compose ps nginx 2>/dev/null | grep -q "Up\|running"; then
        docker compose exec -T nginx nginx -s reload 2>/dev/null || true
    else
        docker compose up -d nginx 2>/dev/null || true
    fi
    
    # Show final status
    info "Final container status:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || true
    
    exit $exit_code
}

trap cleanup_and_start EXIT

# Verify Docker Compose V2 is available
if ! docker compose version &> /dev/null; then
    err "Docker Compose V2 not found. Please install: https://docs.docker.com/compose/install/"
fi
log "Docker Compose: $(docker compose version --short)"

# Change to deployment directory
cd ~/pengui/deployment

log "Starting deployment for ${DOMAIN:-'unknown domain'}..."

# Validate required environment secrets
[ -z "$GITHUB_ACTOR" ] && err "GITHUB_ACTOR environment secret is required"

# Validate required environment variables
[ -z "$DOMAIN" ] && err "DOMAIN environment variable is required"
[ -z "$DOCKER_IMAGE" ] && err "DOCKER_IMAGE environment variable is required"
[ -z "$EMAIL" ] && err "EMAIL environment variable is required"
[ -z "$STAGING" ] && err "STAGING environment variable is required"

# Create required directories
log "Creating directories..."
mkdir -p certbot/{conf,www} nginx/conf.d

# Login to GitHub Container Registry if credentials provided
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_ACTOR" ]; then
    log "Logging into GitHub Container Registry..."
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin || warn "Registry login failed"
fi

# Check SSL certificate status
CERT="certbot/conf/live/$DOMAIN/fullchain.pem"
NEED_CERT=false

if [ -f "$CERT" ]; then
    # Check certificate expiration
    EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT" 2>/dev/null | cut -d= -f2)
    if [ -n "$EXPIRY_DATE" ]; then
        EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null)
        CURRENT_EPOCH=$(date +%s)
        DAYS=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
        
        if [ $DAYS -gt 30 ]; then
            log "SSL certificate valid ($DAYS days remaining)"
        else
            warn "SSL certificate expires in $DAYS days - will renew"
            NEED_CERT=true
        fi
    else
        warn "Could not check certificate expiry - will request new one"
        NEED_CERT=true
    fi
else
    log "No SSL certificate found - will request one"
    NEED_CERT=true
fi

# Optional: extra -d for relay subdomains (so cert covers wss://relay subdomain)
CERTBOT_RELAY_DOMAINS=""
[ -n "${RELAY_MAINNET_SUBDOMAIN:-}" ] && CERTBOT_RELAY_DOMAINS="$CERTBOT_RELAY_DOMAINS -d $RELAY_MAINNET_SUBDOMAIN"
[ -n "${RELAY_TESTNET_SUBDOMAIN:-}" ] && CERTBOT_RELAY_DOMAINS="$CERTBOT_RELAY_DOMAINS -d $RELAY_TESTNET_SUBDOMAIN"

# Request SSL certificate if needed
if [ "$NEED_CERT" = true ]; then
    log "Setting up SSL certificate..."
    
    # Create ACME challenge directory
    mkdir -p certbot/www/.well-known/acme-challenge
    
    # Copy HTTP-only config for ACME challenge (atomic write)
    cp nginx/templates/http-only.conf.template nginx/conf.d/default.conf.tmp
    mv nginx/conf.d/default.conf.tmp nginx/conf.d/default.conf
    
    # Pull and start services for certificate request
    log "Starting services for ACME challenge..."
    docker compose pull pengui || true
    docker compose up -d pengui
    sleep 5
    docker compose up -d nginx
    sleep 5
    
    # Verify ACME challenge path is accessible
    log "Verifying ACME challenge path..."
    echo "acme-test" > certbot/www/.well-known/acme-challenge/test
    if curl -sf --max-time 5 "http://$DOMAIN/.well-known/acme-challenge/test" | grep -q "acme-test"; then
        log "ACME challenge path verified"
        rm -f certbot/www/.well-known/acme-challenge/test
    else
        warn "ACME challenge path may not be accessible - continuing anyway"
    fi
    
    # Determine staging flag
    STAGING_ARG=""
    [ "${STAGING:-0}" != "0" ] && STAGING_ARG="--staging" && warn "Using Let's Encrypt staging environment"
    
    # Request certificate using docker run directly (more reliable output)
    log "Requesting SSL certificate from Let's Encrypt..."
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        -w /var/www/certbot \
        $STAGING_ARG \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        $CERTBOT_RELAY_DOMAINS \
        --rsa-key-size 4096 \
        --agree-tos \
        --non-interactive || err "Failed to obtain SSL certificate"
    
    log "SSL certificate obtained successfully"
fi

# Apply HTTPS configuration (atomic write to prevent serving incomplete config)
log "Configuring nginx with HTTPS..."
envsubst '${DOMAIN}' < nginx/templates/https.conf.template > nginx/conf.d/default.conf.tmp
mv nginx/conf.d/default.conf.tmp nginx/conf.d/default.conf

# Optional: relay subdomain WebSocket proxy (when RELAY_MAINNET_SUBDOMAIN or RELAY_TESTNET_SUBDOMAIN is set)
rm -f nginx/conf.d/relay.conf
if [ -n "${RELAY_MAINNET_SUBDOMAIN:-}" ] || [ -n "${RELAY_TESTNET_SUBDOMAIN:-}" ]; then
    log "Configuring nginx relay subdomain(s)..."
    [ -n "${RELAY_MAINNET_SUBDOMAIN:-}" ] && envsubst '${DOMAIN} ${RELAY_MAINNET_SUBDOMAIN}' < nginx/templates/relay-mainnet.conf.template >> nginx/conf.d/relay.conf
    [ -n "${RELAY_TESTNET_SUBDOMAIN:-}" ] && envsubst '${DOMAIN} ${RELAY_TESTNET_SUBDOMAIN}' < nginx/templates/relay-testnet.conf.template >> nginx/conf.d/relay.conf
fi

# Pull latest Docker image
if [ -n "$DOCKER_IMAGE" ]; then
    log "Pulling Docker image: $DOCKER_IMAGE"
    docker compose pull pengui || err "Failed to pull Docker image"
fi

# Zero-downtime deployment: start new containers before stopping old ones
log "Deploying with zero-downtime strategy..."

# Pull new images first (while old containers still running)
log "Pulling latest images..."
docker compose pull pengui || warn "Failed to pull pengui image"
if [ -n "${SPLASH_RELAY_IMAGE:-}" ]; then
    docker compose pull splash-relay splash-relay-testnet || warn "Failed to pull splash-relay image(s)"
fi

log "Updating pengui application..."
docker compose up -d --no-deps --wait pengui || warn "Pengui update had issues"

# Start relay services when using registry image
if [ -n "${SPLASH_RELAY_IMAGE:-}" ]; then
    log "Starting splash-relay services..."
    docker compose up -d splash-relay splash-relay-testnet || warn "Splash relay start had issues"
fi

# Check if pengui is healthy
if docker compose ps pengui | grep -q "Up\|running\|healthy"; then
    log "Next.js container is running"
else
    warn "Next.js container may still be starting"
    docker compose logs --tail=10 pengui || true
fi

# Update nginx - reload config if running, otherwise start it
log "Updating nginx..."
if docker compose ps nginx 2>/dev/null | grep -q "Up\|running"; then
    # Nginx is running - just reload config (no restart = no downtime)
    docker compose exec -T nginx nginx -s reload || docker compose up -d --no-deps nginx
else
    # Nginx not running - start it
    docker compose up -d --no-deps nginx || warn "Nginx start had issues"
fi

# Clean up any orphaned containers
docker compose up -d --remove-orphans 2>/dev/null || true

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 10

# Quick verification (non-blocking)
if docker compose ps pengui 2>/dev/null | grep -q "Up\|running"; then
    log "Next.js application is running"
else
    warn "Next.js container may still be starting"
fi

if docker compose ps nginx 2>/dev/null | grep -q "Up\|running"; then
    log "Nginx is running"
else
    warn "Nginx container may still be starting"
fi

# Quick health check (don't block on HTTPS issues)
if curl -sf --max-time 5 "http://localhost/api/health" >/dev/null 2>&1; then
    log "Health check passed (HTTP)"
elif curl -sf --max-time 5 "https://$DOMAIN/api/health" >/dev/null 2>&1; then
    log "Health check passed (HTTPS)"
else
    warn "Health check pending - containers may still be initializing"
fi

# Show running containers
info "Container status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}"

# Set up certificate renewal cron job (runs daily at 3 AM)
CRON_CMD="0 3 * * * cd $HOME/pengui/deployment && docker compose --profile certbot run --rm certbot renew --quiet && docker compose exec -T nginx nginx -s reload >/dev/null 2>&1"
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    log "Setting up automatic certificate renewal cron job..."
    (crontab -l 2>/dev/null || true; echo "$CRON_CMD") | crontab -
    log "Certificate renewal cron job added (daily at 3 AM)"
else
    log "Certificate renewal cron job already exists"
fi

log "=== Deployment complete ==="
log "Site: https://$DOMAIN"
log "Health: https://$DOMAIN/api/health"

# Explicit exit to ensure script terminates
exit 0
