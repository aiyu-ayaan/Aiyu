# Docker Setup & Troubleshooting

Aiyu runs in Docker as a single compiled Rust (`aiyu-server`) + Vite (React 19) application container backed by an embedded SQLite database (`data/aiyu.db`), paired with an `nginx:alpine` reverse proxy.

> **Upgrading from an earlier PostgreSQL install?**
> Follow [SQLITE_CUTOVER.md](../development/docs/SQLITE_CUTOVER.md) to copy and verify your existing Postgres data into SQLite before starting the new version.

---

## Container Image

The multi-stage [Dockerfile](../Dockerfile) produces a **`debian:bookworm-slim`** runtime image (~213 MB):

1. **Stage 1 (`node:24-bookworm-slim`)** — Installs workspace dependencies and runs `pnpm run web:build` to produce the static Vite bundle (`web/dist`). Node.js is build-time only and is **not** included in the final image.
2. **Stage 2 (`rust:1-slim-bookworm`)** — Compiles `server/` in release mode (`cargo build --release --locked`) into `/app/aiyu-server`.
3. **Stage 3 (`debian:bookworm-slim`)** — Minimal runtime containing:
   - `/app/aiyu-server`, `/app/web/dist`, `/app/public`, and `/app/package.json`
   - `ca-certificates` and `libheif1` (loaded at runtime to decode HEIC/HEIF uploads)
   - Non-root user `aiyu:aiyu` (UID/GID `1001`, matching previous images so existing volumes remain writable)
   - `MALLOC_ARENA_MAX=2` (prevents glibc from holding excess per-thread arenas; combined with `RUST_WORKERS=2` default, keeps idle RSS around ~27 MB and ~71 MB after a full read sweep on a 1 GB VPS)
   - Built-in healthcheck: `CMD ["/app/aiyu-server", "healthcheck"]`

### Built-in Runtime Defaults (`Dockerfile`)

| Variable | Default in Image | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production public caching behavior |
| `RUST_LISTEN` | `0.0.0.0:3000` | Bind address for `aiyu-server` |
| `DATABASE_PATH` | `/app/data/aiyu.db` | SQLite database file path |
| `UPLOADS_DIR` | `/app/public/uploads` | Uploaded media directory |
| `PUBLIC_DIR` | `/app/public` | Static public assets directory |
| `WEB_DIR` | `/app/web/dist` | Pre-built Vite SPA bundle |
| `BACKUP_TMP_DIR` | `/app/.cache/backups` | Scratch space for backup/restore zips |
| `TRUSTED_PROXIES` | `127.0.0.1` | Overridden in compose to Docker private subnets (`172.16.0.0/12,192.168.0.0/16,10.0.0.0/8`) |
| `MALLOC_ARENA_MAX` | `2` | Caps glibc malloc arenas to keep memory usage low |

---

## Compose Files

| File | Purpose |
|---|---|
| [docker-compose.yml](../docker-compose.yml) | **Production**: pulls `aiyuayaan/aiyu:${APP_IMAGE_TAG:-latest}` and runs `nginx:alpine` on HTTP port `${NGINX_HTTP_PORT:-80}` (TLS is terminated upstream, e.g., Cloudflare Tunnel/edge). Includes an optional `postgres` service under `profiles: ["postgres"]` solely for one-time SQLite cutover. |
| [docker-compose.local.yml](../docker-compose.local.yml) | **Local Docker build**: builds `Dockerfile` from the local checkout, exposes `app` directly on `${APP_PORT:-3000}:3000`, and runs `nginx:alpine` on `${NGINX_HTTP_PORT:-80}:80`. |
| [docker-compose.dev.local.yml](../docker-compose.dev.local.yml) | **Optional Postgres source**: starts Postgres 17 + pgAdmin only when testing `aiyu-server import-postgres` or migration workflows. Not required for normal development. |

---

## Quick Start

### Production (`docker-compose.yml`)

```bash
# 1. Configure environment variables
cp .env.example .env.production
# Edit .env.production (set ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET, SITE_URL, NEXT_PUBLIC_BASE_URL)
# Leave POSTGRES_* and DATABASE_URL unset on a fresh install.

# 2. Pull and start app + nginx
pnpm docker:up:prod
# or: docker compose --env-file .env.production -f docker-compose.yml up -d

# 3. View logs
docker compose logs -f app

# 4. Stop services
pnpm docker:down
```

### Local Build (`docker-compose.local.yml`)

```bash
# Build from local source and start app + nginx
pnpm docker:up:dev
# or: docker compose --env-file .env.production -f docker-compose.local.yml up -d --build

# Check container health
docker compose -f docker-compose.local.yml ps
```

### Automatic Migrations & Seeding

On startup, `aiyu-server` automatically:
1. Creates `/app/data/aiyu.db` (if missing and no Postgres `DATABASE_URL` guard is active) and enables SQLite WAL mode.
2. Applies embedded SQL migrations (`server/migrations/`).
3. Runs startup seeding according to `RUN_SEED` (default: `auto`):
   - `auto`: seeds base content only when the database is empty.
   - `force`: replaces base content with defaults (**destructive**).
   - `false` / `off`: skips seeding.

You do **not** need to call any manual seed endpoint.

---

## Health Checks

- **`app` service**: runs `/app/aiyu-server healthcheck`, which probes `http://127.0.0.1:3000/api/health` with a 5-second timeout and exits non-zero on error.
- **`nginx` service**: depends on `app` (`condition: service_healthy`) and probes `http://127.0.0.1:80/nginx-health`.

---

## Data Persistence & Backups

Named Docker volumes persist data across container restarts and image upgrades:

| Volume | Mount Path | Contents |
|---|---|---|
| `sqlite_data` | `/app/data` | SQLite database (`aiyu.db`, `aiyu.db-wal`, `aiyu.db-shm`) |
| `uploads_data` | `/app/public/uploads` (app) & `/srv/uploads:ro` (nginx) | User-uploaded images and files |
| `backup_cache` | `/app/.cache` | Temporary scratch space for backup/restore archives |
| `nginx_cache` | `/var/cache/nginx` | NGINX proxy cache (`/_app/`, `/api/github/stats`) |
| `postgres_data` | `/var/lib/postgresql/data` | Legacy Postgres volume (only used when running `--profile postgres` during cutover) |

### Backing Up & Restoring

- **Recommended**: Use the Admin Panel (`/admin` -> Database / Backup) to export and restore full ZIP backups (database + uploads).
- **Direct volume access**:

```bash
# List project volumes
docker volume ls | grep -E "sqlite_data|uploads_data"

# Copy uploads from the named volume to the host
docker run --rm -v <project>_uploads_data:/uploads -v "$(pwd)/backup-uploads:/backup" alpine cp -r /uploads/. /backup/

# Copy a single uploaded file from the running container
docker cp <app-container>:/app/public/uploads/filename.webp ./filename.webp
```

> Avoid copying `aiyu.db` directly with `cp` while the server is actively writing; stop `app` first or use the Admin Panel export.

---

## Container Security Hardening

Both `docker-compose.yml` and `docker-compose.local.yml` run `app` with:
- **Non-root user**: `aiyu` (`1001:1001`)
- **Read-only root filesystem**: `read_only: true` (writes are restricted to named volumes and `tmpfs` mounts)
- **Hardened `tmpfs`**: `/tmp`, `/var/tmp`, and `/run` mounted with `noexec,nosuid,nodev`
- **Dropped capabilities**: `cap_drop: [ALL]` with minimal `cap_add` (`NET_BIND_SERVICE`, plus `NET_RAW` in production compose)
- **No privilege escalation**: `security_opt: [no-new-privileges:true]`
- **No artificial memory/CPU caps**: the container uses available host resources without artificial OOM kills.

Run `pnpm docker:verify` (`scripts/verify-security.sh`) to verify container security settings.

---

## Common Issues & Fixes

### 1. Server refuses to start: `DATABASE_URL names a Postgres database`
**Cause**: `DATABASE_URL` or `POSTGRES_PASSWORD` is still set in `.env` while `/app/data/aiyu.db` does not exist yet. This safeguard prevents an upgraded Postgres deployment from silently starting empty.
**Fix**:
- If upgrading from Postgres, run the one-time cutover in [SQLITE_CUTOVER.md](../development/docs/SQLITE_CUTOVER.md) (`docker compose run --rm app import-postgres`).
- If starting a brand-new site, remove `POSTGRES_*` and `DATABASE_URL` from `.env` (or set `START_EMPTY=true`).

### 2. Permission denied on `/app/public/uploads` or `/app/data`
**Cause**: Bind-mounting a host directory owned by another UID instead of using named volumes.
**Fix**: Use the named volumes (`sqlite_data`, `uploads_data`, `backup_cache`) defined in the compose files, or ensure host directories are owned by UID/GID `1001:1001` (`aiyu`).

### 3. Client IPs all appear as the NGINX container IP
**Cause**: `TRUSTED_PROXIES` does not include the Docker bridge subnet.
**Fix**: Ensure `TRUSTED_PROXIES` includes your Docker network range (default in `docker-compose.yml`: `172.16.0.0/12,192.168.0.0/16,10.0.0.0/8`).

### 4. Upgrading from PostgreSQL
See [development/docs/SQLITE_CUTOVER.md](../development/docs/SQLITE_CUTOVER.md) for the full step-by-step migration and rollback procedure.
