#!/usr/bin/env bash
# Start Metro with a tunnel so the installed dev-client build can reach it from
# a phone on a different network — which is the normal case here, because the
# dev server runs inside WSL and is not on the phone's LAN.
source ~/.nvm/nvm.sh
cd /home/mshin/helloaura/leen-coffee/apps/customer-mobile
exec npx expo start --tunnel --dev-client --clear
