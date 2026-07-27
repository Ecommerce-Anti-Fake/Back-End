#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_DIR}"

if [[ ! -f .env ]]; then
  echo "Missing ${REPO_DIR}/.env" >&2
  exit 1
fi

git pull --ff-only
npm ci
npm run prisma:merge
npx prisma generate
npx nest build api-gateway
npx prisma migrate deploy
pm2 startOrReload ecosystem.config.cjs --env production --update-env
pm2 save
