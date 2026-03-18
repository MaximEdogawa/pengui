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
    
    # Start relay if not running
    if [ -n "${SPLASH_RELAY_IMAGE:-}" ]; then
        docker compose up -d splash-relay 2>/dev/null || true
    fi
    # Nginx (relay-coupled watchdog)
    # Respect RELAY_WATCHDOG if set by deploy logic (rollback uses 0).
    export RELAY_WATCHDOG="${RELAY_WATCHDOG:-1}"
    docker compose build nginx 2>/dev/null || true
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
    # ACME: nginx without relay watchdog (relay may not exist yet)
    docker compose build nginx || true
    RELAY_WATCHDOG=0 docker compose up -d --no-deps nginx
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
    # When adding relay subdomains to an existing cert, expand it non-interactively
    CERTBOT_EXPAND=""
    [ -n "$CERTBOT_RELAY_DOMAINS" ] && CERTBOT_EXPAND="--expand"
    
    # Request certificate using docker run directly (more reliable output)
    log "Requesting SSL certificate from Let's Encrypt..."
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        -w /var/www/certbot \
        $STAGING_ARG \
        $CERTBOT_EXPAND \
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

# Optional: relay subdomain WebSocket proxy (when RELAY_MAINNET_SUBDOMAIN is set)
rm -f nginx/conf.d/relay.conf
if [ -n "${RELAY_MAINNET_SUBDOMAIN:-}" ]; then
    log "Configuring nginx relay subdomain..."
    envsubst '${DOMAIN} ${RELAY_MAINNET_SUBDOMAIN}' < nginx/templates/relay-mainnet.conf.template >> nginx/conf.d/relay.conf
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
    docker compose pull splash-relay || warn "Failed to pull splash-relay image"
fi

# Capture currently-running images for rollback protection
OLD_DOCKER_IMAGE="$(docker inspect pengui-app --format '{{.Config.Image}}' 2>/dev/null || true)"
OLD_SPLASH_RELAY_IMAGE="$(docker inspect pengui-splash-relay --format '{{.Config.Image}}' 2>/dev/null || true)"
if [ -z "$OLD_DOCKER_IMAGE" ]; then
    warn "No previous pengui-app image found for rollback."
fi
if [ -z "$OLD_SPLASH_RELAY_IMAGE" ]; then
    warn "No previous pengui-splash-relay image found for rollback."
fi

log "Updating pengui application..."
docker compose up -d --no-deps --wait pengui || warn "Pengui update had issues"

  # Start relay service when using registry image
if [ -n "${SPLASH_RELAY_IMAGE:-}" ]; then
    log "Starting splash-relay service..."
    docker compose up -d splash-relay || warn "Splash relay start had issues"
    info "splash-relay logging level: ${RUST_LOG:-info} (set RUST_LOG=debug in .env for verbose relay logs)"

    # Wait for stable relay health and detect restart loops.
    # If relay keeps restarting, rollback to previous images and fail the pipeline.
    initial_restart_count="$(docker inspect pengui-splash-relay --format '{{.RestartCount}}' 2>/dev/null || echo 0)"
    last_observed_restart_count="$initial_restart_count"
    deploy_window_seconds=120
    poll_interval_seconds=3
    rounds=$((deploy_window_seconds / poll_interval_seconds))

    for wait_round in $(seq 1 $rounds); do
        relay_restart_count="$(docker inspect pengui-splash-relay --format '{{.RestartCount}}' 2>/dev/null || echo 0)"
        relay_state="$(docker inspect pengui-splash-relay --format '{{.State.Status}}' 2>/dev/null || echo unknown)"
        relay_health="$(docker inspect pengui-splash-relay --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' 2>/dev/null || echo none)"

        if [ "$relay_restart_count" != "$last_observed_restart_count" ]; then
            warn "splash-relay restart detected: from=$last_observed_restart_count to=$relay_restart_count state=$relay_state health=$relay_health"
            last_observed_restart_count="$relay_restart_count"
        fi

        if [ "$relay_health" = "healthy" ]; then
            log "splash-relay is healthy (restarts during window: $((relay_restart_count - initial_restart_count)))"
            break
        fi

        # Restart loop threshold: fail when restarts increase too much during deploy.
        # Tune this number based on how often the relay legitimately restarts.
        if [ $((relay_restart_count - initial_restart_count)) -ge 3 ]; then
            warn "splash-relay entered a restart loop during deploy window."
            warn "initial_restart_count=$initial_restart_count current=$relay_restart_count state=$relay_state health=$relay_health"

            if [ -n "$OLD_SPLASH_RELAY_IMAGE" ]; then
                warn "Rolling back to previous relay image: $OLD_SPLASH_RELAY_IMAGE"
                export SPLASH_RELAY_IMAGE="$OLD_SPLASH_RELAY_IMAGE"
            fi
            if [ -n "$OLD_DOCKER_IMAGE" ]; then
                warn "Rolling back to previous pengui image: $OLD_DOCKER_IMAGE"
                export DOCKER_IMAGE="$OLD_DOCKER_IMAGE"
            fi

            # Ensure nginx doesn't exit while relay is unavailable during rollback.
            export RELAY_WATCHDOG=0
            docker compose up -d --no-deps pengui splash-relay nginx 2>/dev/null || true

            err "Relay health failed (restart loop detected). Deployment rolled back and pipeline failed."
        fi

        # If container is gone/exited and no health yet, keep waiting a bit, but break early on hard failures.
        if [ "$relay_state" = "exited" ] || [ "$relay_state" = "dead" ]; then
            warn "splash-relay container state is $relay_state (health=$relay_health)."
        fi

        sleep $poll_interval_seconds
    done

    # Final health check after deploy window
    relay_health="$(docker inspect pengui-splash-relay --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' 2>/dev/null || echo none)"
    if [ "$relay_health" != "healthy" ]; then
        warn "splash-relay did not become healthy within deploy window. health=$relay_health"
        if [ -n "$OLD_SPLASH_RELAY_IMAGE" ]; then
            warn "Rolling back to previous relay image: $OLD_SPLASH_RELAY_IMAGE"
            export SPLASH_RELAY_IMAGE="$OLD_SPLASH_RELAY_IMAGE"
        fi
        if [ -n "$OLD_DOCKER_IMAGE" ]; then
            warn "Rolling back to previous pengui image: $OLD_DOCKER_IMAGE"
            export DOCKER_IMAGE="$OLD_DOCKER_IMAGE"
        fi
        export RELAY_WATCHDOG=0
        docker compose up -d --no-deps pengui splash-relay nginx 2>/dev/null || true
        docker compose logs splash-relay --tail 200 2>/dev/null || true
        err "Relay health failed (not healthy). Deployment rolled back and pipeline failed."
    fi

    info "splash-relay recent logs (last 200 lines):"
    docker compose logs splash-relay --tail 200 2>/dev/null || true
fi

# Check if pengui is healthy
if docker compose ps pengui | grep -q "Up\|running\|healthy"; then
    log "Next.js container is running"
else
    warn "Next.js container may still be starting"
    docker compose logs --tail=10 pengui || true
fi

# Update nginx - rebuild image, then relay-coupled mode (exits if relay dies)
log "Updating nginx..."
docker compose build nginx || warn "Nginx image build had issues"
export RELAY_WATCHDOG=1
if docker compose ps nginx 2>/dev/null | grep -q "Up\|running"; then
    docker compose exec -T nginx nginx -s reload 2>/dev/null || true
    docker compose up -d --no-deps nginx || warn "Nginx restart had issues"
else
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
