# Full Test Suite — Aiyu Portfolio

**Date:** 2026-06-16
**Status:** Approved
**Scope choice:** Critical paths + units (not exhaustive coverage, not deep admin CRUD)

## Problem

The app is feature-complete but has no automated tests. There is no unit-test
framework and no test files. Playwright is installed but used only for the
screenshot script (`scripts/capture-screenshots.mjs`). We want real automated
coverage — unit tests for logic and UI tests that drive the app with real
clicks — focused on the things that actually break, without brittle
exhaustive coverage.

## Stack

- **Unit / component:** Vitest (`jsdom` environment) + `@testing-library/react`
  + `@testing-library/user-event` + `@testing-library/jest-dom`.
  Chosen for ESM-native speed and fit with Next 16 + React 19.
- **UI e2e (auto clicks):** Playwright (`@playwright/test`), reusing the
  dev-server startup pattern already proven in `capture-screenshots.mjs`.

## Components / Units

### 1. Unit tests (Vitest, jsdom)
Pure logic — fast, deterministic, highest bug-density:

- `src/utils/fileValidation.js` — **security-critical**:
  - `validateFileSignature` matches/rejects magic numbers per MIME type.
  - `sanitizeFilename` strips directory traversal (`../`, `/`, `\`) and unsafe chars.
  - `validateFileSize` enforces `0 < size <= MAX_FILE_SIZE`.
  - `generateSecureFilename` produces a safe extension + unique name.
  - `validateUploadedFile` end-to-end: rejects wrong MIME, oversize, mismatched
    signature; accepts a valid PNG/JPEG buffer; HEIC fallback path.
- `src/lib/seoHelper.js`:
  - `generateSlug` lowercases, strips punctuation, collapses spaces/hyphens.
  - `truncateDescription` respects max length and appends `...`.
  - `generateMetadataObject` / `generatePageMetadata` return expected shape.
- `src/lib/httpCache.js`:
  - `createPublicCacheHeaders` returns the three cache-control headers with the
    given (and default) value.
- `src/utils/themeUtils.js`:
  - `applyThemeColors` sets expected CSS custom properties on
    `document.documentElement` and no-ops on missing data.

### 2. Component tests (Vitest + Testing Library + user-event)
Prove the component harness works with real user interactions:

- `src/app/components/ThemeToggle.js` — clicking toggles theme state/attribute.
- `src/app/components/landing/TicTacToe.js` — clicking cells advances turns and
  detects a win.

(Components must be importable in jsdom; if a component pulls in heavy
animation/browser-only deps, mock them or substitute a simpler target.)

### 3. UI e2e tests (Playwright — real clicks)
`playwright.config.js` with a `webServer` block that auto-starts `next dev`
(`reuseExistingServer` locally), so the whole suite runs with one command.
Specs in `e2e/`:

- **public-smoke.spec.js** — visit `/`, `/projects`, `/blogs`, `/gallery`,
  `/github`, `/contact-us`; assert page renders (a known heading/landmark
  visible) and no severe console/page errors.
- **navigation.spec.js** — click navbar links and verify URL + content change.
- **theme.spec.js** — click the theme toggle, assert `data-theme` flips and
  persists across reload.
- **admin-auth.spec.js** — go to `/admin`, fill `ADMIN_USERNAME` /
  `ADMIN_PASSWORD` (from env, same as the screenshot script, with the existing
  fallbacks), click submit, assert dashboard loads; and a wrong-password case
  asserting an error / no dashboard.

## Data flow / environment

- e2e reads admin credentials from `process.env` (`.env`), mirroring
  `capture-screenshots.mjs`. No new secrets introduced.
- `webServer` runs on `http://localhost:3000`; `baseURL` set so specs use
  relative paths.
- Unit tests need no server or DB.

## Error handling

- e2e smoke collects `console` errors and `pageerror` events and fails the test
  if severe errors occur (allowlist known noisy warnings if needed).
- Admin negative test confirms failed login does not reach the dashboard.
- Animations/async: use Playwright auto-waiting + explicit `expect(...).toBeVisible()`
  rather than fixed sleeps where practical.

## package.json scripts

- `test` → `vitest run`
- `test:watch` → `vitest`
- `test:ui` → `playwright test`
- `test:ui:headed` → `playwright test --headed`
- `test:all` → `vitest run && playwright test`

## Out of scope (by decision)

- Exhaustive per-page / per-component coverage.
- Deep admin CRUD flows (create/edit/delete) against a seeded test database.
- Visual regression / screenshot diffing (separate concern from the screenshot script).

## Success criteria

- `npm test` runs green with meaningful unit + component coverage of the units above.
- `npm run test:ui` boots the app and passes the public smoke, navigation, theme,
  and admin-auth flows with real clicks.
- No flakiness on a clean local run; clear docs in README/CONTRIBUTING for running tests.
