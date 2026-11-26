# aiyu-server

Rust (axum) server that is replacing Next.js route by route. Plan and progress: `development/TODO.md`.

Today it sits in front of Next:
- `GET /api/admin/export` (backup zip) is served by Rust: rows stream from Postgres and files from disk into
  the zip, so memory stays flat (about 10 MB) whatever the data size
- signs the admin in and out (`/api/auth/login`, `/api/auth/logout`) and records `/api/analytics/track`
- handles the content writes outside `/api/admin/*`, then calls Next's `/api/internal/hooks` (keyed with the
  JWT secret, never proxied from outside) so Next clears its caches and pings search engines
- serves `/_next/static/*` from `.next/static` with a one-year immutable cache
- compresses responses (brotli, gzip; skips zips, PDFs, fonts, video)
- streams every other request to Next (`NEXT_UPSTREAM`) and back, so large bodies such as backups never sit in memory

`src/crypto.rs` and `src/session.rs` read values written by the Node code (encrypted DB fields, the `session`
cookie). `tests/parity.rs` checks that against fixtures produced by Node.

## Run

```bash
pnpm server:build                 # cargo build --release
pnpm build && pnpm start -p 3100  # Next, as the upstream
NEXT_UPSTREAM=http://127.0.0.1:3100 RUST_LISTEN=0.0.0.0:8080 pnpm server:start
pnpm server:test
```

| Env | Default | |
|---|---|---|
| `JWT_SECRET` | required | same value as the Next app |
| `DATABASE_URL` | required | same Postgres as Next (Prisma's `?schema=` is ignored); pool of 3 |
| `UPLOADS_DIR` | `public/uploads` | files added to backups |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | empty (login always fails) | password login; `$` is read by dotenv rules, which differ from Next's in `.env` files |
| `GITHUB_AUTH_ENABLED` | `false` | `true` turns password login off |
| `NODE_ENV` | unset | the session cookie is `Secure` unless this is `development` |
| `ANALYTICS_SALT` | `AUTH_SECRET`, then a constant | visitor hash salt, same as Next |
| `SITE_URL` | `https://me.aiyu.co.in` | canonical URLs of blog posts, same as Next |
| `RUST_WORKERS` | `2` | tokio worker threads; fewer threads, less memory |
| `RUST_LISTEN` | `0.0.0.0:8080` | |
| `NEXT_UPSTREAM` | `http://127.0.0.1:3000` | Next server for unported routes |
| `NEXT_DIR` | `.next` | where `static/` is read from |
| `TRUSTED_PROXIES` | empty | IPs/CIDRs (e.g. nginx, `127.0.0.1,172.16.0.0/12`) allowed to set `x-real-ip`, `x-forwarded-for`, `cf-connecting-ip`. From any other peer those headers are replaced by the socket address. |

Reads `.env` from the working directory.
