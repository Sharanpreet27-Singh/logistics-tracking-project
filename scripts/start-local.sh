#!/usr/bin/env bash
# Starts FleetTrack for local development on macOS / Linux: API, client and GPS simulator in one
# terminal. Ctrl+C stops all three. Needs Node 18+ and a configured MySQL demo database.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d server/node_modules ]; then
  echo "Installing dependencies for the first time..."
  npm install
  npm run setup
fi
[ -f server/.env ] || cp server/.env.example server/.env
[ -f client/.env ] || cp client/.env.example client/.env

npm run db:init
echo "Sign in at http://localhost:5173 with admin@fleet.com / Admin@123"
echo "First time? Seed demo data in another terminal:  npm run seed"
exec npm run dev:all
