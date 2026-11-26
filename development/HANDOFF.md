# Handoff (2026-11-26)

Repository `/media/aiyu/550E85595197DBEC/development/aiyu`, branch `migrate/rust-vite`. Two jobs are open: the admin
redesign and the Rust migration. Plan and history: `development/TODO.md` (its "RESUME HERE" block is partly older
than this file), `server/README.md`, `design-system/MASTER.md`.

## Ground rules

- Commit locally on `migrate/rust-vite`, one group at a time, with explicit paths. Never push.
- Another process has written stray text into this checkout before: read `git diff` before every commit.
- `scripts/perf/write-parity.mjs`, `auth-parity.mjs`, `outbound-parity.mjs` write to the database: local only.
  Destructive tests use a copy named `aiyu_scratch` in the `aiyu-postgres` container, never the dev database.
- Only one `pnpm web:build` at a time, and restart `aiyu-server` after it (it loads `web/dist/index.html` at start).

## Local servers

Postgres: `pnpm db:up`. Next (upstream) listens on :3100, Rust on :8080.

```bash
pnpm build && pnpm start -p 3100 &
pnpm server:build && NEXT_UPSTREAM=http://127.0.0.1:3100 RUST_LISTEN=0.0.0.0:8080 TRUSTED_PROXIES=127.0.0.1 server/target/release/aiyu-server &
```

The running Next process was built before today's changes to Next code (`api/github/config`, `storageAudit.js`,
`cronRunner.js`): rebuild it before comparing those.

## Job 1: admin redesign

Done and committed (`f8388a6`): `src/app/styles/admin.css`, primitives in `src/app/components/admin/ui/`, shell,
dashboard, login. User feedback after it: redesign every individual screen and its items (rows, cards, forms,
toolbars, empty states), and leave no large empty space (the dashboard filled only half of a wide screen). The page
width cap was then raised to 120rem. Use the skills `ui-ux-pro-max` and `frontend-design:frontend-design`;
`design-system/MASTER.md` wins over their generic advice.

Six agents were stopped part way. Their edits are uncommitted, lint with 0 errors, and have NOT been built or looked
at. Review each file, finish it or restart it:

| Group | Pages and components | State |
|---|---|---|
| Dashboard and insights | `_admin/page.js`, `analytics`, `seo`, `social`, `health`, `github`; `SocialMetaForm`, `github/*` | partial: `page.js`, `analytics/LineChart.js`, `health/shared.js`, `admin-insights.css` |
| Projects and apps | `_admin/{projects,apps}`; `ProjectForm`, `DeploymentForm`, `ProjectAppLinks`, `BlogLinkInput` | nothing changed |
| Blogs and legal | `_admin/{blogs,legal}`; `BlogEditorForm`, `legal/*` | nothing changed |
| Showcase | `_admin/{home,about,gallery,ai-page,resume}`; `HomeForm`, `AboutForm`, `GalleryManager`, `AiPageForm`, `aiPage/*`, `aiSections/*`, `resume/*` | partial: the five `page.js` files, `admin-showcase.css` |
| Structure and appearance | `_admin/{header,footer,contact,themes,desktop,terminal,ads}`; `HeaderForm`, `SocialForm`, `ThemeEditor`, `ThemePreviewCard`, `TerminalForm` (not `TerminalPath`: the public header uses it) | nothing changed |
| System and developer | `_admin/{config,security,database,resources,settings,ai,mcp,api-reference}`; `ConfigForm`, `StorageManager` | partial: `config`, `resources`, `settings` pages, `ConfigForm.js`, `admin-system.css` |

Each partial `admin-*.css` must be imported by the pages that use it; check that.

Rules for page work: visual and markup changes only (same fetch URLs, payloads, state, routes, field names, storage
keys); theme variables and `adm-*` classes only, no Tailwind `dark:`; no new dependencies, icons from
`react-icons/fa6`; keep what `e2e/admin-pages.spec.js` and `*.test.js` select on; labels, focus rings, 44px touch
targets, no horizontal scroll at 375px. Give parallel agents disjoint files; they must not build, start servers or
commit.

Verify afterwards: `pnpm exec eslint src`, `pnpm vitest run`, `pnpm web:build`, restart Rust, screenshot pages in
dark and light at desktop and phone width (`scripts/perf/admin-shots.mjs`, untracked, unrun, check it first), then
once: `E2E_PORT=8080 pnpm exec playwright test e2e/admin-pages.spec.js` (about 12 minutes).

## Job 2: Rust migration (port everything to Rust, no Node sidecar: user's decision)

### State (updated 2026-11-27)

Cron jobs, MCP, the AI Core, the health analyzer, the SEO tools and the indexing pings are ported and committed.
`/api/debug-groq` was removed. Every `/api` route is Rust except `/api/internal/hooks`.

### Still to do

- SQLite (36 models plus a Postgres copy tool with row counts and hashes).
- Cutover. Rust must take over what Next still does: serving `public/` files, `/v1` and removed-page redirects, the
  `/admin` sign-in redirect, markdown negotiation on `/`, rate limits for all `/api`, security headers. Then remove
  Next, Prisma and Node from the image and benchmark on a 1 GB VM.

### How to port a route

Read the Next handler and its helpers; write the Rust handler (check the caller before reading the body; `write.rs`
helpers); register it in `limited_api()` for non-GET methods and in the anonymous-refusal test; compare with
`write-parity.mjs`; tick TODO.md; commit.

### Not verified anywhere (say so in reports)

Real Google Drive (OAuth, upload, download), GitHub OAuth callback, Telegram delivery, texlive.net compile, HEIC
from a real phone (tested with AVIF), the Docker image build with `libheif1`.

### Open product questions (kept as in Next)

`GET /api/blogs/{id}` returns unpublished drafts to anyone. Analytics counts the site's own referrals as external.
`master` still lacks sign-in checks on blog update/delete and contact message read/delete, and lists private GitHub
repos to anonymous callers.
