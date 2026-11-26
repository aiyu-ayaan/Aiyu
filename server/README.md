# aiyu-server

The site's server (Rust, axum). It serves the pages (Vite build), the API, the files under `public/` and the uploads,
and runs the scheduled tasks. Plan and progress: `development/TODO.md`.

## What it serves

| Area | Routes |
|---|---|
| Pages | every public and admin page (Vite build in `WEB_DIR`) |
| Public reads | the `GET` content routes under `/api`, `/api/global-search`, `/api/github/stats`, `/.well-known/*` |
| Sign-in | `POST /api/auth/login`, `POST /api/auth/logout`, GitHub OAuth (`/api/auth/github`, `/callback`) |
| GitHub | `/api/github/{config,sync,webhook}` (and `stats`) |
| Analytics | `POST /api/analytics/track` |
| Site writes | `/api/about`, `/api/home`, `/api/header`, `/api/config`, `/api/themes/active`, `/api/ai/layout` |
| Content writes | socials, themes, projects, deployments (and their reorder), gallery, blogs, legal apps and pages |
| AI Hub writes | skill categories, skills, recommendations, credits, prompts, `/api/ai/seed` |
| Contact form | `/api/contact/message`: the public `POST` (with notifications and the n8n webhook), the admin `GET` and `DELETE` |
| Notifications, previews | `/api/admin/notifications/test`, `/api/og-preview` (public hosts only, unlike Next) |
| Admin settings | `/api/admin/{ads,social,notifications}`, `seo/config`, `blogs/token`, `mcp/{config,token}`, `crons`, `crons/{id}`, `crons/{id}/run`, `crons/{env,logs,preview,timezone}`, `health/targets`, `analytics`, `security/*` |
| Crawler and agent files | `robots.txt`, `sitemap.xml`, `ads.txt`, `auth.md`, `/docs/api`, `/docs/mcp` |
| Uploads and storage | `/api/upload`, `/api/uploads/{file}`, `/api/admin/{images/upload,icons,storage,storage/migrate,storage/unreferenced,migrate-gallery}`. HEIC needs the system `libheif1` (loaded at run time) |
| Health, resume, misc | `/api/admin/{health/metrics,health/uptime,health/uptime/check,purge-cache,resume,resume/compile,resume/publish,ai/logs,system-prompt}` |
| AI Core | `/api/admin/ai/{config,models,validate-provider,text,generate}`, `/api/admin/health/analyze` |
| SEO tools | `/api/admin/seo/{audit,crawl,fix,index}`; indexing pings after content writes |
| MCP | `/api/mcp` |
| Backup | `GET /api/admin/export`: rows and files stream into the zip, about 10 MB of memory whatever the data size |
| Restore, Google Drive | `/api/admin/import`, `/api/admin/gdrive/*`: everything goes through temporary files (`BACKUP_TMP_DIR`) |
| Static | `/_app/*` (one-year immutable cache), `public/` files, `/uploads/*` |
| Old addresses | the `next.config.mjs` redirects, `/v1/*`, `/v2/*`, removed pages, trailing slashes (`src/site_static.rs`). A target can never leave the site |

Responses are compressed (brotli, gzip; zips, PDFs, fonts and video are skipped). The route list is `src/lib.rs`.

### Who may write

- Writes need the admin `session` cookie. A valid token is not enough: its `Session` row must exist and not be
  revoked or expired.
- `POST /api/blogs` and the AI Hub writes (including `/api/ai/layout` and `/api/ai/seed`) also accept
  `Authorization: Bearer <token>`, the blog API token or the MCP write token.
- `/api/analytics/track` and sign-in are public.
- `limited_api()` in `src/lib.rs` applies the API rate limit: add every new `POST`, `PUT`, `PATCH` or `DELETE`
  route there.

### Side effects of a write

Search-engine pings run after the reply (`indexing.rs`) and never fail a write.

## Source layout

| File | |
|---|---|
| `lib.rs`, `config.rs`, `compat.rs`, `site_static.rs` | routes, settings, page headers, static files, redirects and 404s |
| `web.rs`, `pages.rs`, `legal.rs`, `ai.rs` | pages and their data |
| `api.rs`, `site_api.rs`, `github.rs` | read APIs |
| `auth.rs`, `session.rs`, `crypto.rs`, `limit.rs`, `analytics.rs` | sign-in, session cookie, encrypted fields, rate limits, tracking |
| `write.rs`, `admin_site.rs`, `admin_content.rs`, `admin_blogs.rs`, `admin_legal.rs`, `admin_ai.rs` | writes |
| `admin_settings.rs`, `admin_security.rs`, `admin_analytics.rs`, `seo.rs`, `geoip.rs`, `cron.rs`, `admin_crons.rs`, `cron_jobs.rs`, `cron_template.rs` | admin settings, sessions and audit, analytics, SEO settings, IP places, cron schedules, task runner and template previews |
| `site_files.rs` | robots.txt, sitemap.xml, ads.txt and the markdown documents |
| `contact.rs`, `notify.rs`, `og.rs`, `net.rs` | contact form, notification channels, link previews, fetching of user-supplied URLs |
| `github_admin.rs`, `github_sync.rs`, `oauth.rs` | GitHub settings, webhook, repo sync, sign-in |
| `uploads.rs`, `images.rs`, `heif.rs`, `storage.rs` | uploads, WebP conversion and thumbnails, HEIC through libheif, cleanup and migration of files |
| `health.rs`, `misc.rs` | server metrics, uptime checks, cache purge, Resume Studio, AI log, system prompt |
| `restore.rs`, `drive.rs` | restore of backups, Google Drive |
| `mcp.rs` | the MCP endpoint: tools, resources, prompts |
| `ai_core.rs`, `ai_modes.rs` | AI settings, provider calls, writing modes, captions, health analyzer |
| `seo_admin.rs`, `indexing.rs` | SEO audit, crawl and fixer; Google Indexing API and automatic pings |
| `db.rs`, `export.rs` | database pool and ids, backup zip |

`crypto.rs` and `session.rs` read values written by the Node code (encrypted DB fields, the `session` cookie).
`tests/parity.rs` checks that against fixtures produced by Node.

## Run

```bash
pnpm dev            # Vite and a debug aiyu-server together (see the root README)
pnpm build          # the web bundle and the release server
pnpm start          # the release server
pnpm server:test
```

| Env | Default | |
|---|---|---|
| `JWT_SECRET` | required | signs the session cookie and encrypts stored secrets |
| `DATABASE_URL` | required | Postgres (a `?schema=` parameter is ignored); pool of 3 |
| `UPLOADS_DIR` | `public/uploads` | served at `/uploads/*`; files added to backups |
| `PUBLIC_DIR` | `public` | static files served at the site root |
| `WEB_DIR` | `web/dist` | the Vite build |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_ALLOWED_ID`, `GITHUB_OAUTH_CALLBACK_URL` | unset | GitHub sign-in |
| `BACKUP_TMP_DIR` | `.cache/backups` | scratch folder for backups and restores (must be on disk) |
| `GOOGLE_API_BASE_URL` | unset | tests only: a local stand-in for Google (Drive and Indexing) |
| `AI_API_BASE_URL` | unset | tests only: a local stand-in for the AI providers |
| `AI_GATEWAY_URL`, `AI_GATEWAY_API_KEY` | unset | Vercel AI Gateway defaults |
| `GITHUB_TOKEN` | unset | used when no token is stored in the admin settings |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | empty (login always fails) | password login; `$` in `.env` files is read by dotenv rules |
| `GITHUB_AUTH_ENABLED` | `false` | `true` turns password login off |
| `NODE_ENV` | unset | `production` turns on public caching; the session cookie is `Secure` unless this is `development` |
| `ANALYTICS_SALT` | `AUTH_SECRET`, then a constant | visitor hash salt |
| `SITE_URL` | `https://me.aiyu.co.in` | canonical URLs of blog posts |
| `RUST_WORKERS` | `2` | tokio worker threads; fewer threads, less memory |
| `RUST_LISTEN` | `0.0.0.0:8080` | |
| `CRON_RUNNER` | unset | `off` disables the scheduled tasks on this server |
| `TRUSTED_PROXIES` | empty | IPs/CIDRs (e.g. nginx, `127.0.0.1,172.16.0.0/12`) allowed to set `x-real-ip`, `x-forwarded-for`, `cf-connecting-ip`. From any other peer those headers are ignored. |

Reads `.env` from the working directory.

## Checks

Until the switch to SQLite, `scripts/perf/api-parity.mjs` can compare this server with an older build on the same
database (see the script's header). Browser tests, headless: `pnpm exec playwright test`.
