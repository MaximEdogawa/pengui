#!/bin/sh
# Repair Certbot archive/live version skew for one certificate lineage.
#
# Certbot stores each issuance as archive/<name>/privkeyN.pem (N = 1, 2, …)
# and live/<name>/privkey.pem is a symlink to the current N.
# The next renewal writes N+1. If a previous run left files at N+1 without
# updating the live symlink, Certbot fails with:
#   FileExistsError: .../privkeyN.pem
#
# Usage (normally via Docker as root — archive/ is often mode 700 root-owned):
#   repair-certbot-archive.sh <lineage> [conflict_version]
#
# Examples:
#   repair-certbot-archive.sh penguinpool.space
#   repair-certbot-archive.sh penguinpool.space 8
#
# Env:
#   LETSENCRYPT_DIR  Root of the Certbot tree (default: /etc/letsencrypt)

set -eu

LINEAGE="${1:-}"
CONFLICT_VER="${2:-}"
LE_DIR="${LETSENCRYPT_DIR:-/etc/letsencrypt}"

if [ -z "$LINEAGE" ]; then
    echo "usage: $0 <lineage> [conflict_version]" >&2
    exit 2
fi

LIVE_KEY="$LE_DIR/live/$LINEAGE/privkey.pem"
LIVE_DIR="$LE_DIR/live/$LINEAGE"
ARCHIVE="$LE_DIR/archive/$LINEAGE"

if [ ! -d "$ARCHIVE" ]; then
    echo "No archive dir for $LINEAGE — nothing to repair"
    exit 0
fi

# --- helpers ---------------------------------------------------------------

version_from_privkey_path() {
    # .../privkey7.pem → 7
    basename "$1" | sed -n 's/^privkey\([0-9][0-9]*\)\.pem$/\1/p'
}

remove_archive_version() {
    ver="$1"
    reason="$2"
    [ -n "$ver" ] || return 0
    if [ -n "${LIVE_VER:-}" ] && [ "$ver" = "$LIVE_VER" ]; then
        echo "Won't remove version $ver yet — live still points at it"
        return 1
    fi
    rm -f \
        "$ARCHIVE/privkey${ver}.pem" \
        "$ARCHIVE/cert${ver}.pem" \
        "$ARCHIVE/chain${ver}.pem" \
        "$ARCHIVE/fullchain${ver}.pem"
    echo "Removed archive version $ver ($reason)"
}

retarget_live_to() {
    ver="$1"
    [ -f "$ARCHIVE/privkey${ver}.pem" ] && [ -f "$ARCHIVE/fullchain${ver}.pem" ] || return 1
    ln -sfn "../../archive/$LINEAGE/privkey${ver}.pem" "$LIVE_DIR/privkey.pem"
    ln -sfn "../../archive/$LINEAGE/cert${ver}.pem" "$LIVE_DIR/cert.pem"
    ln -sfn "../../archive/$LINEAGE/chain${ver}.pem" "$LIVE_DIR/chain.pem"
    ln -sfn "../../archive/$LINEAGE/fullchain${ver}.pem" "$LIVE_DIR/fullchain.pem"
    LIVE_VER="$ver"
    echo "Pointed live/ → archive version $ver"
}

# --- 1) What does live currently use? --------------------------------------

LIVE_VER=""
if [ -L "$LIVE_KEY" ]; then
    TARGET=$(readlink "$LIVE_KEY")
    LIVE_VER=$(printf '%s' "$TARGET" | sed -n 's/.*privkey\([0-9][0-9]*\)\.pem$/\1/p')
    echo "live privkey → version ${LIVE_VER:-unknown} ($TARGET)"
elif [ -e "$LIVE_KEY" ]; then
    echo "live privkey is not a symlink — skipping live-based orphan scan"
else
    echo "No live privkey for $LINEAGE"
fi

# --- 2) Delete orphan versions above live (failed prior runs) --------------

if [ -n "$LIVE_VER" ]; then
    for f in "$ARCHIVE"/privkey*.pem; do
        [ -e "$f" ] || continue
        ver=$(version_from_privkey_path "$f")
        [ -n "$ver" ] || continue
        if [ "$ver" -gt "$LIVE_VER" ] 2>/dev/null; then
            remove_archive_version "$ver" "orphan above live" || true
        fi
    done
fi

# --- 3) Delete the exact version from FileExistsError (if given) -----------

if [ -n "$CONFLICT_VER" ]; then
    if ! remove_archive_version "$CONFLICT_VER" "FileExistsError conflict"; then
        # live points at the conflict slot — step back to the newest older complete set
        prev=""
        for f in "$ARCHIVE"/privkey*.pem; do
            [ -e "$f" ] || continue
            ver=$(version_from_privkey_path "$f")
            [ -n "$ver" ] || continue
            if [ "$ver" -lt "$CONFLICT_VER" ] 2>/dev/null; then
                if [ -z "$prev" ] || [ "$ver" -gt "$prev" ] 2>/dev/null; then
                    prev="$ver"
                fi
            fi
        done
        if [ -n "$prev" ] && retarget_live_to "$prev"; then
            remove_archive_version "$CONFLICT_VER" "FileExistsError after live retarget" || true
        else
            echo "Could not move live away from conflict version $CONFLICT_VER" >&2
            exit 1
        fi
    fi
fi

echo -n "Archive privkeys now: "
for f in "$ARCHIVE"/privkey*.pem; do
    [ -e "$f" ] || continue
    printf '%s ' "$(basename "$f")"
done
echo
