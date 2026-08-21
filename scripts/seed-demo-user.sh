#!/usr/bin/env bash
#
# Create/reset the demo customer account.
#
# Sign in with +966 50 000 0000 and code 123456. The number is registered as a
# Supabase test OTP, so it never reaches an SMS provider — no Twilio needed.
#
#   SUPABASE_URL=https://<ref>.supabase.co \
#   SUPABASE_SERVICE_KEY=sb_secret_... \
#   scripts/seed-demo-user.sh
set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${SUPABASE_SERVICE_KEY:?set SUPABASE_SERVICE_KEY — the service role / secret key, never committed}"

cd "$(dirname "$0")/.."
node scripts/seed-demo-user.mjs
