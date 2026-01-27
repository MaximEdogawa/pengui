#!/bin/bash
set -e

# Colors
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; N='\033[0m'
log() { echo -e "${G}[+]${N} $1"; }
err() { echo -e "${R}[!]${N} $1"; exit 1; }
warn() { echo -e "${Y}[!]${N} $1"; }

cd ~/pengui/deployment

log "Deploying $DOMAIN..."

# Create directories
mkdir -p certbot/{conf,www} nginx/conf.d

# Check SSL certificate
CERT="certbot/conf/live/$DOMAIN/fullchain.pem"
NEED_CERT=false

if [ -f "$CERT" ]; then
    DAYS=$(( ($(date -d "$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)" +%s) - $(date +%s)) / 86400 ))
    if [ $DAYS -gt 30 ]; then
        log "SSL valid ($DAYS days left)"
    else
        warn "SSL expires in $DAYS days - renewing"
        NEED_CERT=true
    fi
else
    log "No SSL certificate - requesting one"
    NEED_CERT=true
fi

# Request certificate if needed
if [ "$NEED_CERT" = true ]; then
    log "Setting up SSL..."
    
    # HTTP config for ACME challenge
    envsubst '${DOMAIN}' < nginx/templates/http-only.conf.template > nginx/conf.d/default.conf
    docker-compose up -d nginx
    sleep 5
    
    # Request cert
    STAGING_ARG=""; [ "${STAGING:-0}" != "0" ] && STAGING_ARG="--staging"
    docker-compose run --rm certbot certonly \
        --webroot -w /var/www/certbot \
        $STAGING_ARG --email "$EMAIL" \
        -d "$DOMAIN" -d "www.$DOMAIN" \
        --rsa-key-size 4096 --agree-tos --non-interactive --force-renewal || err "Certificate failed"
    
    log "Certificate obtained"
fi

# Apply HTTPS config
log "Configuring HTTPS..."
envsubst '${DOMAIN}' < nginx/templates/https.conf.template > nginx/conf.d/default.conf

# Pull latest image
[ ! -z "$DOCKER_IMAGE" ] && log "Pulling image..." && docker-compose pull pengui-data

# Start all services
log "Starting services..."
docker-compose up -d

# Verify
sleep 3
docker-compose ps nginx | grep -q "Up" && log "✓ Nginx running" || err "Nginx failed"
curl -sf --max-time 10 "https://$DOMAIN" >/dev/null 2>&1 && log "✓ HTTPS working" || warn "HTTPS check failed"

log "=== Deployment complete ==="
log "🌐 https://$DOMAIN"