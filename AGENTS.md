# AGENTS.md

Operational guide for AI/dev agents working in this repository.

## 1. Project Snapshot

- Stack: Rust (Axum), Vite, React 19, Tailwind CSS 4, SQLite (`data/aiyu.db`), Framer Motion, GSAP
- Frontend SPA: `web/` (Vite config, React Router entry, route modules in `web/src/routes/`)
- Shared UI & libs: `src/` (`src/app/` components/contexts/hooks/styles, `src/lib/`, `src/utils/`)
- Backend server: `server/` (Axum API, SPA & static file serving, embedded SQLite migrations in `server/migrations/`, cron runner)
- Scripts: `scripts/` (dev runner, security checks, screenshots, recordings, perf & HyperFrames helpers)

## 2. Core Rules

- Do not break admin authentication or protected routes.
- Keep public UI changes responsive on mobile and desktop.
- Prefer small, atomic commits for each logical stage.
- Never commit secrets from `.env` or generated credentials.
- Do not remove existing behavior unless explicitly requested.

## 3. CodeGraph Workflow

This project has `.codegraph/` initialized.

- For exploration tasks, prefer CodeGraph-first workflows.
- Use lightweight queries for focused lookups:
  - `codegraph_search`
  - `codegraph_callers`
  - `codegraph_callees`
  - `codegraph_impact`
  - `codegraph_node`
- If deep exploration is needed, run it in a dedicated explore agent to avoid context bloat in the main session.

## 4. Development Commands

| Command | Use |
|---------|-----|
| `pnpm dev` | Start Vite (`:3000`) and debug `aiyu-server` (`:8080`) together |
| `pnpm build` | Build Vite bundle (`web/dist`) and release Rust server |
| `pnpm start` | Run release `aiyu-server` binary |
| `pnpm lint` | Run ESLint |
| `pnpm web:typecheck` | Type-check the Vite/TypeScript frontend (`web/tsconfig.json`) |
| `pnpm web:build` | Build Vite frontend bundle only |
| `pnpm server:build` | Build release Rust server only |
| `pnpm server:test` | Run Rust unit and integration tests |
| `pnpm test` | Run Vitest unit/component tests |
| `pnpm test:ui` | Run Playwright end-to-end tests |
| `pnpm screenshots:install` | Install Playwright Chromium |
| `pnpm screenshots:capture` | Capture screenshots of site pages |
| `pnpm docker:up` | Start production containers (`docker-compose.yml`) |
| `pnpm docker:up:dev` | Build and start local Docker stack (`docker-compose.local.yml`) |
| `pnpm docker:down` | Stop containers |
| `pnpm db:up` / `pnpm db:down` | Start/stop optional Postgres + pgAdmin (`docker-compose.dev.local.yml`, for `import-postgres` only) |

## 5. Editing Guidelines

- Keep components focused and reusable.
- Reuse existing utilities before introducing new abstractions.
- For data changes, preserve cache invalidation behavior.
- For API updates, keep backward compatibility when possible.
- Add concise comments only where logic is non-obvious.

## 6. Testing Checklist

Before finishing a task:

1. Run `pnpm lint`, `pnpm web:typecheck`, `pnpm test`, and `pnpm server:test`.
2. Manually verify changed routes/pages.
3. Confirm API responses still match existing clients.
4. If UI changed, capture updated screenshots when relevant.

## 7. Commit Convention

Use conventional commits:

- `feat(scope): ...`
- `fix(scope): ...`
- `refactor(scope): ...`
- `docs(scope): ...`
- `chore(scope): ...`

Preferred flow:

1. Implement one stage.
2. Run checks.
3. Commit that stage.
4. Repeat for the next stage.

## 8. PR Notes

When opening a PR, include:

- What changed
- Why it changed
- Any migration/setup steps
- Screenshots for UI updates
- Risks or known limitations
