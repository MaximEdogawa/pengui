#!/bin/sh
# Repair Certbot archive/live consistency for one certificate lineage.
#
# Layout Certbot expects:
#   live/<lineage>/privkey.pem  →  ../../archive/<lineage>/privkeyN.pem
#   archive/<lineage>/privkeyN.pem, certN.pem, chainN.pem, fullchainN.pem
#
# Problems this script fixes:
#   1. Cross-lineage symlink — live points at archive/<other>/ (e.g. name-0001)
#      while --cert-name uses archive/<lineage>/. Causes FileNotFoundError.
#   2. Orphan archive versions above the live slot — causes FileExistsError.
#   3. Optional conflict version from a Certbot error message.
#
# Usage (run as root, usually via Docker):
#   repair-certbot-archive.sh <lineage> [conflict_version]
#
# Env:
#   LETSENCRYPT_DIR  default /etc/letsencrypt

set -eu

LINEAGE="${1:-}"
CONFLICT_VER="${2:-}"
LE_DIR="${LETSENCRYPT_DIR:-/etc/letsencrypt}"

if [ -z "$LINEAGE" ]; then
    echo "usage: $0 <lineage> [conflict_version]" >&2
    exit 2
fi

LIVE_DIR="$LE_DIR/live/$LINEAGE"
LIVE_KEY="$LIVE_DIR/privkey.pem"
ARCHIVE="$LE_DIR/archive/$LINEAGE"

# --- helpers ---------------------------------------------------------------

version_from_privkey_name() {
    basename "$1" | sed -n 's/^privkey\([0-9][0-9]*\)\.pem$/\1/p'
}

# Newest N that has a complete set (privkey + fullchain) in ARCHIVE.
newest_complete_version() {
    newest=""
    for f in "$ARCHIVE"/privkey*.pem; do
        [ -e "$f" ] || continue
        ver=$(version_from_privkey_name "$f")
        [ -n "$ver" ] || continue
        [ -f "$ARCHIVE/fullchain${ver}.pem" ] || continue
        if [ -z "$newest" ] || [ "$ver" -gt "$newest" ] 2>/dev/null; then
            newest="$ver"
        fi
    done
    printf '%s' "$newest"
}

retarget_live_to() {
    ver="$1"
    [ -n "$ver" ] || return 1
    [ -f "$ARCHIVE/privkey${ver}.pem" ] && [ -f "$ARCHIVE/fullchain${ver}.pem" ] || return 1
    mkdir -p "$LIVE_DIR"
    ln -sfn "../../archive/$LINEAGE/privkey${ver}.pem" "$LIVE_DIR/privkey.pem"
    ln -sfn "../../archive/$LINEAGE/cert${ver}.pem" "$LIVE_DIR/cert.pem"
    ln -sfn "../../archive/$LINEAGE/chain${ver}.pem" "$LIVE_DIR/chain.pem"
    ln -sfn "../../archive/$LINEAGE/fullchain${ver}.pem" "$LIVE_DIR/fullchain.pem"
    LIVE_VER="$ver"
    LIVE_ARCHIVE_NAME="$LINEAGE"
    echo "Pointed live/$LINEAGE → archive/$LINEAGE version $ver"
}

remove_archive_version() {
    ver="$1"
    reason="$2"
    [ -n "$ver" ] || return 0
    if [ -n "${LIVE_VER:-}" ] && [ "$LIVE_ARCHIVE_NAME" = "$LINEAGE" ] && [ "$ver" = "$LIVE_VER" ]; then
        echo "Won't remove version $ver yet — live still points at it"
        return 1
    fi
    rm -f \
        "$ARCHIVE/privkey${ver}.pem" \
        "$ARCHIVE/cert${ver}.pem" \
        "$ARCHIVE/chain${ver}.pem" \
        "$ARCHIVE/fullchain${ver}.pem"
    echo "Removed archive/$LINEAGE version $ver ($reason)"
}

# --- 0) Ensure archive dir for this lineage exists ---------------------------

if [ ! -d "$ARCHIVE" ]; then
    echo "No archive/$LINEAGE — nothing to repair for this cert-name"
    exit 0
fi

# --- 1) Inspect live symlink -------------------------------------------------

LIVE_VER=""
LIVE_ARCHIVE_NAME=""
TARGET=""

if [ -L "$LIVE_KEY" ]; then
    TARGET=$(readlink "$LIVE_KEY")
    LIVE_VER=$(printf '%s' "$TARGET" | sed -n 's/.*privkey\([0-9][0-9]*\)\.pem$/\1/p')
    # ../../archive/<name>/privkeyN.pem → <name>
    LIVE_ARCHIVE_NAME=$(printf '%s' "$TARGET" | sed -n 's|.*/archive/\([^/]*\)/privkey[0-9][0-9]*\.pem$|\1|p')
    echo "live privkey → archive/${LIVE_ARCHIVE_NAME:-?}/privkey${LIVE_VER:-?}.pem ($TARGET)"
elif [ -e "$LIVE_KEY" ]; then
    echo "live privkey is not a symlink — leaving as-is"
else
    echo "No live/$LINEAGE/privkey.pem yet"
fi

# --- 2) Fix cross-lineage symlink (the FileNotFoundError case) -------------
# Certbot --cert-name $LINEAGE always reads/writes archive/$LINEAGE/.
# If live points at archive/other-name/, retarget to newest set in archive/$LINEAGE.

if [ -n "$LIVE_ARCHIVE_NAME" ] && [ "$LIVE_ARCHIVE_NAME" != "$LINEAGE" ]; then
    echo "MISMATCH: live/$LINEAGE points at archive/$LIVE_ARCHIVE_NAME but cert-name uses archive/$LINEAGE"
    fix_ver=$(newest_complete_version)
    if [ -n "$fix_ver" ]; then
        retarget_live_to "$fix_ver"
    else
        echo "No complete cert set in archive/$LINEAGE — cannot retarget" >&2
        exit 1
    fi
fi

# Broken / missing target inside the correct archive (version number from live
# but file absent) — also retarget to newest complete set.
if [ -n "$LIVE_VER" ] && [ "$LIVE_ARCHIVE_NAME" = "$LINEAGE" ]; then
    if [ ! -f "$ARCHIVE/privkey${LIVE_VER}.pem" ]; then
        echo "MISSING: archive/$LINEAGE/privkey${LIVE_VER}.pem (live points here)"
        fix_ver=$(newest_complete_version)
        if [ -n "$fix_ver" ]; then
            retarget_live_to "$fix_ver"
        else
            echo "No complete cert set in archive/$LINEAGE — cannot retarget" >&2
            exit 1
        fi
    fi
fi

# If live is missing but archive has certs, wire live up (cert_exists can work again).
if [ ! -e "$LIVE_KEY" ] && [ ! -L "$LIVE_KEY" ]; then
    fix_ver=$(newest_complete_version)
    if [ -n "$fix_ver" ]; then
        echo "live/$LINEAGE missing but archive has version $fix_ver — linking"
        retarget_live_to "$fix_ver"
    fi
fi

# --- 3) Orphans above live (only when live is in THIS archive) -------------

if [ -n "$LIVE_VER" ] && [ "$LIVE_ARCHIVE_NAME" = "$LINEAGE" ]; then
    for f in "$ARCHIVE"/privkey*.pem; do
        [ -e "$f" ] || continue
        ver=$(version_from_privkey_name "$f")
        [ -n "$ver" ] || continue
        if [ "$ver" -gt "$LIVE_VER" ] 2>/dev/null; then
            remove_archive_version "$ver" "orphan above live" || true
        fi
    done
fi

# --- 4) Explicit conflict version (from Certbot error) ---------------------

if [ -n "$CONFLICT_VER" ]; then
    if ! remove_archive_version "$CONFLICT_VER" "Certbot conflict"; then
        prev=""
        for f in "$ARCHIVE"/privkey*.pem; do
            [ -e "$f" ] || continue
            ver=$(version_from_privkey_name "$f")
            [ -n "$ver" ] || continue
            if [ "$ver" -lt "$CONFLICT_VER" ] 2>/dev/null; then
                if [ -z "$prev" ] || [ "$ver" -gt "$prev" ] 2>/dev/null; then
                    prev="$ver"
                fi
            fi
        done
        if [ -n "$prev" ] && retarget_live_to "$prev"; then
            remove_archive_version "$CONFLICT_VER" "conflict after live retarget" || true
        else
            echo "Could not clear conflict version $CONFLICT_VER" >&2
            exit 1
        fi
    fi
fi

echo -n "Archive/$LINEAGE privkeys: "
for f in "$ARCHIVE"/privkey*.pem; do
    [ -e "$f" ] || continue
    printf '%s ' "$(basename "$f")"
done
echo
if [ -L "$LIVE_KEY" ]; then
    echo "live/$LINEAGE/privkey.pem → $(readlink "$LIVE_KEY")"
fi
