#!/bin/bash
set -e

# Colors for output
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'
log() { echo -e "${G}[+]${N} $1"; }
err() { echo -e "${R}[!]${N} $1"; exit 1; }
warn() { echo -e "${Y}[!]${N} $1"; }
info() { echo -e "${B}[*]${N} $1"; }

# Detect docker-compose command and create wrapper function
# v1 standalone: docker-compose
# v2 plugin: docker compose
detect_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        log "Using: docker-compose (standalone v1)"
        dc() { docker-compose "$@"; }
    elif docker compose version &> /dev/null 2>&1; then
        log "Using: docker compose (plugin v2)"
        dc() { docker compose "$@"; }
    else
        err "Docker Compose not found. Please install docker-compose or the Docker Compose plugin."
    fi
}
detect_docker_compose

# Change to deployment directory
cd ~/pengui/deployment

log "Starting deployment for ${DOMAIN:-'unknown domain'}..."

# Validate required environment sectets
[ -z "$GITHUB_TOKEN" ] && err "GITHUB_TOKEN environment sectets is required"
[ -z "$GITHUB_ACTOR" ] && err "GITHUB_ACTOR environment sectets is required"


# Validate required environment variables
[ -z "$DOCKER_IMAGE" ] && err "DOCKER_IMAGE environment variable is required"
[ -z "$DOMAIN" ] && err "DOMAIN environment variable is required"
[ -z "$DOMAIN" ] && err "DOMAIN environment variable is required"
[ -z "$EMAIL" ] && err "EMAIL environment variable is required"

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

# Request SSL certificate if needed
if [ "$NEED_CERT" = true ]; then
    log "Setting up SSL certificate..."
    
    # Generate HTTP-only config for ACME challenge
    envsubst '${DOMAIN}' < nginx/templates/http-only.conf.template > nginx/conf.d/default.conf
    
    # Pull and start nginx for certificate request
    log "Starting nginx for ACME challenge..."
    dc pull pengui || true
    dc up -d pengui
    sleep 5
    dc up -d nginx
    sleep 10
    
    # Determine staging flag
    STAGING_ARG=""
    [ "${STAGING:-0}" != "0" ] && STAGING_ARG="--staging" && warn "Using Let's Encrypt staging environment"
    
    # Request certificate
    log "Requesting SSL certificate from Let's Encrypt..."
    dc run --rm certbot certonly \
        --webroot \
        -w /var/www/certbot \
        $STAGING_ARG \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --rsa-key-size 4096 \
        --agree-tos \
        --non-interactive \
        --force-renewal || err "Failed to obtain SSL certificate"
    
    log "SSL certificate obtained successfully"
fi

# Apply HTTPS configuration
log "Configuring nginx with HTTPS..."
envsubst '${DOMAIN}' < nginx/templates/https.conf.template > nginx/conf.d/default.conf

# Pull latest Docker image
if [ -n "$DOCKER_IMAGE" ]; then
    log "Pulling Docker image: $DOCKER_IMAGE"
    dc pull pengui || err "Failed to pull Docker image"
fi

# Start/restart all services
log "Starting services..."
dc down --remove-orphans 2>/dev/null || true
dc up -d

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 10

# Verify deployment
RETRIES=5
RETRY_DELAY=5

for i in $(seq 1 $RETRIES); do
    # Check nginx
    if dc ps nginx | grep -q "Up\|running"; then
        log "✓ Nginx is running"
    else
        warn "Nginx not ready (attempt $i/$RETRIES)"
        sleep $RETRY_DELAY
        continue
    fi
    
    # Check Next.js app
    if dc ps pengui | grep -q "Up\|running"; then
        log "✓ Next.js application is running"
    else
        warn "Next.js app not ready (attempt $i/$RETRIES)"
        sleep $RETRY_DELAY
        continue
    fi
    
    # Check HTTPS endpoint
    if curl -sf --max-time 10 "https://$DOMAIN/api/health" >/dev/null 2>&1; then
        log "✓ HTTPS endpoint responding"
        break
    else
        warn "HTTPS check failed (attempt $i/$RETRIES)"
        [ $i -eq $RETRIES ] && warn "HTTPS verification failed - check logs"
        sleep $RETRY_DELAY
    fi
done

# Show running containers
info "Container status:"
dc ps

log "=== Deployment complete ==="
log "🌐 https://$DOMAIN"
log "📊 Health: https://$DOMAIN/api/health"
