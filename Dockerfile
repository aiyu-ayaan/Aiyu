# Stage 1: the web bundle (Vite). Node is a build tool only: it is not in the final image.
FROM node:24-bookworm-slim AS web
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable \
    && pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-mintimeout 20000 \
    && pnpm config set fetch-retry-maxtimeout 120000 \
    && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run web:build

# Stage 2: the server
FROM rust:1-slim-bookworm AS server
WORKDIR /server
COPY server/Cargo.toml server/Cargo.lock ./
COPY server/src ./src
COPY server/migrations ./migrations
RUN cargo build --release --locked

# Stage 3: runtime
FROM debian:bookworm-slim AS runner
WORKDIR /app

# libheif1 decodes HEIC/HEIF uploads; aiyu-server loads it at run time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libheif1 \
    && rm -rf /var/lib/apt/lists/*

# The ids of the earlier images, so existing volumes stay writable.
RUN groupadd --system --gid 1001 aiyu \
    && useradd --system --uid 1001 --gid aiyu --no-create-home aiyu

COPY --from=server /server/target/release/aiyu-server /app/aiyu-server
COPY --from=web /app/web/dist /app/web/dist
COPY public /app/public
COPY package.json /app/package.json

# Writable folders for a read-only root filesystem; named volumes inherit their owner.
RUN mkdir -p /app/data /app/public/uploads /app/.cache/backups \
    && chown -R aiyu:aiyu /app/data /app/public/uploads /app/.cache

ENV NODE_ENV=production \
    RUST_LISTEN=0.0.0.0:3000 \
    DATABASE_PATH=/app/data/aiyu.db \
    UPLOADS_DIR=/app/public/uploads \
    PUBLIC_DIR=/app/public \
    WEB_DIR=/app/web/dist \
    BACKUP_TMP_DIR=/app/.cache/backups \
    TRUSTED_PROXIES=127.0.0.1 \
    MALLOC_ARENA_MAX=2
# NODE_ENV=production turns on public caching. MALLOC_ARENA_MAX=2 keeps glibc from holding memory per thread.

USER aiyu
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s CMD ["/app/aiyu-server", "healthcheck"]
ENTRYPOINT ["/app/aiyu-server"]
