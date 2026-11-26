# Aiyu Architecture & System Diagrams

## System Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                           User / Browser                             │
│                 (Public Visitors, Admin UI, AI Agents)               │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS (terminated at Cloudflare / edge)
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   NGINX Reverse Proxy (nginx:alpine)                 │
│  Port 80 (HTTP-only origin; upstream TLS)                            │
│  - Direct static serving: /srv/public, /uploads/, /api/uploads/      │
│  - Proxy cache: /_app/* (365d immutable), /api/github/stats (2m)     │
│  - Gzip compression, security headers, /nginx-health                 │
│  - No-store for /api/* and /admin; 404s are never cached             │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Docker bridge network (aiyu-network)
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│              Rust / Axum Server — aiyu-server (Port 3000)            │
│              Image: debian:bookworm-slim (~213 MB), UID 1001 (aiyu)  │
│              Runtime: 2 Tokio workers, MALLOC_ARENA_MAX=2            │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │  SPA Serving & Metadata Injection (web/dist)                     │ │
│ │  - Serves Vite + React 19 + Tailwind CSS 4 frontend              │ │
│ │  - Injects per-route SEO/OG tags and bootstrap payload into HTML │ │
│ │  - Serves hashed /_app/* assets (immutable cache headers)        │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │  REST API & Admin Backend (/api/*)                               │ │
│ │  - Auth (JWT sessions + optional single-user GitHub OAuth)       │ │
│ │  - Content CRUD (Projects, Blogs, Gallery, Apps, AI Hub, Legal)  │ │
│ │  - Image processing & HEIC/HEIF decoding (libheif1)              │ │
│ │  - Per-IP rate limiting (TRUSTED_PROXIES-aware) & audit logging  │ │
│ │  - Full ZIP backup/restore, Google Drive sync, scheduled crons   │ │
│ │  - AI provider integrations, SEO audit/indexing, analytics       │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │  Static Files, Redirects, Discovery & MCP                        │ │
│ │  - Serves public/, uploads (/api/uploads/{file}, /uploads/)      │ │
│ │  - Legacy URL redirects & canonical host handling                │ │
│ │  - /robots.txt, /sitemap.xml, /ads.txt, /.well-known/*           │ │
│ │  - /api/mcp (MCP StreamableHTTP JSON-RPC 2.0 server)             │ │
│ │  - SQLite FTS5 full-text blog search (/api/global-search)        │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└─────────────────┬────────────────────────────────┬───────────────────┘
                  │                                │
                  ▼                                ▼
┌────────────────────────────────────┐  ┌──────────────────────────────┐
│  SQLite Database (data/aiyu.db)    │  │  Named Volumes & External    │
│  - Single file, WAL mode           │  │  Volumes:                    │
│  - 36 tables + FTS5 search index   │  │  - sqlite_data (/app/data)   │
│  - Embedded SQL migrations         │  │  - uploads_data              │
│  - Startup auto-seed (RUN_SEED)    │  │  - backup_cache              │
│  - BEGIN IMMEDIATE write txns      │  │  - nginx_cache               │
│  - 10s busy timeout                │  │  External APIs:              │
│                                    │  │  - GitHub API / OAuth        │
│  (Optional one-time cutover tool:  │  │  - AI providers, Google      │
│   `aiyu-server import-postgres`)   │  │  - n8n webhooks, Telegram    │
└────────────────────────────────────┘  └──────────────────────────────┘
```

---

## Frontend Architecture (Vite + React 19)

The frontend is built at compile time by Vite (`pnpm run web:build` -> `web/dist`) using Node.js 24. Node.js is **not** part of the runtime container.

- **Entry & Routing**: `web/` (Vite config, TypeScript entrypoints, route metadata) + `src/` (React 19 components, pages, admin modules, hooks, utilities).
- **Styling & Motion**: Tailwind CSS 4 (`@tailwindcss/vite`), Framer Motion, GSAP, Lenis, Three.js.
- **Public Surfaces**: Home (scroll-driven story), About, Projects, Apps/Deployments, Blogs (Markdown + syntax highlighting), Gallery, Games, GitHub stats, AI Hub (`/ai`), Desktop OS (`/desktop`), Contact, Legal pages.
- **Admin Panel (`/admin/*`)**: Content management, Theme studio, Analytics, Security/Sessions/Audit log, MCP configuration, Crons, SEO, Resume studio, Health/Uptime metrics, Backup & Restore.

---

## Production Deployment (`docker-compose.yml`)

```text
Internet / Cloudflare Edge (HTTPS 443)
                 │ HTTP (port 80)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  nginx (nginx:alpine)                                       │
│  - Listens on ${NGINX_HTTP_PORT:-80}                        │
│  - Serves ./public (/srv/public) & uploads_data             │
│  - Caches /_app/* and /api/github/stats in nginx_cache      │
│  - Healthcheck: wget http://127.0.0.1:80/nginx-health       │
└────────────────────────────┬────────────────────────────────┘
                             │ http://app:3000 (keepalive)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  app (aiyuayaan/aiyu:${APP_IMAGE_TAG:-latest})              │
│  - Debian bookworm-slim (~213 MB), user aiyu (1001:1001)    │
│  - Read-only root FS + noexec tmpfs (/tmp, /var/tmp, /run)  │
│  - Volumes: sqlite_data, uploads_data, backup_cache         │
│  - Healthcheck: /app/aiyu-server healthcheck                │
└─────────────────────────────────────────────────────────────┘

Optional cutover-only service (disabled by default):
  postgres (postgres:17-alpine, profiles: ["postgres"])
  - Started only when running `aiyu-server import-postgres`
    (see development/docs/SQLITE_CUTOVER.md).
```

---

## Local Workflows

### Local Docker (`docker-compose.local.yml`)

- Builds `Dockerfile` directly from the local checkout.
- Runs `app` (exposed on `${APP_PORT:-3000}:3000`) and `nginx` (exposed on `${NGINX_HTTP_PORT:-80}:80`).
- Uses the same hardened container settings, healthcheck, and SQLite volume as production.

### Native Development (`pnpm dev`)

- `scripts/dev.mjs` runs Vite dev server (HMR) alongside the local Rust server (`aiyu-server`) connected to `data/aiyu.db`.
- No Docker or external database server is required.

---

## Request Lifecycle

```text
1. INCOMING REQUEST (Production)
   Browser / Agent
     └─► NGINX (:80)
         ├─ /nginx-health             → 200 "ok"
         ├─ /uploads/*, /api/uploads/* → served directly from uploads_data (30d immutable)
         ├─ Static files in /srv/public → served directly (7d cache), fallback to @app
         ├─ /_app/*                   → proxied to app:3000 & cached 365d
         ├─ /api/github/stats         → proxied to app:3000 & cached 2m
         └─ /api/*, /admin, SPA pages → proxied to app:3000 (proxy_cache off)

2. RUST / AXUM PROCESSING (aiyu-server :3000)
   ├─ Compression layer (Brotli + Gzip, skipping already-compressed types)
   ├─ Redirect middleware (legacy paths & canonical host where configured)
   ├─ Route dispatch:
   │   ├─ SPA pages (/, /blogs/*, /projects/*, /admin/*, ...)
   │   │   → queries SQLite if needed, injects meta/bootstrap JSON into web/dist/index.html
   │   ├─ REST API (/api/*)
   │   │   → rate-limit middleware (writes & select reads)
   │   │   → auth check (JWT cookie or Bearer token)
   │   │   → SQLite query via sqlx pool (WAL mode)
   │   ├─ MCP endpoint (/api/mcp)
   │   │   → JSON-RPC 2.0 StreamableHTTP dispatch (read tools public; write tools Bearer-authed)
   │   ├─ Discovery & SEO (/robots.txt, /sitemap.xml, /.well-known/*)
   │   └─ Fallback → public/ static files or SPA 404 page (with site header)

3. DATABASE (SQLite)
   ├─ Concurrent readers + serialized writers (BEGIN IMMEDIATE, 10s busy timeout)
   ├─ FTS5 virtual table for full-text blog search
   └─ All 36 tables persisted in /app/data/aiyu.db (+ -wal / -shm)
```

---

## Startup Sequence (`docker-compose.yml`)

```text
1. Start `app`
   ├─ Read config from environment variables
   ├─ Verify SQLite guard (refuse to create empty DB if DATABASE_URL points to Postgres)
   ├─ Open/create /app/data/aiyu.db in WAL mode & run embedded SQL migrations
   ├─ Load Vite bundle metadata from /app/web/dist
   ├─ Run startup seed if RUN_SEED=auto and DB is empty
   ├─ Start background cron scheduler (if enabled)
   ├─ Bind TCP listener on 0.0.0.0:3000 (TCP_NODELAY enabled)
   └─ Pass healthcheck: `/app/aiyu-server healthcheck` -> GET 127.0.0.1:3000/api/health

2. Start `nginx` (waits for `app` service_healthy)
   ├─ Load ./nginx.conf
   ├─ Mount ./public and uploads_data (read-only)
   └─ Pass healthcheck: GET 127.0.0.1:80/nginx-health
```

---

## Volumes & Persistence

| Mount | Type | Container Path | Purpose |
|---|---|---|---|
| `sqlite_data` | Named volume | `/app/data` | SQLite database (`aiyu.db`, `-wal`, `-shm`) |
| `uploads_data` | Named volume | `/app/public/uploads` (app), `/srv/uploads` (nginx, ro) | Uploaded images and media |
| `backup_cache` | Named volume | `/app/.cache` | Temporary backup/restore archives |
| `nginx_cache` | Named volume | `/var/cache/nginx` | NGINX proxy cache |
| `/tmp` | `tmpfs` | `/tmp` | Ephemeral scratch (`noexec,nosuid,nodev`) |
| `/var/tmp` | `tmpfs` | `/var/tmp` | Ephemeral scratch (`noexec,nosuid,nodev`) |
| `/run` | `tmpfs` | `/run` | Runtime files (`noexec,nosuid,nodev`) |

---

## Security Layers

1. **Network**: Internal Docker bridge (`aiyu-network`); only NGINX port 80 is exposed in production (TLS terminated upstream). `TRUSTED_PROXIES` restricts which peers may set `X-Real-IP` / `X-Forwarded-For`.
2. **Container**: Non-root `aiyu` user (UID 1001), `read_only: true` root filesystem, `noexec` tmpfs mounts, `cap_drop: ALL`, `no-new-privileges:true`.
3. **Application & Auth**:
   - Admin authentication via signed JWT sessions (or optional single-user GitHub OAuth locked to `GITHUB_ALLOWED_ID`).
   - Sensitive stored secrets encrypted at rest with a cipher derived from `JWT_SECRET`.
   - Blog API and MCP write bearer tokens stored as SHA-256 hashes and verified in constant time.
   - Per-IP rate limiting on write endpoints, login, global search, and MCP write calls (20/min).
   - Security headers set by NGINX (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

---

## Performance & Scaling Notes

- **Low Memory Footprint**: Built to run comfortably on a 1 GB VPS (~27 MB idle RSS in Docker, ~71 MB after a full read sweep with `MALLOC_ARENA_MAX=2` and 2 Tokio worker threads).
- **Vertical Scaling**: Increase `RUST_WORKERS` if running on multi-core hosts; SQLite WAL mode handles high concurrent read throughput with a single writer.
- **Caching**: NGINX caches immutable Vite `/_app/*` bundles (365 days), serves static files and uploads directly from disk, and caches `/api/github/stats` (2 minutes).
- **Full-Text Search**: Blog search uses SQLite FTS5 with English stemming, avoiding external search services.
