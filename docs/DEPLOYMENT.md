# Deployment Guide

Aiyu is a compiled **Rust (Axum)** server serving a **Vite (React 19)** frontend backed by a single-file **SQLite** database (`data/aiyu.db`). It is designed to run cleanly on a small VPS (1 GB RAM) via Docker Compose or as a native binary.

> **Upgrading from an older PostgreSQL deployment?**
> Run the one-time, hash-verified migration in [development/docs/SQLITE_CUTOVER.md](../development/docs/SQLITE_CUTOVER.md) before starting the new release.

---

## Deployment Options

### 1. Docker Compose on a VPS (Recommended)

Ideal for DigitalOcean, Hetzner, AWS EC2, Linode, Vultr, or any Linux host with Docker.

- Uses [docker-compose.yml](../docker-compose.yml) with the pre-built `aiyuayaan/aiyu:latest` Debian-slim image (~213 MB) and `nginx:alpine`.
- Persists SQLite (`sqlite_data` -> `/app/data/aiyu.db`) and uploads (`uploads_data` -> `/app/public/uploads`) in named Docker volumes.
- Runs HTTP-only on port 80 behind upstream TLS termination (such as a Cloudflare Tunnel or edge proxy).
- Full setup, environment variables, security hardening, and troubleshooting: **[Docker Guide](DOCKER_GUIDE.md)**.

### 2. Native Binary (Bare Metal / systemd)

Build both the Vite frontend and Rust server on the host (requires Node.js 24 + pnpm for build, Rust toolchain, and `libheif1` at runtime for HEIC uploads):

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

- `pnpm build` builds `web/dist` and `server/target/release/aiyu-server`.
- `pnpm start` runs `server/target/release/aiyu-server` (configure via `.env`; defaults to `DATABASE_PATH=data/aiyu.db` and `RUST_LISTEN=0.0.0.0:8080`).
- Place NGINX (see [nginx.conf](../nginx.conf)) or Caddy in front for TLS and static asset caching.

> **Note**: Serverless platforms like Vercel are not supported for the full stack because Aiyu runs a persistent Rust/Axum server with a local SQLite database.

---

## Related Documentation

- **[Docker Setup & Troubleshooting](DOCKER_GUIDE.md)** — Image details, compose files, volumes, healthchecks, and hardening
- **[Architecture Diagram](ARCHITECTURE_DIAGRAM.md)** — Runtime components, request flow, and security layers
- **[SQLite Cutover Guide](../development/docs/SQLITE_CUTOVER.md)** — Migrating an existing PostgreSQL install to SQLite
- **[GitHub Wiki](https://github.com/aiyu-ayaan/Aiyu/wiki)** — Additional guides and historical notes
