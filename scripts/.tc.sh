#!/usr/bin/env bash
set -uo pipefail
source ~/.nvm/nvm.sh
ROOT=/home/mshin/helloaura/leen-coffee
status=0
for d in customer-mobile merchant-mobile delivery-mobile; do
  echo "===== ${d} ====="
  cd "${ROOT}/apps/${d}"
  npx tsc --noEmit || status=1
done
exit "${status}"
