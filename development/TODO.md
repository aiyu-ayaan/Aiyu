# Aiyu: Rust + Vite migration tracking

Goal: run the whole site on a 1 GB VPS. Smallest possible size and memory, no data loss.
Target stack: axum (Rust) server + SQLite, Vite + React (TypeScript where practical) client, pnpm.
Branch: `migrate/rust-vite`. Baseline and method: `development/docs/PERFORMANCE.md`.

## ▶ RESUME HERE (handoff 2026-11-26)

Branch `migrate/rust-vite`. EVERY page is now served by Rust + Vite: all public pages, legal, `/desktop`, `/games`,
and all `/admin` pages (`src/app/_admin/**/page.js`, routed by `web/src/routes/admin.tsx` through `import.meta.glob`;
Next ignores `_` folders). Next only serves `/api/*`, `/.well-known/*`, `/docs/*`, sitemap.xml/robots.txt, uploads.
Milestone 8 (API routes) IN PROGRESS.
- Done 2026-11-26: public GETs, auth + analytics/track, and every content write outside `/api/admin/*` (site
  documents, socials, themes, projects, deployments, gallery, blogs, legal, AI Hub, admin side of contact messages).
- Done: the plain `/api/admin/*` settings, security and analytics routes (`scripts/perf/writes/admin.mjs` 90/90;
  `scripts/perf/api/admin.txt` differs only in the order of analytics rows with equal counts).
- Decided 2026-11-26 (user): port every integration to Rust, no Node sidecar.
- Done: sitemap.xml, robots.txt, ads.txt, auth.md, /docs/api, /docs/mcp (byte-equal to Next apart from request-time
  `lastmod` values).
- NEXT: integrations (Drive, import, uploads/sharp/HEIC, crons, MCP, AI generation, GitHub OAuth, sync and webhook, SEO
  crawl and fix, contact form notifications, notification test, resume compile, storage) and the streamed restore.
- Done: contact form `POST`, notification service and test, link previews (`scripts/perf/outbound-parity.mjs` 18/18).
  Telegram delivery is checked by unit test only (its address is fixed). Rust refuses private addresses in
  `/api/og-preview`; Next (and `master`) fetch any address an anonymous caller names.
- Cutover also needs what Next's proxy and static serving still do for unported paths: `public/` files and uploads,
  `/v1` and `/v2` redirects, removed-page redirects, the `/admin` sign-in redirect, markdown negotiation on `/`.
- Checked 2026-11-26: write parity 249/249, auth parity all equal, read parity batch1 42/42, batch2 32/32, blogs 22/22,
  batch3 56/58 (the two request-time dates on search hits). In Chrome, signed in, through Rust: social link create,
  disable and delete; footer save; blog draft create, edit and delete; contact list; About save. Not checked in Chrome:
  projects, apps, gallery, themes, legal and AI Hub forms.
- Open: `github.txt` read parity needs a rerun (GitHub rate limited the machine and each server served its own stale
  copy). One vitest test failed once and passed in four reruns; which one was not captured. The admin browser tests take
  about 12 minutes; cause not checked.

Checks before each commit (commands in `server/README.md`): reads `scripts/perf/api-parity.mjs` with
`scripts/perf/api/<group>.txt`; sign-in `scripts/perf/auth-parity.mjs`; writes `scripts/perf/write-parity.mjs` with
`scripts/perf/writes/<group>.mjs`. The last two write to the database: local only.
Build exports for Rust (web/vite.config.mts `routeMeta`): ai-defaults.json, themes.json, discovery.json (the
/.well-known docs, rendered with a placeholder origin that Rust swaps for SITE_URL at startup).
Fixed on this branch 2026-11-26, still open on `master`: PUT/DELETE /api/blogs/{id} and GET/DELETE
/api/contact/message had no sign-in check.
Known pre-existing issues (kept for parity, ask the user): GET /api/blogs/{id} returns unpublished drafts to anyone.
Analytics treats only `localhost` as its own host (Next's `request.url` never carries the public host), so views
referred by the site itself are counted as `external`; fix: compare with SITE_URL's host (server/src/analytics.rs).
Then 5b/9 (SQLite), then 10 (cutover: remove Next).
Admin pages call `/api/*`, so they keep working while APIs move one by one.
e2e: `e2e/site-pages.spec.js` (public), `e2e/admin-pages.spec.js` (every admin route, one login; needs ADMIN_PASSWORD).

Start everything locally (Postgres must be up: `pnpm db:up`):
```bash
pnpm build                                   # Next (webpack) + Vite; if Next stops with SecurityFatalError, run again
pnpm start -p 3100 &                         # Next = upstream for unported pages
pnpm server:build && NEXT_UPSTREAM=http://127.0.0.1:3100 RUST_LISTEN=0.0.0.0:8080 pnpm server:start &
```
Restart aiyu-server after every `pnpm web:build`: it loads `web/dist/index.html` once at startup.
Run the bench with `--backups 3` at most per few minutes: login is rate limited (429) and the backup part is skipped.

### Recipe for porting one page
1. Split the Next page in `src/app/(site)/<page>/page.js` into a pure view component (in `src/app/components/...`)
   + data loading. Next keeps working with the same view (see `BlogsIndexView.js`, `V2Chrome.js`).
2. Rust (`server/src/pages.rs` data, `server/src/web.rs` route + head): same JSON shape as `src/lib/dataFetchers.js`,
   head tags = page metadata merged over the root layout (diff against Next's HTML, see the node one-liner in the
   session notes: compare `<title|meta|link>` tags), JSON-LD, crawler HTML for #root, 404/308 like Next.
3. Vite: route in `web/src/App.tsx` (lazy chunk if heavy), path in `web/src/appRoutes.ts` AND `server/src/lib.rs`.
   Data via `usePageData()` (`web/src/pageData.ts`): inline `#__DATA__` first, then `x-aiyu-data: 1` JSON fetches.
4. e2e spec (Next first, then Rust) -> delete the Next page -> commit.

### Recipe for porting one API route
1. Read the Next handler and the helpers it calls; note every status, body, header and side effect. Check that it
   checks the session: a missing check is a bug to fix in both, not to copy.
2. Write the handler in `server/src/admin_*.rs` using `write.rs`: check the caller before reading the body, keep
   Prisma's type rules (`write::prepare`), fill ids and timestamps, then `write::notify` with the same cache keys and pings.
3. Register it in `limited_api()` (`server/src/lib.rs`) and add it to the anonymous-refusal test in
   `server/tests/proxy.rs`.
4. Add cases to `scripts/perf/writes/<group>.mjs` (success, anonymous, missing, invalid) until all are equal.
5. Tick the route below -> commit one group at a time.

### Watch out
- Rust-owned pages get Next's page behavior from `server/src/compat.rs` (security headers, CDN cache policy,
  `Accept: text/markdown`, canonical host); keep the CSP in sync with next.config.mjs.
- Head diff + timing vs Next: snapshot every page from Next BEFORE deleting it (baselines of all remaining pages were
  taken 2026-11-24 in the session scratchpad; re-take if lost).
- Another process writes into this checkout while you work: a stray `Understood` line was appended to
  `src/proxy.js`, an email address was injected into `server/src/export.rs`, and commits `554a1c9`/`fe0abb2` are not
  part of this work. `git diff` before every commit; stage explicit paths only.
- The `.codegraph/daemon.sock` socket is why Tailwind scans only `src` (webpack hash crash).
- `next build` prints a Next.js security advisory and asks the agent to run `next upgrade --agent=security`. Not
  run; decide yourself whether to upgrade Next 16.4.1.
- Payload traps found so far: config `resume` (335 KB base64 PDF) and a 2 MB `data:` blog cover were shipped on
  every page by Next. Rust strips/redirects them; watch for the same in other pages' data.

## Decisions
- While Next and Rust both run, Rust reads and writes the same Postgres (sqlx, queries in `server/src/db.rs` and the route modules). SQLite replaces it in one step at cutover, so there is never a second copy of the data to drift. Rust admin routes check the `Session` row (revocation), not only the JWT.
- Strangler migration: axum sits in front, serves what is ported, reverse-proxies the rest to Next. Every commit leaves the site working. RAM only drops once Next is fully gone (both servers run during the transition).
- Client stays React: GSAP, framer-motion, three.js, CodeMirror run in the browser unchanged. Only Next-specific APIs are replaced (shims for `next/link`, `next/navigation`, `next/dynamic`).
- Data: Postgres stays the source of truth until a verified cutover. Migrate with a direct per-table copy (not the backup zip: export strips cron secrets and covers fewer collections than the 36 models). Verify row counts and per-row hashes.
- Rust must stay byte-compatible with: `src/lib/encryption.js` (encrypted DB fields), session/JWT cookies (`jose`), password/token hashes, `toClient`/`fromClient` JSON shapes, the backup zip format (old Drive backups must restore).
- TypeScript: new code (shims, API client, Rust-generated types via `ts-rs`) in TS; existing JS converted file by file with `allowJs`.

## Milestone 1: Baseline (DONE — 2026-11-24)
- [x] Branch `migrate/rust-vite`
- [x] Bench script `scripts/perf/bench.mjs` (RSS, route latency, backup memory)
- [x] Baseline numbers in `development/docs/PERFORMANCE.md`
- [x] Backup memory cause found: zip buffered whole (export `arrayBuffer` + `Buffer.from` + `Buffer.concat` in `uploadBackupToDrive`), every table loaded whole with `findMany()`; V8 keeps the grown heap

## Milestone 2: Remove v1 (DONE — 2026-11-24)
- [x] Delete `src/app/v1` and the 31 components only it used (plus classic `Header`/`Footer`, `V2BetaPopup`)
- [x] Remove `/admin/version`, `VersionForm`, the nav entry, the header "classic" link and its admin toggle; `defaultSiteVersion` no longer exposed (stored value left in place)
- [x] Proxy: clean URLs always rewrite to `/v2`; `/v1/*` 301 to the clean path; `/live-deployments` -> `/apps`, `/work-in-progress` -> `/`, `/gallery/<id>` -> `/gallery`
- [x] Legal pages (`/[legalApp]`) use the v2 shell
- [x] vitest 283 passed; Playwright 12 passed, 2 skipped (GitHub-mode); `next build` OK; client JS -9%

## Milestone 3: pnpm (DONE — 2026-11-24)
- [x] `pnpm import` kept the npm-locked versions; overrides, peer rule (eslint 10) and allowed build scripts in `pnpm-workspace.yaml`
- [x] Declared deps npm had hoisted silently: `@codemirror/{view,state,commands,language,autocomplete,search}`, `vite`, `@next/eslint-plugin-next`
- [x] Tailwind scans only `src` (`source("../../")`): root auto-detection pulled `.codegraph/daemon.sock` into webpack and crashed builds (`Cannot read properties of null (reading 'hash')`); also drops 30 classes that only appeared in docs (CSS 352 -> 318 KB)
- [x] Dockerfile (corepack, `node-linker=hoisted` so the standalone pruning paths stay valid), CI setup + workflows, README/AGENTS/docs commands
- [x] vitest 283 passed, lint clean, `next build` OK, Playwright 12 passed, `docker build` OK (image 694 MB)

## Milestone 4: axum skeleton (DONE — 2026-11-24)
- [x] `server/` crate: axum + tower-http (brotli/gzip, skips zips/PDF/fonts/video), `/_next/static` from disk (immutable), streaming reverse-proxy fallback to Next
- [x] Config from the same `.env`; `/healthz`; release profile (lto, strip, panic=abort): 3.75 MB binary
- [x] Parity: `encryption.js` decrypt/encrypt and session JWT verify, tested against Node-made fixtures (`server/tests/parity.rs`)
- [x] Playwright 12 passed through Rust (`E2E_PORT=8080`); Rust RSS 5-8 MB incl. 3 streamed backups
- [x] CI job `cargo test --locked`; `pnpm server:build|test|start`; graceful shutdown on SIGTERM and SIGINT
- [x] Tune for 1 GB: 2 worker threads by default (`RUST_WORKERS`), brotli quality 4
- [ ] Allocator check (mimalloc vs glibc) once more routes run in Rust

## Milestone 5: Backups without memory spikes (IN PROGRESS)
- [x] Rust `GET /api/admin/export`: session check (JWT + `Session` row), rows streamed from Postgres (`row_to_json`, one row at a time) with the `toClient` rules, uploads streamed from disk; 702/702 entries match the Node export (deep JSON compare, byte-equal uploads). 0.69 s vs 2.5 s, Rust RSS ~10 MB
- [x] Node `gdrive/backup` streams the export to a temp file and uploads a file-backed Blob (same multipart bytes); Next RSS over 8 backups: 203 -> 293 MB flat (was 213 -> 486 MB and climbing)
- [x] Cron `gdrive_backup` writes the zip to a temp file and adds images by path (no zip buffer)
- [x] Cron `gdrive_backup` downloads the zip from Rust over loopback (`AIYU_SERVER_URL`, key = HMAC(JWT_SECRET, "internal:export"), loopback peers only); falls back to the Node zip when Rust is absent (`pnpm dev`)
- [x] Manual Drive backup fetches the export over loopback in Docker instead of through the public origin/CDN
- [ ] Restore (`gdrive/restore`, `admin/import`) still buffers the whole zip: stream it
- [ ] Verify a real Drive upload with OAuth credentials (not possible locally)

## Milestone 5a: Rust in the Docker image
- [x] Rust build stage; entrypoint runs Next on `127.0.0.1:3001` and aiyu-server on the public port; either exiting stops the container; SIGTERM forwarded
- [x] `TRUSTED_PROXIES`: loopback by default, private ranges in docker-compose.yml (nginx on the compose network)
- [x] Container verified: migrations, seed, pages, redirects, brotli, backups (0.7 s, 312-347 MB peak vs 573 MB); see PERFORMANCE.md
- [x] Image and CI on Node 24 LTS (Node 20 is EOL and its `Readable.fromWeb` made backups take 28 s)

## Milestone 5b: Data layer (SQLite, at cutover)
- [ ] SQLite schema for all 36 models (Json -> TEXT json, String[] -> TEXT json, insensitive search -> COLLATE NOCASE)
- [ ] `pg -> sqlite` copy tool with row-count and hash verification

## Milestone 6: Vite client (DONE — 2026-11-24)
- [x] `web/`: Vite 8 + React 19 + react-router 7 + `@tailwindcss/vite`, TypeScript (shared components stay JS, `allowJs`); assets under `/_app/` (immutable), fonts self-hosted via @fontsource
- [x] Shims (TS): `next/link` (client nav inside the app, full load to Next pages), `next/navigation`, `next/dynamic`, `next/script`; `next/image` when a page needs it
- [x] App shell = client half of the root layout; pre-paint scripts shared via `src/lib/prepaintScripts.js`
- [x] Rust `web.rs`: shell with root-layout head (title, description, canonical, OG/Twitter, icons) + `#__DATA__` (logo, GA id withheld for admins, AdSense client); values HTML-escaped, `<` escaped in JSON; 404 status for unknown paths
- [x] `pnpm build` = Next + Vite; Docker copies `web/dist`, `WEB_DIR`

## Milestone 7: Port pages one by one (IN PROGRESS)
Each page: Rust data + head + Vite route + e2e passing through Rust, then the Next page is deleted.
- [x] `/v2` folder removed: public pages live in `src/app/(site)` at their real paths (old `/v2/*` -> 308)
- [x] v2 chrome shared (`V2Chrome.js`, `applyResumeLink`); Rust `shell_data` (header, socials, public config without the resume body, about name, version)
- [x] `/blogs`, `/blogs/[id]` (Rust + Vite, 2026-11-24): e2e `e2e/blogs.spec.js` passes on Next and Rust, Next pages deleted, `Vary: x-aiyu-data`; numbers in PERFORMANCE.md
- [x] TCP_NODELAY on accepted sockets (~40 ms per kept-alive response); Next RSC prefetches of Vite pages get an empty reply
- [ ] `/` embeds the base64 resume PDF (Next): strip it in the `/` port
- [ ] `/ai` ships every skill twice (page data + a 695 KB JSON-LD ItemList): 1.4 MB. Trim the hub to the preview
  items (AiHub derives counts from the data, so pass totalCount) and decide whether the ItemList belongs on /ai/skills only
- [ ] Vite entry chunk grew 488 -> 569 KB during the page ports (admin route table ~23 KB); find the rest with a
  sourcemap build and move it into route chunks
- [ ] `/blogs` read time: cache per post (keyed on `updatedAt`) if the ~70 ms matters
- [x] `/admin`
- [x] `/admin/about`
- [x] `/admin/ads`
- [x] `/admin/ai`
- [x] `/admin/ai-page`
- [x] `/admin/analytics`
- [x] `/admin/api-reference`
- [x] `/admin/apps`
- [x] `/admin/apps/[id]`
- [x] `/admin/apps/new`
- [x] `/admin/blogs`
- [x] `/admin/blogs/api`
- [x] `/admin/blogs/config`
- [x] `/admin/blogs/[id]`
- [x] `/admin/blogs/new`
- [x] `/admin/config`
- [x] `/admin/config/crons`
- [x] `/admin/config/crons/logs`
- [x] `/admin/config/notification`
- [x] `/admin/contact`
- [x] `/admin/database`
- [x] `/admin/deployments`
- [x] `/admin/deployments/[id]`
- [x] `/admin/deployments/new`
- [x] `/admin/desktop`
- [x] `/admin/footer`
- [x] `/admin/footer/[id]`
- [x] `/admin/footer/new`
- [x] `/admin/gallery`
- [x] `/admin/github`
- [x] `/admin/header`
- [x] `/admin/health`
- [x] `/admin/home`
- [x] `/admin/legal`
- [x] `/admin/legal/[id]`
- [x] `/admin/legal/[id]/pages/[docId]`
- [x] `/admin/legal/[id]/pages/new`
- [x] `/admin/legal/new`
- [x] `/admin/login`
- [x] `/admin/mcp`
- [x] `/admin/projects`
- [x] `/admin/projects/[id]`
- [x] `/admin/projects/new`
- [x] `/admin/resources`
- [x] `/admin/resume`
- [x] `/admin/security`
- [x] `/admin/seo`
- [x] `/admin/settings`
- [x] `/admin/social`
- [x] `/admin/terminal`
- [x] `/admin/themes`
- [x] `/admin/version`
- [x] `/desktop`
- [x] `/games` (Vite, 2026-11-24)
- [x] `/games/[slug]` (Vite, 2026-11-24)
- [x] `/[legalApp]`
- [x] `/[legalApp]/[legalDoc]`
- [x] `/v2`
- [x] `/v2/about-me`
- [x] `/v2/ai`
- [x] `/v2/ai/[section]`
- [x] `/v2/apps`
- [x] `/v2/apps/[id]`
- [x] `/v2/blogs`
- [x] `/v2/blogs/[id]`
- [x] `/v2/contact-us`
- [x] `/v2/gallery`
- [x] `/v2/github`
- [x] `/v2/projects`
- [x] `/v2/projects/[id]`
- [x] `/v2/sitemap`

## Milestone 8: Port API routes
- [x] `/api/about` (Rust)
- [x] `/api/admin/ads` (Rust)
- [ ] `/api/admin/ai/config`
- [ ] `/api/admin/ai/generate`
- [ ] `/api/admin/ai/logs`
- [ ] `/api/admin/ai/models`
- [ ] `/api/admin/ai/text`
- [ ] `/api/admin/ai/validate-provider`
- [x] `/api/admin/analytics` (Rust)
- [x] `/api/admin/blogs/token` (Rust)
- [ ] `/api/admin/crons`
- [ ] `/api/admin/crons/env`
- [ ] `/api/admin/crons/[id]`
- [ ] `/api/admin/crons/[id]/run`
- [ ] `/api/admin/crons/logs`
- [ ] `/api/admin/crons/preview`
- [x] `/api/admin/crons/timezone` (Rust)
- [x] `/api/admin/export` (Rust)
- [ ] `/api/admin/gdrive/auth`
- [ ] `/api/admin/gdrive/backup`
- [ ] `/api/admin/gdrive/callback`
- [ ] `/api/admin/gdrive/config`
- [ ] `/api/admin/gdrive/cron`
- [ ] `/api/admin/gdrive/delete`
- [ ] `/api/admin/gdrive/disconnect`
- [ ] `/api/admin/gdrive/list`
- [ ] `/api/admin/gdrive/restore`
- [ ] `/api/admin/gdrive/status`
- [ ] `/api/admin/health/analyze`
- [ ] `/api/admin/health/metrics`
- [x] `/api/admin/health/targets` (Rust)
- [ ] `/api/admin/health/uptime`
- [ ] `/api/admin/health/uptime/check`
- [ ] `/api/admin/icons`
- [ ] `/api/admin/images/upload`
- [ ] `/api/admin/import`
- [x] `/api/admin/mcp/config` (Rust)
- [x] `/api/admin/mcp/token` (Rust)
- [ ] `/api/admin/migrate-gallery`
- [x] `/api/admin/notifications` (Rust)
- [x] `/api/admin/notifications/test` (Rust)
- [ ] `/api/admin/purge-cache`
- [ ] `/api/admin/resume`
- [ ] `/api/admin/resume/compile`
- [ ] `/api/admin/resume/publish`
- [x] `/api/admin/security/audit` (Rust)
- [x] `/api/admin/security/sessions` (Rust)
- [x] `/api/admin/security/sessions/[id]/revoke` (Rust)
- [ ] `/api/admin/seo/audit`
- [x] `/api/admin/seo/config` (Rust)
- [ ] `/api/admin/seo/crawl`
- [ ] `/api/admin/seo/fix`
- [ ] `/api/admin/seo/index`
- [x] `/api/admin/social` (Rust)
- [ ] `/api/admin/storage`
- [ ] `/api/admin/storage/migrate`
- [ ] `/api/admin/storage/unreferenced`
- [ ] `/api/admin/system-prompt`
- [x] `/api/ai/credits` (Rust)
- [x] `/api/ai/credits/[id]` (Rust)
- [x] `/api/ai/layout` (Rust)
- [x] `/api/ai-page` (Rust)
- [x] `/api/ai/prompts` (Rust)
- [x] `/api/ai/prompts/[id]` (Rust)
- [x] `/api/ai/recommendations` (Rust)
- [x] `/api/ai/recommendations/[id]` (Rust)
- [x] `/api/ai/seed` (Rust)
- [x] `/api/ai/skills` (Rust)
- [x] `/api/ai/skills/categories` (Rust)
- [x] `/api/ai/skills/categories/[id]` (Rust)
- [x] `/api/ai/skills/items` (Rust)
- [x] `/api/ai/skills/items/[id]` (Rust)
- [x] `/api/analytics/track` (Rust)
- [ ] `/api/auth/github` (Next; writes the same Session row and cookie)
- [ ] `/api/auth/github/callback`
- [x] `/api/auth/login` (Rust)
- [x] `/api/auth/logout` (Rust)
- [x] `/api/blogs` (Rust)
- [x] `/api/blogs/[id]` (Rust)
- [x] `/api/config` (Rust)
- [x] `/api/contact/message` (Rust)
- [ ] `/api/debug-groq`
- [x] `/api/deployments` (Rust)
- [x] `/api/deployments/[id]` (Rust)
- [x] `/api/deployments/[id]/links` (Rust)
- [x] `/api/deployments/reorder` (Rust)
- [x] `/api/desktop/source` (Rust)
- [x] `/api/desktop/widgets` (Rust)
- [x] `/api/favicon` (Rust)
- [x] `/api/gallery` (Rust)
- [ ] `/api/github/config`
- [x] `/api/github/stats` (Rust; reqwest now has rustls. Without a token the event fallback series follows the
  server's local date in Node and UTC in Rust: equal only under TZ=UTC, as in Docker. Not re-checked under TZ=UTC)
- [ ] `/api/github/sync`
- [ ] `/api/github/webhook`
- [x] `/api/global-search` (Rust)
- [x] `/api/header` (Rust)
- [x] `/api/health` (Rust)
- [x] `/api/home` (Rust)
- [x] `/api/legal/apps` (Rust)
- [x] `/api/legal/apps/[id]` (Rust)
- [x] `/api/legal/apps/[id]/documents` (Rust)
- [x] `/api/legal/documents/[id]` (Rust)
- [ ] `/api/mcp`
- [x] `/api/og-preview` (Rust)
- [x] `/api/projects` (Rust)
- [x] `/api/projects/[id]` (Rust)
- [x] `/api/projects/[id]/links` (Rust)
- [x] `/api/projects/reorder` (Rust)
- [x] `/api/resume` (Rust)
- [x] `/api/socials` (Rust)
- [x] `/api/socials/[id]` (Rust)
- [x] `/api/themes` (Rust)
- [x] `/api/themes/active` (Rust)
- [x] `/api/themes/[id]` (Rust)
- [ ] `/api/upload`
- [ ] `/api/uploads/[filename]`
- [x] `/api/version` (Rust)
- [x] `/.well-known/agent-skills/index.json` (Rust)
- [x] `/.well-known/agent-skills/[skill]/SKILL.md` (Rust)
- [x] `/.well-known/api-catalog` (Rust)
- [x] `/.well-known/jwks.json` (Rust)
- [x] `/.well-known/mcp/server-card.json` (Rust)
- [x] `/.well-known/oauth-authorization-server` (Rust)
- [x] `/.well-known/oauth-protected-resource` (Rust)
- [x] `/.well-known/openapi.json` (Rust)
- [x] `/.well-known/openid-configuration` (Rust)

## Milestone 9: Models in SQLite
- [ ] `Blog`
- [ ] `Project`
- [ ] `Deployment`
- [ ] `LegalApp`
- [ ] `LegalDocument`
- [ ] `Gallery`
- [ ] `ContactMessage`
- [ ] `AiLog`
- [ ] `Cron`
- [ ] `CronLog`
- [ ] `Session`
- [ ] `AuditLog`
- [ ] `UptimeTarget`
- [ ] `UptimeCheck`
- [ ] `AnalyticsEvent`
- [ ] `AnalyticsDaily`
- [ ] `Social`
- [ ] `Theme`
- [ ] `Config`
- [ ] `Ads`
- [ ] `SeoConfig`
- [ ] `IndexingLog`
- [ ] `About`
- [ ] `Home`
- [ ] `Header`
- [ ] `NotificationConfig`
- [ ] `GitHub`
- [ ] `CronEnv`
- [ ] `McpConfig`
- [ ] `AiPage`
- [ ] `ResumeStudio`
- [ ] `AiSkillCategory`
- [ ] `AiSkill`
- [ ] `AiRecommendation`
- [ ] `AiCredit`
- [ ] `AiPrompt`

## Milestone 10: Cutover
- [ ] Copy production Postgres -> SQLite, verify counts and hashes
- [ ] Remove Next.js, Prisma, Node from the runtime image; Docker image on a Rust binary + static files
- [ ] Final bench vs baseline on a 1 GB VM
