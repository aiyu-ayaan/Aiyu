# Aiyu: Rust + Vite migration tracking

Goal: run the whole site on a 1 GB VPS. Smallest possible size and memory, no data loss.
Target stack: axum (Rust) server + SQLite, Vite + React (TypeScript where practical) client, pnpm.
Branch: `migrate/rust-vite`. Baseline and method: `development/docs/PERFORMANCE.md`.

## ▶ RESUME HERE (handoff 2026-11-24)

Branch `migrate/rust-vite`. Ported and gated: `/games`, `/blogs`, `/about-me`. Then all `/admin` pages (user asked:
everything must keep working). Next: the other header pages, one per commit, with the recipe below: `/` (home), `/projects` + `/projects/[id]`, `/apps` + `/apps/[id]`, `/gallery`,
`/github`, `/contact-us`, `/ai` + `/ai/[section]`, `/sitemap`, legal `/[legalApp]`.

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
- [ ] `/blogs` read time: cache per post (keyed on `updatedAt`) if the ~70 ms matters
- [ ] `/admin`
- [ ] `/admin/about`
- [ ] `/admin/ads`
- [ ] `/admin/ai`
- [ ] `/admin/ai-page`
- [ ] `/admin/analytics`
- [ ] `/admin/api-reference`
- [ ] `/admin/apps`
- [ ] `/admin/apps/[id]`
- [ ] `/admin/apps/new`
- [ ] `/admin/blogs`
- [ ] `/admin/blogs/api`
- [ ] `/admin/blogs/config`
- [ ] `/admin/blogs/[id]`
- [ ] `/admin/blogs/new`
- [ ] `/admin/config`
- [ ] `/admin/config/crons`
- [ ] `/admin/config/crons/logs`
- [ ] `/admin/config/notification`
- [ ] `/admin/contact`
- [ ] `/admin/database`
- [ ] `/admin/deployments`
- [ ] `/admin/deployments/[id]`
- [ ] `/admin/deployments/new`
- [ ] `/admin/desktop`
- [ ] `/admin/footer`
- [ ] `/admin/footer/[id]`
- [ ] `/admin/footer/new`
- [ ] `/admin/gallery`
- [ ] `/admin/github`
- [ ] `/admin/header`
- [ ] `/admin/health`
- [ ] `/admin/home`
- [ ] `/admin/legal`
- [ ] `/admin/legal/[id]`
- [ ] `/admin/legal/[id]/pages/[docId]`
- [ ] `/admin/legal/[id]/pages/new`
- [ ] `/admin/legal/new`
- [ ] `/admin/login`
- [ ] `/admin/mcp`
- [ ] `/admin/projects`
- [ ] `/admin/projects/[id]`
- [ ] `/admin/projects/new`
- [ ] `/admin/resources`
- [ ] `/admin/resume`
- [ ] `/admin/security`
- [ ] `/admin/seo`
- [ ] `/admin/settings`
- [ ] `/admin/social`
- [ ] `/admin/terminal`
- [ ] `/admin/themes`
- [ ] `/admin/version`
- [ ] `/desktop`
- [x] `/games` (Vite, 2026-11-24)
- [x] `/games/[slug]` (Vite, 2026-11-24)
- [ ] `/[legalApp]`
- [ ] `/[legalApp]/[legalDoc]`
- [ ] `/v2`
- [x] `/v2/about-me`
- [ ] `/v2/ai`
- [ ] `/v2/ai/[section]`
- [ ] `/v2/apps`
- [ ] `/v2/apps/[id]`
- [x] `/v2/blogs`
- [x] `/v2/blogs/[id]`
- [ ] `/v2/contact-us`
- [ ] `/v2/gallery`
- [ ] `/v2/github`
- [ ] `/v2/projects`
- [ ] `/v2/projects/[id]`
- [ ] `/v2/sitemap`

## Milestone 8: Port API routes
- [ ] `/api/about`
- [ ] `/api/admin/ads`
- [ ] `/api/admin/ai/config`
- [ ] `/api/admin/ai/generate`
- [ ] `/api/admin/ai/logs`
- [ ] `/api/admin/ai/models`
- [ ] `/api/admin/ai/text`
- [ ] `/api/admin/ai/validate-provider`
- [ ] `/api/admin/analytics`
- [ ] `/api/admin/blogs/token`
- [ ] `/api/admin/crons`
- [ ] `/api/admin/crons/env`
- [ ] `/api/admin/crons/[id]`
- [ ] `/api/admin/crons/[id]/run`
- [ ] `/api/admin/crons/logs`
- [ ] `/api/admin/crons/preview`
- [ ] `/api/admin/crons/timezone`
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
- [ ] `/api/admin/health/targets`
- [ ] `/api/admin/health/uptime`
- [ ] `/api/admin/health/uptime/check`
- [ ] `/api/admin/icons`
- [ ] `/api/admin/images/upload`
- [ ] `/api/admin/import`
- [ ] `/api/admin/mcp/config`
- [ ] `/api/admin/mcp/token`
- [ ] `/api/admin/migrate-gallery`
- [ ] `/api/admin/notifications`
- [ ] `/api/admin/notifications/test`
- [ ] `/api/admin/purge-cache`
- [ ] `/api/admin/resume`
- [ ] `/api/admin/resume/compile`
- [ ] `/api/admin/resume/publish`
- [ ] `/api/admin/security/audit`
- [ ] `/api/admin/security/sessions`
- [ ] `/api/admin/security/sessions/[id]/revoke`
- [ ] `/api/admin/seo/audit`
- [ ] `/api/admin/seo/config`
- [ ] `/api/admin/seo/crawl`
- [ ] `/api/admin/seo/fix`
- [ ] `/api/admin/seo/index`
- [ ] `/api/admin/social`
- [ ] `/api/admin/storage`
- [ ] `/api/admin/storage/migrate`
- [ ] `/api/admin/storage/unreferenced`
- [ ] `/api/admin/system-prompt`
- [ ] `/api/ai/credits`
- [ ] `/api/ai/credits/[id]`
- [ ] `/api/ai/layout`
- [ ] `/api/ai-page`
- [ ] `/api/ai/prompts`
- [ ] `/api/ai/prompts/[id]`
- [ ] `/api/ai/recommendations`
- [ ] `/api/ai/recommendations/[id]`
- [ ] `/api/ai/seed`
- [ ] `/api/ai/skills`
- [ ] `/api/ai/skills/categories`
- [ ] `/api/ai/skills/categories/[id]`
- [ ] `/api/ai/skills/items`
- [ ] `/api/ai/skills/items/[id]`
- [ ] `/api/analytics/track`
- [ ] `/api/auth/github`
- [ ] `/api/auth/github/callback`
- [ ] `/api/auth/login`
- [ ] `/api/auth/logout`
- [ ] `/api/blogs`
- [ ] `/api/blogs/[id]`
- [ ] `/api/config`
- [ ] `/api/contact/message`
- [ ] `/api/debug-groq`
- [ ] `/api/deployments`
- [ ] `/api/deployments/[id]`
- [ ] `/api/deployments/[id]/links`
- [ ] `/api/deployments/reorder`
- [ ] `/api/desktop/source`
- [ ] `/api/desktop/widgets`
- [ ] `/api/favicon`
- [ ] `/api/gallery`
- [ ] `/api/github/config`
- [ ] `/api/github/stats`
- [ ] `/api/github/sync`
- [ ] `/api/github/webhook`
- [ ] `/api/global-search`
- [ ] `/api/header`
- [ ] `/api/health`
- [ ] `/api/home`
- [ ] `/api/legal/apps`
- [ ] `/api/legal/apps/[id]`
- [ ] `/api/legal/apps/[id]/documents`
- [ ] `/api/legal/documents/[id]`
- [ ] `/api/mcp`
- [ ] `/api/og-preview`
- [ ] `/api/projects`
- [ ] `/api/projects/[id]`
- [ ] `/api/projects/[id]/links`
- [ ] `/api/projects/reorder`
- [ ] `/api/resume`
- [ ] `/api/socials`
- [ ] `/api/socials/[id]`
- [ ] `/api/themes`
- [ ] `/api/themes/active`
- [ ] `/api/themes/[id]`
- [ ] `/api/upload`
- [ ] `/api/uploads/[filename]`
- [ ] `/api/version`
- [ ] `/.well-known/agent-skills/index.json`
- [ ] `/.well-known/agent-skills/[skill]/SKILL.md`
- [ ] `/.well-known/api-catalog`
- [ ] `/.well-known/jwks.json`
- [ ] `/.well-known/mcp/server-card.json`
- [ ] `/.well-known/oauth-authorization-server`
- [ ] `/.well-known/oauth-protected-resource`
- [ ] `/.well-known/openapi.json`
- [ ] `/.well-known/openid-configuration`

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
