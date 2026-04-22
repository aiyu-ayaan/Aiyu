# AGENTS.md

Operational guide for AI/dev agents working in this repository.

## 1. Project Snapshot

- Stack: Next.js 16, React 19, Tailwind CSS 4, MongoDB (Mongoose), Framer Motion
- Public routes: `src/app/(site)`
- Admin routes: `src/app/admin`
- API routes: `src/app/api`
- Scripts: `scripts/`

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
| `npm run dev` | Start local development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run screenshots:install` | Install Playwright Chromium |
| `npm run screenshots:public` | Capture screenshots of non-admin public pages |
| `npm run docker:up` | Start production containers |
| `npm run docker:up:dev` | Start development containers |
| `npm run docker:down` | Stop containers |

## 5. Editing Guidelines

- Keep components focused and reusable.
- Reuse existing utilities before introducing new abstractions.
- For data changes, preserve cache invalidation behavior.
- For API updates, keep backward compatibility when possible.
- Add concise comments only where logic is non-obvious.

## 6. Testing Checklist

Before finishing a task:

1. Run `npm run lint`.
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
