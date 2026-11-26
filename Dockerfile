# Stage 1: web build (Vite). Node is needed to build the pages, and until the SQLite switch for migrations and the seed.
FROM node:24-bookworm-slim AS web
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN corepack enable \
    && pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-mintimeout 20000 \
    && pnpm config set fetch-retry-maxtimeout 120000 \
    && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run web:build

# Stage 2: the Prisma CLI and client, used only by the entrypoint (`migrate deploy` and the seed scripts).
FROM node:24-bookworm-slim AS prisma
WORKDIR /prisma-runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY prisma ./prisma
RUN npm init -y >/dev/null 2>&1 \
    && npm install prisma@6.19.3 @prisma/client@6.19.3 --no-audit --no-fund \
    && npx prisma generate --schema=prisma/schema.prisma

# Stage 3: Rust server
FROM rust:1-slim-bookworm AS rust
WORKDIR /server
COPY server/Cargo.toml server/Cargo.lock ./
COPY server/src ./src
RUN cargo build --release --locked && strip target/release/aiyu-server

# Stage 4: Runner
FROM node:24-bookworm-slim AS runner
WORKDIR /app

# OpenSSL is required by the Prisma engines (migrate deploy and the seed).
# libheif1 decodes HEIC/HEIF uploads; aiyu-server loads it at run time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl libheif1 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nextjs

COPY --from=rust --chown=nextjs:nodejs /server/target/release/aiyu-server /app/aiyu-server
COPY --from=web --chown=nextjs:nodejs /app/web/dist /app/web/dist
COPY --chown=nextjs:nodejs public /app/public
COPY --chown=nextjs:nodejs package.json /app/package.json
COPY --from=prisma --chown=nextjs:nodejs /prisma-runtime/node_modules /app/node_modules
COPY --chown=nextjs:nodejs prisma /app/prisma

# Healthcheck and entrypoint
COPY --chown=nextjs:nodejs scripts/healthcheck.sh /app/healthcheck.sh
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh /app/docker-entrypoint.sh

# Seeder: the scripts and the plain data modules they read (see scripts/seed-bootstrap.mjs).
COPY --chown=nextjs:nodejs scripts/seed-bootstrap.mjs scripts/seed.mjs scripts/seed-ai-sections.mjs /app/scripts/
COPY --chown=nextjs:nodejs src/app/data /app/src/app/data
COPY --chown=nextjs:nodejs src/lib/aiPageDefaults.js /app/src/lib/aiPageDefaults.js
# Those data modules are ESM `.js` with no "type" field at the repo root. Marking /app/src as ESM makes `node`
# parse them as the bundler does.
RUN echo '{"type":"module"}' > /app/src/package.json \
    && chown nextjs:nodejs /app/src/package.json

# Writable directories for a read-only root filesystem.
# Strip CR characters first: a Windows checkout can give the .sh files CRLF endings, which `sh` refuses.
RUN sed -i 's/\r$//' /app/healthcheck.sh /app/docker-entrypoint.sh \
    && mkdir -p /app/public/uploads /app/.cache/backups \
    && chmod +x /app/healthcheck.sh /app/docker-entrypoint.sh \
    && chown -R nextjs:nodejs /app/public/uploads /app/.cache

# Switch to non-root user
USER nextjs

EXPOSE 3000
ENV PORT=3000

# Apply migrations (when RUN_MIGRATIONS=true), seed (RUN_SEED), then start the server.
ENTRYPOINT ["bash", "/app/docker-entrypoint.sh"]
