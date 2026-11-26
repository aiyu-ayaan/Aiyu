# Handoff (2026-11-27)

Repository `/media/aiyu/550E85595197DBEC/development/aiyu`, branch `migrate/rust-vite`. The Next.js to Rust + Vite
migration and the Postgres to SQLite switch are done and committed locally. Nothing is pushed.

## Ground rules

- Commit on `migrate/rust-vite`, one group at a time, with explicit paths. Never push unless the owner asks.
- `.claude/settings.json` was already modified before this work: leave it unstaged.
- **Stray text gets pasted into this checkout** (probably an editor with a repo file open). On 2026-11-27 it hit
  `server/migrations/0001_init.sql` twice; one paste looked like a Google OAuth code (removed, never committed, the
  owner was told). Read `git diff` before every commit.
- Write tests only against local copies. Never point anything at the dev or production database to try a write.

## What is in place

| Commit | Content |
|---|---|
| `2c64ae2` | Rust serves `public/`, uploads, old-address redirects |
| `95ea039`, `d83427b` | no Next server; Next code deleted. Local tag `pg-baseline` = last build on Postgres |
| `1582440` | SQLite: `server/src/db.rs`, `server/migrations/`, queries, FTS5 blog search, seed in `seed.rs` |
| `62a4380` | `aiyu-server import-postgres` and `healthcheck` |
| `03d8dc9`, `368bc7f` | nginx no longer caches 404s; the 404 page has the site header |
| `321d03e` | debian-slim image (213 MB), compose, CI, Prisma and Node scripts removed |
| after | `.env.example`, cutover step, updated root/guide/server docs, compose comments, this file |

Run: `pnpm dev`; `pnpm build && pnpm start`; checks: `pnpm lint`, `pnpm test`, `pnpm web:typecheck`,
`pnpm web:build`, `pnpm server:test`, `pnpm exec playwright test` (`E2E_PORT` points it at a running server).

The owner's local `.env` still names Postgres, so `pnpm dev` refuses to create a database. Either import once
(`pnpm db:up`, `pnpm server:build`, `server/target/release/aiyu-server import-postgres`) or set `START_EMPTY=true`.

## Verified on 2026-11-27

- Against `pg-baseline` on a copy of the local data: 20452 rows hash-equal after import; reads 738/762 (rest: new
  session and audit ids, tie order, request times, ports, blog search now returning posts); writes 522/523 (a port in
  a URL); exports equal.
- 126 Rust lib tests plus integration tests, 42 vitest, lint, typecheck, web build.
- Docker Compose rehearsal: server refuses to start before the import, import verifies, second import refuses.
- Docker, through nginx: public browser tests 44 passed, admin 50 passed and 2 skipped (before `368bc7f`; after the
  rebuild only the 404 status and header data were checked by curl). Spot checks in Chrome, no console errors.
- The owner's `backup_2026-11-23_02-18-35.zip` restored through the admin UI: re-export equal (19202 rows, 27
  collections, 685 uploads). Deleted a social link and a blog, restored the new export: equal again. The UI backup
  button produced a zip (save intercepted in the page).

## Left to do

1. Production cutover, by the owner: `development/docs/SQLITE_CUTOVER.md`. Production must have run the last Postgres
   release so its schema is current.
2. Final benchmark on a 1 GB VM. Measured locally: app container about 27 MB idle, 89 MB after the restore; native
   server 107 MB after a full read sweep, 71 MB with `MALLOC_ARENA_MAX=2` (set in the image); 145 MB after a load test.
3. Later: remove the `pg-import` cargo feature, the compose `postgres` service and `docker-compose.dev.local.yml`.

## Not verified

Real Google (Drive, Indexing), AI providers, GitHub OAuth callback, Telegram, a HEIC phone photo, CI on GitHub with
the new workflow. GitHub pages showed the rate-limit notice (anonymous quota used up on this machine). Opening Resume
Studio compiles the resume through texlive.net, which happened during the browser checks.

## Open questions for the owner

- `GET /api/blogs/{id}` returns unpublished drafts to anyone.
- Analytics counts the site's own referrals as external.
- `master` still lacks sign-in checks on blog update/delete and contact message read/delete, lists private GitHub
  repos to anonymous callers, and has `/api/debug-groq`, which returns part of the Groq key.
- `origin/master` is two commits ahead (version bump, changelog, `package-lock.json`).

## Left on this machine

- Compose project `aiyu-rehearsal` still runs on `http://localhost:18088` with the restored backup (test logins in
  `~/.claude/jobs/81ece368/tmp/rehearsal/env`). Remove it and its volumes with
  `docker compose -p aiyu-rehearsal down -v` (only this project).
- `~/.claude/jobs/81ece368/tmp/` holds copies of site data (`rehearsal/export*.zip`, `parity.db`, `backup/`) and the
  parity scripts. It is removed with the job.
- Database `aiyu_parity` in the `aiyu-postgres` container (a copy made for this work); images `aiyu:pg-baseline`,
  `aiyuayaan/aiyu:rehearsal`.
- A release server may still run on port 18080 or 18081 from the comparisons: check with `pgrep -af aiyu-server`.
