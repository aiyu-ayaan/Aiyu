#!/bin/sh
# Container entrypoint for the Next.js standalone server.
#
# When RUN_MIGRATIONS=true (and DATABASE_URL is set) it applies any pending
# Prisma migrations with `prisma migrate deploy` before starting the app.
# The CLI lives in an isolated /app/prisma-cli/node_modules (with its full
# @prisma/config -> effect/c12 dependency closure) so it resolves its own deps
# and cannot shadow the app's runtime node_modules. Invoked via `node` directly
# so it works inside the slim standalone image without a .bin symlink.
set -e

if [ "${RUN_MIGRATIONS}" = "true" ] && [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] Applying Prisma migrations (migrate deploy)..."
  if node /app/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=/app/prisma/schema.prisma; then
    echo "[entrypoint] Migrations applied."
  else
    echo "[entrypoint] WARNING: migrate deploy failed; starting app anyway." >&2
  fi
fi

# Seed the database when RUN_SEED is set. "auto" (the recommended value) only
# seeds a database that is still empty, so restarting an existing deployment
# never wipes content; "force" re-runs the destructive base seeder.
if [ -n "${RUN_SEED}" ] && [ "${RUN_SEED}" != "false" ] && [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] Running seed bootstrap (RUN_SEED=${RUN_SEED})..."
  if node /app/scripts/seed-bootstrap.mjs; then
    echo "[entrypoint] Seed bootstrap finished."
  else
    echo "[entrypoint] WARNING: seed bootstrap failed; starting app anyway." >&2
  fi
fi

echo "[entrypoint] Starting Next.js server..."
exec node server.js
