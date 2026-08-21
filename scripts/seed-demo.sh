#!/usr/bin/env bash
#
# Populate the demo catalogue against the linked Supabase project.
#
# Needs the service role key, which is not in the repo — take it from the
# dashboard (Settings → API → secret key) for a one-off run:
#
#   SUPABASE_URL=https://<ref>.supabase.co \
#   SUPABASE_SERVICE_KEY=sb_secret_... \
#   scripts/seed-demo.sh
#
# Safe to re-run: roasteries match on name, coffees on (roastery, name).
set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${SUPABASE_SERVICE_KEY:?set SUPABASE_SERVICE_KEY — the service role / secret key, never committed}"

cd "$(dirname "$0")/.."
node scripts/seed-demo-catalogue.mjs
