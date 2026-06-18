# Resume Hub → Overleaf-style LaTeX editor

Date: 2026-06-18
Status: Approved

## Goal

Replace the structured (react-pdf) Resume Tailoring Hub at `/admin/resume` with a
full Overleaf-style LaTeX editor: a `.tex` code pane, a live PDF preview, and an
**Insert** panel that drops the owner's real projects / apps / experience into the
document as editable LaTeX. Support **multiple named resume documents** (create,
duplicate, rename, delete) with **one marked as the live site résumé**.

## Hard constraint (drives the architecture)

The production container is hardened: `read_only: true`, `cap_drop: ALL`, `/tmp`
mounted `noexec` at 100 MB. A server-side TeX engine cannot run. Therefore:

- **Compilation happens entirely in the admin's browser** via a WebAssembly TeX
  engine (SwiftLaTeX `PdfTeXEngine`). The server never compiles.
- On **Publish**, the browser sends the already-compiled PDF bytes to the server,
  which only **stores** them. The public site serves the last published PDF.
- Editing `.tex` without publishing leaves the live site unchanged (by design).

## Engine

- **SwiftLaTeX PdfTeXEngine**, vendored self-hosted under `public/swiftlatex/`
  (`PdfTeXEngine.js`, `swiftlatexpdftex.js`, `swiftlatexpdftex.wasm` ~1.77 MB).
- License: **EPL-2.0 OR GPL-2.0 WITH Classpath-exception** (safe to vendor/serve).
- No `SharedArrayBuffer` → no COOP/COEP headers required.
- `ENGINE_PATH` in the vendored `PdfTeXEngine.js` patched to the absolute path
  `/swiftlatex/swiftlatexpdftex.js` so the Worker resolves under any route.
- TeX packages are fetched on demand from `texlive2.swiftlatex.com` at compile
  time (external network dependency from the admin's browser). Acceptable for an
  admin-only tool; can be self-hosted later if flaky.
- Engine API used: `loadEngine()`, `writeMemFSFile(name, src)`,
  `setEngineMainFile(name)`, `compileLaTeX()` → `{ pdf:Uint8Array, status, log }`,
  `flushCache()`, `closeWorker()`.

## What gets removed

Per the "LaTeX replaces it" decision:

- `src/lib/resume/{render,template,resolveProfile}.js` and their tests.
- `@react-pdf/renderer` dependency and the `serverExternalPackages` entry in
  `next.config.mjs`.
- `src/app/components/admin/resume/{ContentEditor,ProfilesManager,controls}.js`.

Kept: `src/lib/resume/schema.js` — now purely a seed/data store for the Insert
panel and the default template.

## Data model (extend the `ResumeBuilder` singleton `data`)

```js
{
  schema: { ...existing master CV... },   // read-only data store for Insert
  latex: {
    documents: [
      {
        id: 'doc-default',
        name: 'Default',
        files: [{ name: 'main.tex', content: '<tex>' }],
        entry: 'main.tex',
        pdf: { data: '<base64>', filename: 'Ayaan-Ansari.pdf', compiledAt } | null,
        updatedAt
      }
    ],
    liveDocumentId: 'doc-default'
  }
}
```

- `config.resume` becomes `{ type: 'latex', value: { documentId } }`.
- `normalizeResumeData` is extended to add/repair the `latex` block (seeding a
  default `main.tex` from `schema.js` when missing). Legacy `profiles` keys are
  ignored. Files are an array now (single `main.tex` in v1) to allow a custom
  `.cls` later without a model change.

## APIs

- `GET/PUT /api/admin/resume` — read/write the `latex` documents + `schema`.
  PUT saves `.tex` sources only (never the PDF). Auth-gated.
- `POST /api/admin/resume/publish` — body `{ documentId, pdfBase64, filename }`.
  Auth-gated. Validates `%PDF` magic bytes + size cap (≤ 5 MB). Stores `pdf` on
  the document, sets `liveDocumentId`, sets `config.resume`, busts `db:resume`
  cache. (Server trusts admin-uploaded bytes — admin-only surface.)
- `GET /api/resume` — add `type === 'latex'` → decode and serve the live
  document's stored PDF (`inline`, `Cache-Control` like today). Removes the old
  `generated` react-pdf branch; legacy `file`/`url` branches kept.

## Snippet generation (`src/lib/resume/latexSnippets.js`)

Pure functions converting a record into an editable LaTeX snippet using macros
defined in the default template:

- `experienceSnippet({ role, company, location, start, end, bullets })`
- `projectSnippet({ name, stack, link, bullets })` (used for Projects + Apps)
- LaTeX-escaping helper for `& % $ # _ { } ~ ^ \`.

Insert sources, fetched live in the editor:

- **Projects** — Project model (existing projects API).
- **Apps / Deployments** — Deployment model (existing deployments API).
- **Experience** — About data (experience entries).

Clicking inserts the generated snippet at the cursor; it then belongs to the
source (snapshot, no live re-sync).

## Default template (`src/lib/resume/defaultTemplate.js`)

A single-file `main.tex` (Jake's-résumé style: `article` + `titlesec`,
`enumitem`, `hyperref`, `fontawesome5`) defining `\resumeExperience`,
`\resumeProject`, `\resumeItem`, pre-filled from `schema.js` so Insert macros
match out of the box. Used by the seed and as the lazy default document.

## Editor UI (`/admin/resume`)

Route-level only; all heavy assets (SwiftLaTeX wasm, CodeMirror) load via
`dynamic()` / lazy import and never enter the public bundle or
`ClientEnhancements` (root-bundle perf rule).

- **Left** — Documents panel: list with a **Default/Live** badge; New,
  **Duplicate** ("Copy of X"), Rename, Delete (not the last). A file switcher
  per document (single `main.tex` in v1).
- **Center** — CodeMirror 6 editor (`stex` highlighting) over the active file.
- **Right** — live PDF preview (object URL in an `<iframe>`), debounced
  auto-compile, plus a collapsible compile-log/error drawer.
- **Toolbar** — Insert ▾ (grouped Projects / Apps / Experience), Compile,
  **Publish to site** (compile → upload PDF → set live), Save.

"Set as default" requires a published PDF; if absent it compiles + publishes in
one step. The live document is served at `/api/resume`.

## Public site wiring

`config.resume.type === 'latex'` flows through the existing link logic: the
truthy `value.profileId`→`value.documentId` keeps `hasResume` working;
`layout.js` / `contact-us` already route everything non-`url` to `/api/resume`.
The seed sets `config.resume` to `{ type:'latex', value:{ documentId:'doc-default' } }`
and compiles nothing (the default document ships without a stored PDF until first
published; until then `/api/resume` returns 404 and the resume link hides — the
owner publishes once from the editor to go live).

## Testing

Browser-only wasm compile is verified manually. Automated coverage:

- `latexSnippets` generation + escaping (node env, pure).
- `normalizeResumeData` migration adds/repairs the `latex` block.
- `defaultTemplate` produces a non-empty `\documentclass` string.
- publish endpoint validation (rejects non-PDF, oversize, unauthenticated).
- `GET /api/resume` serves stored latex PDF / 404 when unpublished.

## Risks

1. **SwiftLaTeX package CDN** — compile fetches packages over the network from
   the admin browser. Mitigation: self-host packages later.
2. **Stale-until-publish** — public PDF only updates on Publish (by design).
3. **Trust** — server stores an admin-uploaded PDF without compiling; mitigated
   by auth + `%PDF`/size validation.
