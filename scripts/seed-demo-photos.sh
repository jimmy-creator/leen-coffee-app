#!/usr/bin/env bash
#
# Replace the generated placeholder artwork with real CC0 photography.
#
#   SUPABASE_URL=https://<ref>.supabase.co \
#   SUPABASE_SERVICE_KEY=sb_secret_... \
#   scripts/seed-demo-photos.sh [--keep]
#
# --keep skips rows that already have a photograph.
set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${SUPABASE_SERVICE_KEY:?set SUPABASE_SERVICE_KEY — the service role / secret key, never committed}"

cd "$(dirname "$0")/.."
node scripts/seed-demo-photos.mjs "$@"
