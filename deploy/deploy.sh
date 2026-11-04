#!/usr/bin/env bash
# Build the client and (re)start the API under PM2. Safe to run again after every `git pull`.
#   cd /opt/fleettrack && bash deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -d .git ] && [ "${NO_PULL:-0}" != "1" ]; then
  git pull --ff-only || echo "(git pull skipped)"
fi

echo "==> Installing server dependencies"
npm ci --prefix server --omit=dev

echo "==> Building client"
npm ci --prefix client
npm run build --prefix client

echo "==> Starting API (serves the client build too)"
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save >/dev/null

echo "Done. Health: curl -s http://127.0.0.1:5000/api/v1/health"
