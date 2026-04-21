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
    
    # Start relays if not running
    if [ -n "${SPLASH_RELAY_IMAGE:-}" ]; then
        docker compose up -d splash-relay 2>/dev/null || true
        docker compose up -d splash-relay-testnet 2>/dev/null || true
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

# Validate required environment secrets
[ -z "$GITHUB_ACTOR" ] && err "GITHUB_ACTOR environment secret is required"

# Validate required environment variables
[ -z "$DOMAIN" ] && err "DOMAIN environment variable is required"
# Trim spaces/newlines; lowercase so apex pairing matches regardless of .env casing
DOMAIN="$(printf '%s' "$DOMAIN" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr '[:upper:]' '[:lower:]')"
[ -z "$DOMAIN" ] && err "DOMAIN is empty after trim"

# Optional second apex on the same certificate (e.g. DOMAIN=penguinpool.space DOMAIN2=pengine.net).
_DOMAIN2_RAW="${DOMAIN2:-}"
DOMAIN2=""
if [ -n "$_DOMAIN2_RAW" ]; then
    DOMAIN2="$(printf '%s' "$_DOMAIN2_RAW" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr '[:upper:]' '[:lower:]')"
    [ -z "$DOMAIN2" ] && err "DOMAIN2 is empty after trim"
    [ "$DOMAIN2" = "$DOMAIN" ] && err "DOMAIN2 must differ from DOMAIN (both are ${DOMAIN})"
fi

if [ -n "$DOMAIN2" ]; then
    log "Starting deployment for ${DOMAIN} + ${DOMAIN2}..."
else
    log "Starting deployment for ${DOMAIN}..."
fi

[ -z "$DOCKER_IMAGE" ] && err "DOCKER_IMAGE environment variable is required"
[ -z "$EMAIL" ] && err "EMAIL environment variable is required"
[ -z "$STAGING" ] && err "STAGING environment variable is required"

# Multi-SAN cert: optional extra hostnames (space-separated). Production apex pair (penguinpool.space ↔ pengine.net)
# is merged into one Let’s Encrypt cert when either name is DOMAIN (empty CERT_EXTRA_DOMAINS no longer drops the sibling).
# Opt out: CERT_SKIP_PENGINE_SAN=1.
CERT_EXTRA_DOMAINS="${CERT_EXTRA_DOMAINS:-}"
cert_extra_contains() {
    local h="$1"
    echo " $CERT_EXTRA_DOMAINS " | grep -qF " $h "
}
append_cert_extra() {
    local h="$1"
    cert_extra_contains "$h" && return
    CERT_EXTRA_DOMAINS="${CERT_EXTRA_DOMAINS:+${CERT_EXTRA_DOMAINS} }$h"
    log "Including $h in Let’s Encrypt SANs alongside ${DOMAIN}"
}
[ -n "$DOMAIN2" ] && append_cert_extra "$DOMAIN2"

[ -n "${CERT_SKIP_PENGINE_SAN:-}" ] && warn "CERT_SKIP_PENGINE_SAN is set — sibling apex will not be added to the certificate"
if [ -z "${CERT_SKIP_PENGINE_SAN:-}" ]; then
    case "${DOMAIN}" in
        penguinpool.space) append_cert_extra "pengine.net" ;;
        pengine.net)       append_cert_extra "penguinpool.space" ;;
    esac
fi

# Default Splash relay subdomains for Penguin Pool production (deduped with RELAY_*_SUBDOMAIN / CERT_EXTRA_DOMAINS).
# Let's Encrypt will validate each name — DNS must point here. Opt out: CERT_SKIP_PENGUINPOOL_RELAY_SAN=1.
[ -n "${CERT_SKIP_PENGUINPOOL_RELAY_SAN:-}" ] && warn "CERT_SKIP_PENGUINPOOL_RELAY_SAN is set — default relay subdomains will not be added to the certificate"
if [ "${DOMAIN}" = "penguinpool.space" ] && [ -z "${CERT_SKIP_PENGUINPOOL_RELAY_SAN:-}" ]; then
    append_cert_extra "relay.penguinpool.space"
    append_cert_extra "relay-testnet.penguinpool.space"
fi

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

# Extra `-d` flags for certbot (relays, DOMAIN2, CERT_EXTRA_DOMAINS, sibling apex). Primary name is always `-d "$DOMAIN"` below.
CERTBOT_EXTRA_D_ARGS=""
CERTBOT_EXTRA_NAMES=""
add_cert_name() {
    local n="$1"
    [ -z "$n" ] && return
    n="$(printf '%s' "$n" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr '[:upper:]' '[:lower:]')"
    [ -z "$n" ] && return
    case " $CERTBOT_EXTRA_NAMES " in *" $n "*) return ;; esac
    CERTBOT_EXTRA_NAMES="$CERTBOT_EXTRA_NAMES $n"
    CERTBOT_EXTRA_D_ARGS="$CERTBOT_EXTRA_D_ARGS -d $n"
}
[ -n "${RELAY_MAINNET_SUBDOMAIN:-}" ] && add_cert_name "$RELAY_MAINNET_SUBDOMAIN"
[ -n "${RELAY_TESTNET_SUBDOMAIN:-}" ] && add_cert_name "$RELAY_TESTNET_SUBDOMAIN"
for _extra in $CERT_EXTRA_DOMAINS; do
    add_cert_name "$_extra"
done
# Ensure DOMAIN2 is always on the cert when set (does not rely only on CERT_EXTRA_DOMAINS iteration).
[ -n "$DOMAIN2" ] && add_cert_name "$DOMAIN2"

# If DOMAIN cert exists but a configured hostname is missing from SAN (e.g. new DOMAIN2, relay, or sibling apex), expand
if [ "$NEED_CERT" = false ] && [ -f "$CERT" ]; then
    for SAN in $DOMAIN ${DOMAIN2:+$DOMAIN2} $CERTBOT_EXTRA_NAMES; do
        [ -z "$SAN" ] && continue
        if ! openssl x509 -in "$CERT" -noout -text 2>/dev/null | grep -Fq "DNS:${SAN}"; then
            warn "Certificate missing SAN for ${SAN} — will request expanded certificate"
            NEED_CERT=true
            break
        fi
    done
fi

# Force new/expanded certificate (e.g. GitHub Actions "Run workflow" → need_cert)
# GitHub may pass boolean as "true", "True", etc.; certbot otherwise often refuses with "not yet due".
NEED_CERT_FORCE_FLAG="false"
case "${NEED_CERT_FORCE:-}" in
    true|True|1|yes|on) NEED_CERT_FORCE_FLAG="true" ;;
esac
if [ "$NEED_CERT_FORCE_FLAG" = "true" ]; then
    NEED_CERT=true
    log "NEED_CERT_FORCE set — will request SSL certificate (with --force-renewal for certbot)"
fi

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
        log "ACME challenge path verified (http://$DOMAIN)"
        rm -f certbot/www/.well-known/acme-challenge/test
    else
        warn "ACME challenge path may not be accessible - continuing anyway"
    fi
    if [ -n "$DOMAIN2" ]; then
        echo "acme-test" > certbot/www/.well-known/acme-challenge/test
        if curl -sf --max-time 5 "http://$DOMAIN2/.well-known/acme-challenge/test" | grep -q "acme-test"; then
            log "ACME challenge path verified (http://$DOMAIN2)"
        else
            warn "ACME challenge for DOMAIN2 ($DOMAIN2) not reachable — HTTP-01 for that name may fail"
        fi
        rm -f certbot/www/.well-known/acme-challenge/test
    fi
    
    # Determine staging flag
    STAGING_ARG=""
    [ "${STAGING:-0}" != "0" ] && STAGING_ARG="--staging" && warn "Using Let's Encrypt staging environment"
    # When adding names to an existing lineage, expand non-interactively (any extra -d beyond DOMAIN)
    CERTBOT_EXPAND=""
    if [ -n "$CERTBOT_EXTRA_D_ARGS" ]; then
        CERTBOT_EXPAND="--expand"
    fi
    # Same SANs but operator forced renew: certbot otherwise exits with "not yet due for renewal"
    CERTBOT_FORCE_RENEWAL=""
    [ "$NEED_CERT_FORCE_FLAG" = "true" ] && CERTBOT_FORCE_RENEWAL="--force-renewal"
    
    # Request certificate using docker run directly (more reliable output)
    log "Requesting SSL certificate from Let's Encrypt..."
    if [ -n "$CERTBOT_EXTRA_D_ARGS" ]; then
        log "Certbot SANs: ${DOMAIN}$(echo "$CERTBOT_EXTRA_D_ARGS" | sed 's/ -d / + /g')"
    else
        log "Certbot SANs: ${DOMAIN}"
    fi
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        -w /var/www/certbot \
        $STAGING_ARG \
        $CERTBOT_EXPAND \
        $CERTBOT_FORCE_RENEWAL \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        $CERTBOT_EXTRA_D_ARGS \
        --rsa-key-size 4096 \
        --agree-tos \
        --non-interactive || err "Failed to obtain SSL certificate"
    
    log "SSL certificate obtained successfully"
fi

# Apply HTTPS configuration (atomic write to prevent serving incomplete config)
log "Configuring nginx with HTTPS..."
# Hostnames served by this Pengui vhost (same TLS lineage: live/$DOMAIN/)
HTTPS_SERVER_NAMES="$DOMAIN"
[ -n "$DOMAIN2" ] && HTTPS_SERVER_NAMES="$DOMAIN $DOMAIN2"
export HTTPS_SERVER_NAMES
envsubst '${DOMAIN} ${HTTPS_SERVER_NAMES}' < nginx/templates/https.conf.template > nginx/conf.d/default.conf.tmp
mv nginx/conf.d/default.conf.tmp nginx/conf.d/default.conf

# Optional: relay subdomain WebSocket proxies (when RELAY_*_SUBDOMAIN vars are set)
rm -f nginx/conf.d/relay.conf
if [ -n "${RELAY_MAINNET_SUBDOMAIN:-}" ]; then
    log "Configuring nginx mainnet relay subdomain..."
    envsubst '${DOMAIN} ${RELAY_MAINNET_SUBDOMAIN}' < nginx/templates/relay-mainnet.conf.template >> nginx/conf.d/relay.conf
fi
if [ -n "${RELAY_TESTNET_SUBDOMAIN:-}" ]; then
    log "Configuring nginx testnet relay subdomain..."
    envsubst '${DOMAIN} ${RELAY_TESTNET_SUBDOMAIN}' < nginx/templates/relay-testnet.conf.template >> nginx/conf.d/relay.conf
fi

rm -f nginx/conf.d/pengine.conf

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
if [ "${PENGINE_ENABLE:-0}" = "1" ]; then
    docker compose pull pengine-web 2>/dev/null || warn "Failed to pull Pengine image"
fi

log "Updating pengui application..."
docker compose up -d --no-deps --wait pengui || warn "Pengui update had issues"

log "Starting splash-relay service..."
docker compose up -d --no-deps --wait splash-relay || err "splash-relay failed to become healthy"
log "Starting splash-relay-testnet service..."
docker compose up -d --no-deps --wait splash-relay-testnet || warn "splash-relay-testnet failed to become healthy (non-fatal)"

log "Starting nginx..."
export RELAY_WATCHDOG=1
docker compose up -d --no-deps --wait nginx || err "nginx failed to become healthy"

# Reload nginx to apply updated configs from mounted templates.
docker compose exec -T nginx nginx -s reload 2>/dev/null || true

# Pengine on the same stack + network as nginx (no separate compose / external network)
if [ "${PENGINE_ENABLE:-0}" = "1" ]; then
    log "Starting Pengine web (compose profile pengine)..."
    docker compose --profile pengine up -d pengine-web || warn "Pengine web failed to start (registry auth or PENGINE_WEB_IMAGE)"
fi

info "Container status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || true

if curl -sf --max-time 5 "https://$DOMAIN/api/health" >/dev/null 2>&1; then
    log "Health check passed (HTTPS)"
else
    warn "Health check pending - containers may still be initializing"
fi

log "=== Deployment complete ==="
log "Site: https://$DOMAIN"
[ -n "$DOMAIN2" ] && log "Site: https://$DOMAIN2 (shared TLS lineage: $DOMAIN)"
log "Health: https://$DOMAIN/api/health"

exit 0
