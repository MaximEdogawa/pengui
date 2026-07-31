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

# =============================================================================
# SSL / Let's Encrypt
# =============================================================================
# 1. Collect hostnames (SANs) for the cert
# 2. Drop any that have no public DNS (NXDOMAIN would fail HTTP-01)
# 3. Decide if we need to issue/renew
# 4. If yes: HTTP-01 nginx → repair archive orphans → certbot (+ one retry)
# Helper for step 4 orphans: scripts/repair-certbot-archive.sh
# =============================================================================

CERT="certbot/conf/live/$DOMAIN/fullchain.pem"
NEED_CERT=false
NEED_CERT_FORCE_FLAG="false"
CERTBOT_EXTRA_NAMES=""
CERTBOT_EXTRA_D_ARGS=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Root-owned live certs: try openssl, then passwordless sudo (sudoers.d/pengui-deploy).
openssl_cert() {
    openssl "$@" 2>/dev/null && return 0
    command -v sudo >/dev/null 2>&1 && sudo -n openssl "$@" 2>/dev/null && return 0
    return 1
}

cert_exists() { [ -f "$CERT" ] || [ -e "$CERT" ]; }

normalize_host() {
    printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr '[:upper:]' '[:lower:]'
}

# --- helpers: SAN list -------------------------------------------------------

add_cert_name() {
    local n
    n="$(normalize_host "${1:-}")"
    [ -z "$n" ] && return
    case " $CERTBOT_EXTRA_NAMES " in *" $n "*) return ;; esac
    CERTBOT_EXTRA_NAMES="$CERTBOT_EXTRA_NAMES $n"
    CERTBOT_EXTRA_D_ARGS="$CERTBOT_EXTRA_D_ARGS -d $n"
}

cert_hostname_resolves() {
    local h="$1"
    if command -v getent >/dev/null 2>&1; then
        [ -n "$(getent ahosts "$h" 2>/dev/null | head -n1)" ] && return 0
        return 1
    fi
    if command -v host >/dev/null 2>&1; then
        host -W 3 "$h" 2>/dev/null | grep -Eq 'has (IPv6 )?address'
        return $?
    fi
    warn "No getent/host — cannot preflight DNS for $h; keeping it on the cert request"
    return 0
}

drop_hostname_if_not_on_cert() {
    # Clear an env hostname when DNS preflight removed it from the cert request.
    local var="$1" host
    host="$(normalize_host "${!var:-}")"
    [ -z "$host" ] && return
    case " $CERTBOT_EXTRA_NAMES " in
        *" $host "*) ;;
        *)
            warn "$var ($host) omitted from TLS — clearing for this deploy"
            printf -v "$var" '%s' ""
            ;;
    esac
}

# Run repair-certbot-archive.sh as root inside Docker (archive/ is usually mode 700).
repair_certbot_archive() {
    local lineage="$1" conflict_ver="${2:-}"
    local repair_script="$SCRIPT_DIR/repair-certbot-archive.sh"
    [ -f "$repair_script" ] || { warn "Missing $repair_script"; return 1; }
    log "Repairing Certbot archive for $lineage${conflict_ver:+ (conflict v$conflict_ver)}..."
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$repair_script:/repair-certbot-archive.sh:ro" \
        alpine:3.20 \
        sh /repair-certbot-archive.sh "$lineage" "$conflict_ver" \
        || warn "Archive repair failed (continuing)"
}

run_certbot_certonly() {
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        -w /var/www/certbot \
        $STAGING_ARG \
        $CERTBOT_EXPAND \
        $CERTBOT_FORCE_RENEWAL \
        --cert-name "$DOMAIN" \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        $CERTBOT_EXTRA_D_ARGS \
        --rsa-key-size 4096 \
        --agree-tos \
        --non-interactive
}

# --- 1) Collect SANs ---------------------------------------------------------

[ -n "${RELAY_MAINNET_SUBDOMAIN:-}" ] && add_cert_name "$RELAY_MAINNET_SUBDOMAIN"
[ -n "${RELAY_TESTNET_SUBDOMAIN:-}" ] && add_cert_name "$RELAY_TESTNET_SUBDOMAIN"
for _extra in $CERT_EXTRA_DOMAINS; do
    add_cert_name "$_extra"
done
[ -n "$DOMAIN2" ] && add_cert_name "$DOMAIN2"

# --- 2) Drop SANs without public DNS -----------------------------------------

if [ -n "$CERTBOT_EXTRA_NAMES" ]; then
    _keep_names=""
    _keep_args=""
    for n in $CERTBOT_EXTRA_NAMES; do
        if cert_hostname_resolves "$n"; then
            _keep_names="${_keep_names} $n"
            _keep_args="${_keep_args} -d $n"
        else
            warn "Skipping $n — no DNS A/AAAA. Add DNS, then redeploy with need_cert to include it."
        fi
    done
    CERTBOT_EXTRA_NAMES="${_keep_names# }"
    CERTBOT_EXTRA_D_ARGS="$_keep_args"
    unset _keep_names _keep_args
fi

# nginx must not advertise hostnames that are not on the cert
if [ -n "$DOMAIN2" ]; then
    case " $CERTBOT_EXTRA_NAMES " in
        *" $DOMAIN2 "*) ;;
        *)
            warn "DOMAIN2 ($DOMAIN2) omitted from TLS — clearing for this deploy"
            DOMAIN2=""
            ;;
    esac
fi
drop_hostname_if_not_on_cert RELAY_MAINNET_SUBDOMAIN
drop_hostname_if_not_on_cert RELAY_TESTNET_SUBDOMAIN

# --- 3) Do we need to issue/renew? -------------------------------------------

if cert_exists; then
    EXPIRY_DATE=$(openssl_cert x509 -enddate -noout -in "$CERT" | cut -d= -f2)
    if [ -n "$EXPIRY_DATE" ]; then
        EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null)
        DAYS=$(( (EXPIRY_EPOCH - $(date +%s)) / 86400 ))
        if [ "$DAYS" -gt 30 ]; then
            log "SSL certificate valid ($DAYS days remaining)"
        else
            warn "SSL certificate expires in $DAYS days — will renew"
            NEED_CERT=true
        fi
    else
        warn "Could not check certificate expiry — will request a new one"
        NEED_CERT=true
    fi
else
    log "No SSL certificate found — will request one"
    NEED_CERT=true
fi

# Expand if any requested hostname is missing from the live cert
if [ "$NEED_CERT" = false ] && cert_exists; then
    for SAN in $DOMAIN ${DOMAIN2:+$DOMAIN2} $CERTBOT_EXTRA_NAMES; do
        [ -z "$SAN" ] && continue
        if ! openssl_cert x509 -in "$CERT" -noout -text | grep -Fq "DNS:${SAN}"; then
            warn "Certificate missing SAN for ${SAN} — will request expanded certificate"
            NEED_CERT=true
            break
        fi
    done
fi

case "${NEED_CERT_FORCE:-}" in
    true|True|1|yes|on)
        NEED_CERT_FORCE_FLAG="true"
        NEED_CERT=true
        log "NEED_CERT_FORCE set — will request cert with --force-renewal"
        ;;
esac

# Shrinking the SAN list (e.g. dropped relay-testnet) needs --force-renewal
if [ "$NEED_CERT" = true ] && cert_exists && [ "$NEED_CERT_FORCE_FLAG" != "true" ]; then
    _live_sans=$(openssl_cert x509 -in "$CERT" -noout -text \
        | grep -oE 'DNS:[^,[:space:]]+' | sed 's/^DNS://' | tr '[:upper:]' '[:lower:]' || true)
    for _ls in $_live_sans; do
        case " $DOMAIN $CERTBOT_EXTRA_NAMES " in
            *" $_ls "*) ;;
            *)
                NEED_CERT_FORCE_FLAG="true"
                log "Live cert still has $_ls (not in this request) — using --force-renewal"
                break
                ;;
        esac
    done
    unset _live_sans _ls
fi

# --- 4) Issue / renew --------------------------------------------------------

if [ "$NEED_CERT" = true ]; then
    log "Setting up SSL certificate..."
    mkdir -p certbot/www/.well-known/acme-challenge

    # Temporary HTTP-only nginx so Let's Encrypt can fetch the ACME challenge
    cp nginx/templates/http-only.conf.template nginx/conf.d/default.conf.tmp
    mv nginx/conf.d/default.conf.tmp nginx/conf.d/default.conf

    log "Starting services for ACME challenge..."
    docker compose pull pengui || true
    docker compose up -d pengui
    sleep 5
    docker compose build nginx || true
    RELAY_WATCHDOG=0 docker compose up -d --no-deps nginx
    sleep 5

    log "Verifying ACME challenge path..."
    echo "acme-test" > certbot/www/.well-known/acme-challenge/test
    if curl -sf --max-time 5 "http://$DOMAIN/.well-known/acme-challenge/test" | grep -q "acme-test"; then
        log "ACME challenge path verified (http://$DOMAIN)"
    else
        warn "ACME challenge path may not be accessible — continuing anyway"
    fi
    rm -f certbot/www/.well-known/acme-challenge/test
    if [ -n "$DOMAIN2" ]; then
        echo "acme-test" > certbot/www/.well-known/acme-challenge/test
        if curl -sf --max-time 5 "http://$DOMAIN2/.well-known/acme-challenge/test" | grep -q "acme-test"; then
            log "ACME challenge path verified (http://$DOMAIN2)"
        else
            warn "ACME challenge for DOMAIN2 ($DOMAIN2) not reachable — HTTP-01 for that name may fail"
        fi
        rm -f certbot/www/.well-known/acme-challenge/test
    fi

    STAGING_ARG=""
    [ "${STAGING:-0}" != "0" ] && STAGING_ARG="--staging" && warn "Using Let's Encrypt staging"
    CERTBOT_EXPAND=""
    [ -n "$CERTBOT_EXTRA_D_ARGS" ] && CERTBOT_EXPAND="--expand"
    CERTBOT_FORCE_RENEWAL=""
    [ "$NEED_CERT_FORCE_FLAG" = "true" ] && CERTBOT_FORCE_RENEWAL="--force-renewal"

    repair_certbot_archive "$DOMAIN"

    log "Requesting SSL certificate from Let's Encrypt..."
    if [ -n "$CERTBOT_EXTRA_D_ARGS" ]; then
        log "Certbot SANs: ${DOMAIN}$(echo "$CERTBOT_EXTRA_D_ARGS" | sed 's/ -d / + /g')"
    else
        log "Certbot SANs: ${DOMAIN}"
    fi

    CERTBOT_LOG=$(mktemp)
    run_certbot_certonly >"$CERTBOT_LOG" 2>&1
    CERTBOT_RC=$?
    cat "$CERTBOT_LOG"
    if [ "$CERTBOT_RC" -ne 0 ]; then
        if grep -q 'FileExistsError' "$CERTBOT_LOG"; then
            CONFLICT_VER=$(sed -n 's/.*privkey\([0-9][0-9]*\)\.pem.*/\1/p' "$CERTBOT_LOG" | head -n1)
            warn "Certbot FileExistsError — repair archive (v${CONFLICT_VER:-?}) and retry once"
            repair_certbot_archive "$DOMAIN" "$CONFLICT_VER"
            if ! run_certbot_certonly; then
                rm -f "$CERTBOT_LOG"
                err "Failed to obtain SSL certificate"
            fi
        else
            rm -f "$CERTBOT_LOG"
            err "Failed to obtain SSL certificate"
        fi
    fi
    rm -f "$CERTBOT_LOG"
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
