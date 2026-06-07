#!/usr/bin/env bash
# deploy-guard.sh — backstop against the v2.5.2-over-v2.7.x regression (2026-06-07).
#
# THE BUG IT PREVENTS: a stale local working copy being deployed on top of newer
# live work, silently overwriting it. The deployed `main` is the source of truth,
# NOT this iCloud copy — they can drift if another session edited live.
#
# WHAT IT DOES: compares the APP_VERSION in the local sub-timer.html against the
# version currently live at the production URL. Refuses (exit 1) if live >= local,
# because that means you're about to ship an OLDER or equal build over a newer one.
#
# USAGE:
#   ./deploy-guard.sh                 # check the local source vs live; exit 0 = safe to deploy
#   ./deploy-guard.sh path/to.html    # check a specific file
#
# Run this BEFORE every push. It is a backstop, not a substitute for the
# sync-first rule in DEPLOY.md — always reconcile with live main first.

set -euo pipefail

SRC="${1:-sub-timer.html}"
LIVE_URL="https://sub-timer.vercel.app"

if [[ ! -f "$SRC" ]]; then
  echo "✗ source file not found: $SRC" >&2
  exit 2
fi

# Extract a version string like "v2.7.94-beta" → "2.7.94" (drop leading v + -beta/-anything suffix)
extract_ver() {
  grep -oE "APP_VERSION='v[0-9]+\.[0-9]+\.[0-9]+[^']*'" "$1" \
    | head -1 \
    | sed -E "s/.*'v([0-9]+\.[0-9]+\.[0-9]+).*/\1/"
}

LOCAL_VER="$(extract_ver "$SRC" || true)"
LIVE_RAW="$(curl -s "${LIVE_URL}/?cb=$(date +%s)" | grep -oE "APP_VERSION='v[0-9]+\.[0-9]+\.[0-9]+[^']*'" | head -1 || true)"
LIVE_VER="$(echo "$LIVE_RAW" | sed -E "s/.*'v([0-9]+\.[0-9]+\.[0-9]+).*/\1/" || true)"

if [[ -z "$LOCAL_VER" ]]; then
  echo "✗ couldn't read APP_VERSION from $SRC" >&2
  exit 2
fi
if [[ -z "$LIVE_VER" ]]; then
  echo "⚠ couldn't read live version from $LIVE_URL (network? first deploy?) — proceed with manual care." >&2
  echo "  local = v$LOCAL_VER"
  exit 0
fi

# Return 0 if $1 > $2 (strict), using sort -V. Equal versions are NOT greater.
ver_gt() {
  [[ "$1" == "$2" ]] && return 1
  [[ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -1)" == "$1" ]]
}

echo "  local = v$LOCAL_VER"
echo "  live  = v$LIVE_VER"

if ver_gt "$LOCAL_VER" "$LIVE_VER"; then
  echo "✓ SAFE: local (v$LOCAL_VER) is newer than live (v$LIVE_VER). OK to deploy."
  exit 0
else
  echo ""
  echo "✗ ABORT — local (v$LOCAL_VER) is NOT newer than live (v$LIVE_VER)."
  echo "  Deploying would overwrite newer or equal work on the live site."
  echo "  → Pull the live main, reconcile your changes onto it, bump the version, then retry."
  echo "  (See DEPLOY.md for the sync-first procedure.)"
  exit 1
fi
