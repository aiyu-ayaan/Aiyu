# aiyu-server

Rust (axum) server that is replacing Next.js route by route. Plan and progress: `development/TODO.md`.

Today it sits in front of Next. Everything not listed here is streamed to Next (`NEXT_UPSTREAM`) and back, so large
bodies such as backups never sit in memory.

## What Rust serves

| Area | Routes |
|---|---|
| Pages | every public and admin page (Vite build in `WEB_DIR`) |
| Public reads | the `GET` content routes under `/api`, `/api/global-search`, `/api/github/stats`, `/.well-known/*` |
| Sign-in | `POST /api/auth/login`, `POST /api/auth/logout` (GitHub OAuth is still Next) |
| Analytics | `POST /api/analytics/track` |
| Site writes | `/api/about`, `/api/home`, `/api/header`, `/api/config`, `/api/themes/active`, `/api/ai/layout` |
| Content writes | socials, themes, projects, deployments (and their reorder), gallery, blogs, legal apps and pages |
| AI Hub writes | skill categories, skills, recommendations, credits, prompts, `/api/ai/seed` |
| Contact form | `/api/contact/message`: the public `POST` (with notifications and the n8n webhook), the admin `GET` and `DELETE` |
| Notifications, previews | `/api/admin/notifications/test`, `/api/og-preview` (public hosts only, unlike Next) |
| Admin settings | `/api/admin/{ads,social,notifications}`, `seo/config`, `blogs/token`, `mcp/{config,token}`, `crons/timezone`, `health/targets`, `analytics`, `security/*` |
| Crawler and agent files | `robots.txt`, `sitemap.xml`, `ads.txt`, `auth.md`, `/docs/api`, `/docs/mcp` |
| Backup | `GET /api/admin/export`: rows and files stream into the zip, about 10 MB of memory whatever the data size |
| Static | `/_app/*` and `/_next/static/*` with a one-year immutable cache |

Responses are compressed (brotli, gzip; zips, PDFs, fonts and video are skipped). The route list is `src/lib.rs`.
Other methods on these paths, and all other `/api/admin/*` routes, are still Next's.

### Who may write

- Writes need the admin `session` cookie. A valid token is not enough: its `Session` row must exist and not be
  revoked or expired.
- `POST /api/blogs` and the AI Hub writes (including `/api/ai/layout` and `/api/ai/seed`) also accept
  `Authorization: Bearer <token>`, the blog API token or the MCP write token.
- `/api/analytics/track` and sign-in are public.
- The rate limit of `src/proxy.js` is applied to the ported routes by `limited_api()` in `src/lib.rs`: add every new
  `POST`, `PUT`, `PATCH` or `DELETE` route there.

### Side effects that stay in Next

After a write Rust calls `POST /api/internal/hooks` on Next, which clears Next's in-memory caches (MCP, sitemap and
SEO tools read through them) and queues search-engine pings. The call carries an HMAC of `JWT_SECRET`; Rust answers
404 for `/api/internal/*` to outside callers. If the call fails, the write still succeeds and a warning is logged.

## Source layout

| File | |
|---|---|
| `lib.rs`, `config.rs`, `proxy.rs`, `compat.rs` | routes, settings, upstream proxy, Next's page headers and redirects |
| `web.rs`, `pages.rs`, `legal.rs`, `ai.rs` | pages and their data |
| `api.rs`, `site_api.rs`, `github.rs` | read APIs |
| `auth.rs`, `session.rs`, `crypto.rs`, `limit.rs`, `analytics.rs` | sign-in, session cookie, encrypted fields, rate limits, tracking |
| `write.rs`, `admin_site.rs`, `admin_content.rs`, `admin_blogs.rs`, `admin_legal.rs`, `admin_ai.rs` | writes |
| `admin_settings.rs`, `admin_security.rs`, `admin_analytics.rs`, `seo.rs`, `geoip.rs`, `cron.rs` | admin settings, sessions and audit, analytics, SEO settings, IP places, cron schedules |
| `site_files.rs` | robots.txt, sitemap.xml, ads.txt and the markdown documents |
| `contact.rs`, `notify.rs`, `og.rs`, `net.rs` | contact form, notification channels, link previews, fetching of user-supplied URLs |
| `db.rs`, `export.rs` | database pool and ids, backup zip |

`crypto.rs` and `session.rs` read values written by the Node code (encrypted DB fields, the `session` cookie).
`tests/parity.rs` checks that against fixtures produced by Node.

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

## Checking against Next

Start both servers on the same database, Next on `:3100` and Rust on `:8080` with `TRUSTED_PROXIES=127.0.0.1`.

```bash
# Reads: same responses, signed out and signed in
node --env-file=.env scripts/perf/api-parity.mjs scripts/perf/api/batch1.txt
# Sign-in and analytics
node --env-file=.env scripts/perf/auth-parity.mjs
# Writes: same response and same row changes
node --env-file=.env scripts/perf/write-parity.mjs scripts/perf/writes/{site,content,blogs,legal,ai,admin}.mjs
# Outgoing requests: contact form, notification channels, n8n webhook
node --env-file=.env scripts/perf/outbound-parity.mjs
# Browser tests through Rust (headless)
E2E_PORT=8080 pnpm exec playwright test e2e/admin-pages.spec.js e2e/site-pages.spec.js e2e/blogs.spec.js
```

`auth-parity.mjs` and `write-parity.mjs` write to the database in `DATABASE_URL`: use a local one. `write-parity.mjs`
refuses any other host and restores the rows it touches; back the database up first anyway.
