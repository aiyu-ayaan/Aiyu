#!/bin/sh
# Container entrypoint for the Next.js standalone server.
#
# When RUN_MIGRATIONS=true (and DATABASE_URL is set) it applies any pending
# Prisma migrations with `prisma migrate deploy` before starting the app.
# Invoked via `node` directly so it works inside the slim standalone image
# without relying on the node_modules/.bin symlink.
set -e

if [ "${RUN_MIGRATIONS}" = "true" ] && [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] Applying Prisma migrations (migrate deploy)..."
  if node node_modules/prisma/build/index.js migrate deploy; then
    echo "[entrypoint] Migrations applied."
  else
    echo "[entrypoint] WARNING: migrate deploy failed; starting app anyway." >&2
  fi
fi

echo "[entrypoint] Starting Next.js server..."
exec node server.js
