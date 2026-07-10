# Stage 1: Dependencies
# Use Debian (glibc) instead of Alpine (musl) for more reliable native builds on Windows/WSL.
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Install compiler toolchain for native modules (e.g. sharp/canvas-related transitive deps).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests for deterministic installs.
# The prisma schema is needed because the `postinstall` script runs `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Harden npm fetch behavior for flaky network/proxy conditions.
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-factor 2 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --include=dev --legacy-peer-deps --no-audit --no-fund --prefer-offline

# Stage 2: Builder
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# OpenSSL is required by the Prisma query engine at generate/runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure the Prisma client is generated against the committed schema.
RUN npx prisma generate

# Build-time args
ARG NEXT_PUBLIC_N8N_WEBHOOK_URL
ARG NEXT_PUBLIC_AUTHOR_NAME
ARG NEXT_PUBLIC_BASE_URL
ARG SITE_URL

# Build with ephemeral env values (prevents secret-name warnings from ENV instructions).
# DATABASE_URL is a dummy here; no DB connection happens during the build.
RUN DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy?schema=public" \
    NEXT_PUBLIC_N8N_WEBHOOK_URL="${NEXT_PUBLIC_N8N_WEBHOOK_URL}" \
    NEXT_PUBLIC_AUTHOR_NAME="${NEXT_PUBLIC_AUTHOR_NAME}" \
    NEXT_PUBLIC_BASE_URL="${NEXT_PUBLIC_BASE_URL}" \
    SITE_URL="${SITE_URL}" \
    ADMIN_USERNAME="dummy" \
    ADMIN_PASSWORD="dummy" \
    JWT_SECRET="dummy" \
    NEXT_TELEMETRY_DISABLED=1 \
    npm run build -- --webpack

# Assemble the complete runtime tree in /out so the runner ships ONE layer.
# Copying standalone and the Prisma packages as separate layers stored the
# overlapping files twice; assembling here also lets us prune before copying.
#
# Pruning rationale:
#   * The generated client (.prisma/client/index.js) loads exactly one runtime,
#     runtime/library.js, plus the native libquery_engine-*.so.node next to it.
#   * The *wasm-base64* files are the query engine for EVERY database
#     (mysql/sqlite/sqlserver/cockroachdb/...) inlined as base64 for edge
#     deployments — ~54MB never read by a Node server.
#   * @prisma/engines is the dev-time engine downloader (schema engine +
#     another copy of the query engine, ~36MB); the runtime never touches it.
RUN mkdir -p /out/.next/static /out/public \
    && cp -a .next/standalone/. /out/ \
    && cp -a .next/static/. /out/.next/static/ \
    && cp -a public/. /out/public/ \
    && cp -a prisma /out/prisma \
    && mkdir -p /out/node_modules/@prisma \
    && rm -rf /out/node_modules/.prisma \
              /out/node_modules/@prisma/client \
              /out/node_modules/@prisma/engines \
    && cp -a node_modules/.prisma /out/node_modules/.prisma \
    && cp -a node_modules/@prisma/client /out/node_modules/@prisma/client \
    && rm -f /out/node_modules/@prisma/client/runtime/*wasm-base64* \
             /out/node_modules/@prisma/client/runtime/*.map \
             /out/node_modules/@prisma/client/runtime/*.d.ts \
             /out/node_modules/@prisma/client/runtime/*.d.mts \
             /out/node_modules/@prisma/client/runtime/react-native.* \
             /out/node_modules/.prisma/client/*.d.ts \
             /out/node_modules/.prisma/client/query_engine_bg.wasm

# Stage 2.5: Isolated Prisma CLI
# Prisma 6.19's CLI loads @prisma/config, which pulls a large transitive
# closure (effect, c12, and ~20 more). None of it is part of the Next.js
# standalone trace, and hand-copying the closure is brittle (it changes between
# Prisma releases — that is what caused "Cannot find module 'effect'"). Install
# the CLI on its own so the runner can copy a complete, self-consistent
# node_modules used solely for `migrate deploy`. Pinned to match @prisma/client.
FROM node:20-bookworm-slim AS prismacli
WORKDIR /prismacli
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN npm init -y >/dev/null 2>&1 \
    && npm install prisma@6.19.3 --no-audit --no-fund
# Prune the CLI to what `migrate deploy` actually uses: it drives the schema
# engine only, so drop the query engines/compilers for every database, the
# embedded prisma-client generator sources, and Studio's web assets. effect is
# required via CJS (`require("effect")` in @prisma/config), so its ESM build,
# typings, and TS sources are dead weight too (fast-check must stay — the CJS
# barrel loads it). Together ~75MB.
RUN rm -rf node_modules/prisma/prisma-client \
           node_modules/prisma/build/public \
           node_modules/effect/dist/esm \
           node_modules/effect/dist/dts \
           node_modules/effect/src \
    && rm -f node_modules/@prisma/engines/libquery_engine-* \
             node_modules/prisma/build/query_engine_bg.* \
             node_modules/prisma/build/query_compiler_bg.*

# Stage 3: Runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# OpenSSL is required by the Prisma engines at runtime (migrate deploy + client).
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Runtime environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nextjs

# The complete pruned runtime tree (standalone server + static assets + public
# + prisma schema/migrations + generated Prisma client) assembled and pruned in
# the builder. One COPY = one layer, with no duplicated Prisma artifacts.
COPY --from=builder --chown=nextjs:nodejs /out ./

# Self-contained Prisma CLI (with its full @prisma/config -> effect/c12 closure)
# kept in its own directory so it can't shadow the app's runtime node_modules.
# Used only by the entrypoint to run `migrate deploy` at container start.
COPY --from=prismacli --chown=nextjs:nodejs /prismacli/node_modules /app/prisma-cli/node_modules

# Copy healthcheck script and the entrypoint
COPY --chown=nextjs:nodejs scripts/healthcheck.sh /app/healthcheck.sh
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh /app/docker-entrypoint.sh

# Create writable directories needed when running with read-only root fs.
# Strip any CR characters first: when the build context comes from a Windows
# checkout the .sh files can carry CRLF endings, which makes `sh` fail with
# "set: Illegal option -" and the container exits immediately on start.
RUN sed -i 's/\r$//' /app/healthcheck.sh /app/docker-entrypoint.sh \
    && mkdir -p /app/public/uploads \
    && mkdir -p /app/.next/cache \
    && chmod +x /app/healthcheck.sh /app/docker-entrypoint.sh \
    && chown -R nextjs:nodejs /app/public/uploads /app/.next/cache

# Switch to non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Runtime network settings
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Apply migrations (when RUN_MIGRATIONS=true) then start one Next.js server
# process. This is much lighter than PM2 clustering and is the best default
# for small VPS/Docker Desktop deployments.
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
