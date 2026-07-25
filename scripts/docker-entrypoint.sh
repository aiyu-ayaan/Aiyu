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
  # Sanity check: the image must ship the migration history. An empty or
  # missing migrations folder makes `migrate deploy` report success while
  # applying nothing, silently drifting the database behind the client
  # (this happened when a copy bug nested prisma/ inside itself).
  if ! ls /app/prisma/migrations/*/migration.sql >/dev/null 2>&1; then
    if [ "${ALLOW_MIGRATION_FAILURE}" = "true" ]; then
      echo "[entrypoint] WARNING: /app/prisma/migrations is missing or empty; continuing (ALLOW_MIGRATION_FAILURE=true)." >&2
    else
      echo "[entrypoint] FATAL: /app/prisma/migrations is missing or empty — image is broken; migrate deploy would no-op and drift the schema." >&2
      exit 1
    fi
  fi

  echo "[entrypoint] Applying Prisma migrations (migrate deploy)..."
  MIGRATED=false
  # The database container may still be booting; retry before giving up.
  for attempt in 1 2 3 4 5; do
    if node /app/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=/app/prisma/schema.prisma; then
      MIGRATED=true
      break
    fi
    echo "[entrypoint] migrate deploy attempt ${attempt} failed; retrying in 5s..." >&2
    sleep 5
  done
  if [ "${MIGRATED}" = "true" ]; then
    echo "[entrypoint] Migrations applied."
  elif [ "${ALLOW_MIGRATION_FAILURE}" = "true" ]; then
    echo "[entrypoint] WARNING: migrate deploy failed; starting app anyway (ALLOW_MIGRATION_FAILURE=true)." >&2
  else
    # Starting the app against a drifted schema makes every query on new
    # columns fail (data looks deleted, restores abort). Fail loudly instead.
    echo "[entrypoint] FATAL: migrate deploy failed. Refusing to start against a drifted schema." >&2
    echo "[entrypoint] Set ALLOW_MIGRATION_FAILURE=true to override (not recommended)." >&2
    exit 1
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
