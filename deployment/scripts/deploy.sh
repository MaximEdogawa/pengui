#!/bin/bash
set -e

# Colors for output
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'
log() { echo -e "${G}[+]${N} $1"; }
err() { echo -e "${R}[!]${N} $1"; exit 1; }
warn() { echo -e "${Y}[!]${N} $1"; }
info() { echo -e "${B}[*]${N} $1"; }

# Verify Docker Compose V2 is available
if ! docker compose version &> /dev/null; then
    err "Docker Compose V2 not found. Please install: https://docs.docker.com/compose/install/"
fi
log "Docker Compose: $(docker compose version --short)"

# Change to deployment directory
cd ~/pengui/deployment

log "Starting deployment for ${DOMAIN:-'unknown domain'}..."

# Validate required environment variables
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
    docker compose pull pengui || true
    docker compose up -d pengui
    sleep 5
    docker compose up -d nginx
    sleep 10
    
    # Determine staging flag
    STAGING_ARG=""
    [ "${STAGING:-0}" != "0" ] && STAGING_ARG="--staging" && warn "Using Let's Encrypt staging environment"
    
    # Request certificate
    log "Requesting SSL certificate from Let's Encrypt..."
    docker compose run --rm certbot certonly \
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
    docker compose pull pengui || err "Failed to pull Docker image"
fi

# Start/restart all services
log "Stopping existing services..."
docker compose down --remove-orphans 2>/dev/null || true

log "Starting Next.js application..."
docker compose up -d pengui
sleep 5

# Check if pengui started
if docker compose ps pengui | grep -q "Up\|running"; then
    log "✓ Next.js container started"
    # Show logs for debugging if health check might fail
    log "Application logs (last 10 lines):"
    docker compose logs --tail=10 pengui || true
else
    err "Failed to start Next.js container. Logs:"
    docker compose logs pengui || true
fi

log "Starting nginx..."
docker compose up -d nginx

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 10

# Verify deployment
RETRIES=5
RETRY_DELAY=5

for i in $(seq 1 $RETRIES); do
    # Check nginx
    if docker compose ps nginx | grep -q "Up\|running"; then
        log "✓ Nginx is running"
    else
        warn "Nginx not ready (attempt $i/$RETRIES)"
        sleep $RETRY_DELAY
        continue
    fi
    
    # Check Next.js app
    if docker compose ps pengui | grep -q "Up\|running"; then
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
docker compose ps

log "=== Deployment complete ==="
log "🌐 https://$DOMAIN"
log "📊 Health: https://$DOMAIN/api/health"
