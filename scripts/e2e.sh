#!/usr/bin/env bash
#
# Run the end-to-end checkout test against the linked Supabase project.
#
# Needs the service role key, which is not in the repo — read it from your
# environment, or pull it from the dashboard (Settings → API) for a one-off run:
#
#   SUPABASE_URL=https://<ref>.supabase.co \
#   SUPABASE_ANON_KEY=sb_publishable_... \
#   SUPABASE_SERVICE_KEY=sb_secret_... \
#   scripts/e2e.sh
#
set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY}"
: "${SUPABASE_SERVICE_KEY:?set SUPABASE_SERVICE_KEY — the service role / secret key, never committed}"

cd "$(dirname "$0")/.."
node scripts/e2e-order.mjs
