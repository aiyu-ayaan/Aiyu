# Admin Redesign Tracker

Branch `migrate/rust-vite`. Visual + markup pass only — no logic, no fetch URLs, no field names, no test selectors.

> [!IMPORTANT]
> Rules for every edit: theme variables and `adm-*` classes only; no Tailwind `dark:`;
> no new npm deps; icons from `react-icons/fa6`; keep what `e2e/admin-pages.spec.js` and
> `*.test.js` select; labels, focus rings, 44 px touch targets, no horizontal scroll at 375 px.

## Design foundation (done)

| File | What it is |
|---|---|
| `src/app/styles/admin.css` | Core `adm-*` class library — primitives, spacing, colour tokens |
| `src/app/components/admin/ui/index.js` | React primitives: `PageHeader`, `Panel`, `Stat`, `Badge`, `EmptyState`, `Loading`, `Field` |
| `src/app/components/admin/shell/AdminShell.js` | Sidebar + top bar |
| `src/app/components/admin/feedback/AdminFeedbackProvider.js` | `confirm()` / `toast()` context |

### Per-group CSS extras (import in each page that needs them)

| File | Used by |
|---|---|
| `admin-insights.css` | dashboard, analytics, SEO, social, health, github |
| `admin-system.css` | config, resources, settings, database, security, AI, MCP |
| `admin-showcase.css` | home, about, gallery, ai-page, resume |
| `admin-structure.css` | header, footer, contact, themes, desktop, terminal, ads |
| `admin-projects.css` | projects, apps |
| `admin-blogs.css` | blogs, legal |

---

## Group 1 — Dashboard & insights ✅ done

| File | Lines | CSS import | `Toast` legacy | Status |
|---|---|---|---|---|
| `_admin/page.js` (dashboard) | 341 | `admin-insights.css` ✅ | — | ✅ **done** |
| `_admin/analytics/LineChart.js` | 108 | — | — | ✅ done (integrated in analytics page) |
| `_admin/health/shared.js` | 28 | — | — | ✅ done (helper, no page) |
| `_admin/analytics/page.js` | ~380 | `admin-insights.css` ✅ | — | ✅ done |
| `_admin/seo/page.js` | 1080 | `admin-insights.css` ✅ | — | ✅ done |
| `_admin/social/page.js` | ~25 (thin shell) | `admin-insights.css` ✅ | — | ✅ done |
| `_admin/health/page.js` | ~600 | `admin-insights.css` ✅ | — | ✅ done |
| `_admin/github/page.js` | 745 | `admin-insights.css` ✅ | — | ✅ done |
| `components/admin/SocialMetaForm.js` | 690 | `admin-insights.css` ✅ | — | ✅ done |
| `components/admin/github/RepoSyncPanel.js` | 1056 | `admin-insights.css` ✅ | — | ✅ done |

### analytics/page.js — things to do
- Wire in `LineChart.js` (already built, sitting unused).
- Replace inline `<DonutSplit>` / `<WorldMap>` / `<BarList>` with `admin-insights.css` class wrappers.
- Tabs (`7d / 30d / 90d`) → `adm-tabs` / `adm-tab`.
- Clear-data confirm → `useAdminFeedback().confirm()` (not a bare `window.confirm`).

### seo/page.js — things to do
- Four tabs (Meta checker, Crawl audit, Robots & sitemap, Google indexing) → `adm-tabs`.
- `AuditGroup` panels: use `Panel flush` + `adm-list` / `adm-row`.
- `RobotsTab` / `IndexingTab` forms → `adm-split` / `adm-stack` layout with `adm-side` column.

### github/page.js — things to do
- Replace `<Toast>` import with `useAdminFeedback()`.
- Section toggle tiles → `adm-pick` or `adm-sc-choice`.
- `RepoSyncPanel` already uses `adm-*`; verify it matches the new patterns.

---

## Group 2 — Projects & apps ✅ done

| File | Lines | CSS import | `Toast` legacy | Status |
|---|---|---|---|---|
| `_admin/projects/page.js` | 434 | `admin-projects.css` ✅ | — | ✅ done |
| `_admin/projects/[id]/page.js` | 72 | `admin-projects.css` ✅ | — | ✅ done |
| `_admin/projects/new/page.js` | 25 | `admin-projects.css` ✅ | — | ✅ done |
| `_admin/apps/page.js` | 411 | `admin-projects.css` ✅ | — | ✅ done |
| `_admin/apps/[id]/page.js` | 73 | `admin-projects.css` ✅ | — | ✅ done |
| `_admin/apps/new/page.js` | 36 | `admin-projects.css` ✅ | — | ✅ done |
| `components/admin/ProjectForm.js` | 581 | `admin-projects.css` ✅ | `Toast` → shared feedback | ✅ done |
| `components/admin/DeploymentForm.js` | 674 | `admin-projects.css` ✅ | `Toast` → shared feedback | ✅ done |
| `components/admin/ProjectAppLinks.js` | 82 | inherited | — | ✅ done |
| `components/admin/BlogLinkInput.js` | 258 | inherited | — | ✅ done |

### projects/page.js — complete
- List view uses `Panel flush` + `adm-list` / `adm-row`.
- Search includes an explicit clear control; stats use `adm-stats` + `Stat`.
- Reorder handles use the projects-specific `adm-prj-drag` style and 44 px targets.

### apps/page.js — complete
- Uses the same responsive list, searchable filters, stats, and accessible reorder controls.
- Breadcrumb links back to Projects.

### ProjectForm.js / DeploymentForm.js — complete
- Main fields and publish/meta panels use the responsive `adm-prj-split` / `adm-prj-side` layout.
- The data model has one cover-image URL, so the existing upload/URL control and single `adm-prj-preview` are retained instead of introducing a multi-image gallery.
- `ProjectAppLinks` and `BlogLinkInput` use the shared `adm-list` / `adm-row` patterns.
- Form feedback uses `useAdminFeedback().toast`; no local legacy `Toast` state remains.

---

## Group 3 — Blogs & legal ✅ done

| File | Lines | CSS import | `Toast` legacy | Status |
|---|---|---|---|---|
| `_admin/blogs/page.js` | 479 | `admin-blogs.css` ✅ | — | ✅ done |
| `_admin/blogs/[id]/page.js` | 10 | `admin-blogs.css` ✅ | — | ✅ done |
| `_admin/blogs/new/page.js` | 6 | `admin-blogs.css` ✅ | — | ✅ done |
| `_admin/blogs/config/page.js` | 308 | `admin-blogs.css` ✅ | migrated to shared feedback | ✅ done |
| `_admin/legal/page.js` | 238 | `admin-blogs.css` ✅ | — | ✅ done |
| `_admin/legal/[id]/page.js` | 262 | `admin-blogs.css` ✅ | — | ✅ done |
| `_admin/legal/[id]/pages/[docId]/page.js` | 66 | `admin-blogs.css` ✅ | — | ✅ done |
| `_admin/legal/[id]/pages/new/page.js` | 78 | `admin-blogs.css` ✅ | — | ✅ done |
| `_admin/legal/new/page.js` | 35 | `admin-blogs.css` ✅ | — | ✅ done |
| `components/admin/BlogEditorForm.js` | 919 | `admin-blogs.css` ✅ | migrated to shared feedback | ✅ done |
| `components/admin/legal/LegalAppForm.js` | 229 | `admin-blogs.css` ✅ | — | ✅ done |
| `components/admin/legal/LegalDocumentForm.js` | 306 | `admin-blogs.css` ✅ | — | ✅ done |

### Blogs — complete
- List uses `Panel flush` + responsive `adm-list` / `adm-row` instead of a horizontally scrolling table.
- Status filters, API sorting, search, infinite loading, publish/review actions, and deletion remain available.
- Editor uses the full-width split layout, Markdown toolbar, SEO/social metadata, image upload previews, and shared feedback.
- Upload controls have visible focus, clear instructions, and disabled states while uploading.
- Blog settings retain the existing `admin-blogs.css` import and now use shared feedback.

### Legal — complete
- App and document directories use responsive lists, search, status badges, previews, and clear paths back to the app hub.
- The app editor pairs with its hub summary/delete panel; the document editor uses a split editor/publish layout with Markdown/HTML preview, SEO controls, and shared feedback.
- Editor pages use the wider content layout; format and preview controls expose pressed-button state.
- Legal search now has an inline clear control.

---

## Group 4 — Showcase ✅ complete

| File | Lines | CSS import | Status |
|---|---|---|---|
| `_admin/home/page.js` | ~180 | `admin-showcase.css` ✅ | ✅ **done** |
| `_admin/about/page.js` | ~180 | `admin-showcase.css` ✅ | ✅ done |
| `_admin/gallery/page.js` | ~200 | `admin-showcase.css` ✅ | ✅ done |
| `_admin/ai-page/page.js` | ~200 | `admin-showcase.css` ✅ | ✅ done |
| `_admin/resume/page.js` | ~180 | `admin-showcase.css` ✅ | ✅ done |
| `components/admin/HomeForm.js` | 770 | — | ✅ done |
| `components/admin/AboutForm.js` | 1056 | — | ✅ done |
| `components/admin/GalleryManager.js` | 974 | — | ✅ done |
| `components/admin/AiPageForm.js` | 169 | — | ✅ done |
| `components/admin/aiPage/*` | — | — | ✅ done |
| `components/admin/aiSections/*` | — | — | ✅ done |
| `components/admin/resume/*` | — | — | ✅ done |

### GalleryManager.js — things to do
- [x] Upload zone → `adm-sc-drop`.
- [x] Thumbnail grid → `adm-sc-gallery` / `adm-sc-photo` / `adm-sc-photo-media` / `adm-sc-photo-foot`.
- [x] Drag-to-reorder handles → `adm-sc-drag`; keyboard move-up/down controls are also available.
- [x] Upload and migration progress expose accessible progress state.
- [x] Migrate/WebP action → confirm via `useAdminFeedback()`.

### AboutForm.js / HomeForm.js — things to do
- [x] Section anchors → `adm-sc-anchor`.
- [x] Repeatable items (skills, links) → `adm-sc-item` / `adm-sc-item-head` / `adm-sc-item-body`.
- [x] Save bar → `adm-sc-save`.
- [x] Field grids → `adm-sc-fields`.

The AI-page, AI-section, and resume subcomponents already use the shared showcase primitives and feedback provider.

---

## Group 5 — Structure & appearance ✅ complete

| File | Lines | CSS import | `Toast` legacy | Status |
|---|---|---|---|---|
| `_admin/header/page.js` | 18 | `admin-structure.css` ✅ | — | ✅ done |
| `_admin/footer/page.js` | 330 | `admin-structure.css` ✅ | removed | ✅ done |
| `_admin/contact/page.js` | 572 | `admin-structure.css` ✅ | removed | ✅ done |
| `_admin/themes/page.js` | 437 | `admin-structure.css` ✅ | removed | ✅ done |
| `_admin/desktop/page.js` | 277 | `admin-structure.css` ✅ | removed | ✅ done |
| `_admin/terminal/page.js` | 18 | `admin-structure.css` ✅ | — | ✅ done |
| `_admin/ads/page.js` | 24 | `admin-structure.css` ✅ | — | ✅ done |
| `components/admin/HeaderForm.js` | 417 | — | removed | ✅ done |
| `components/admin/SocialForm.js` | 220 | — | removed | ✅ done |
| `components/admin/ThemeEditor.js` | 395 | — | removed | ✅ done |
| `components/admin/ThemePreviewCard.js` | 156 | — | — | ✅ done |
| `components/admin/TerminalForm.js` | 293 | — | removed | ✅ done |
| `components/admin/AdsForm.js` | 463 | — | removed | ✅ done |

### contact/page.js — things to do
- [x] Two-pane layout: message list + message detail + config form.
- [x] Message list → `adm-list` / `adm-row`. Search bar → `adm-input`.
- [x] Webhook panel → `adm-split` / `adm-stack`.
- [x] Notification status row → `Badge` states.
- [x] Replace legacy `Toast` → `useAdminFeedback()`.

### themes/page.js — things to do
- [x] Theme grid → `adm-theme-grid`.
- [x] `ThemePreviewCard` uses theme tokens; palette previews have accessible labels.
- [x] Variant toggle (Dark / Light) → accessible pressed-state controls.
- [x] Per-route dropdown list → `adm-list` / `adm-row` + `<select className="adm-input">`.
- [x] Replace legacy `Toast` → `useAdminFeedback()`.

### desktop/page.js — things to do
- [x] Wallpaper picker → responsive `adm-wallpaper-grid` / `adm-wallpaper-card` tiles.
- [x] Custom URL or `/uploads/` asset path field → `adm-input`.
- [x] Replace legacy `Toast` → `useAdminFeedback()`.

---

## Group 6 — System & developer ✅ complete

| File | Lines | CSS import | Status |
|---|---|---|---|
| `_admin/config/page.js` | ~180 | `admin-system.css` ✅ | ✅ **done** |
| `_admin/resources/page.js` | ~200 | `admin-system.css` ✅ | ✅ done |
| `_admin/settings/page.js` | ~185 | `admin-system.css` ✅ | ✅ done |
| `components/admin/ConfigForm.js` | 348 | — | ✅ done |
| `components/admin/StorageManager.js` | 696 | — | ✅ done |
| `_admin/ai/page.js` | 1342 | `admin-system.css` ✅ | ✅ done |
| `_admin/mcp/page.js` | 1135 | `admin-system.css` ✅ | ✅ done |
| `_admin/security/page.js` | 470 | `admin-system.css` ✅ | ✅ done |
| `_admin/database/page.js` | 1560 | `admin-system.css` ✅ | ✅ done |
| `_admin/api-reference/page.js` | — | — | ✅ done |

### ai/page.js — things to do
- [x] Tabs (Config, Generate, Logs, Models) → `adm-tabs`.
- [x] Provider cards use shared admin controls.
- [x] Log table → `adm-table-wrap` / `adm-table`.
- [x] Token usage meters → `MeterBar` from `health/shared.js`.

### mcp/page.js — things to do
- [x] Tabs → `adm-tabs`; each tab body in its own component.
- [x] Tool lists use `adm-list` / `adm-row`.
- [x] Annotation toggles use shared admin controls.
- [x] Token field → `adm-input` + copy button `adm-btn`.

### security/page.js — things to do
- [x] Two tabs (Sessions, Audit log) → `adm-tabs`.
- [x] Session cards and revoke actions use responsive admin primitives.
- [x] Audit table → `adm-table-wrap` / `adm-table`; category filters remain available.

### database/page.js — things to do
- [x] Backup collection selector uses the shared framed dialog pattern.
- [x] Collection selection uses shared admin controls.
- [x] Drive status panel → `adm-split`.
- [x] Long-running operations expose accessible progress state.
- [x] Import/export actions use admin button variants.

### StorageManager.js — things to do
- [x] File list → `adm-list` / `adm-row`.
- [x] Unreferenced-file section → `adm-panel adm-danger`.
- [x] Migration progress → `adm-sc-progress`.

`api-reference/page.js` already used the shared admin primitives and feedback provider, so no additional UI changes were needed.

---

## Cross-cutting: legacy `Toast` removal ✅ complete

All direct imports and uses of the legacy `Toast` component have been removed from admin pages and forms, including `ConfigForm.js`. The shared `AdminFeedbackProvider` is the single toast layer.

---

## Verification results

- [x] `pnpm lint` — 0 errors; 3 existing Next.js warnings.
- [x] `pnpm test` — 293 tests passed.
- [x] `pnpm web:build` — passed.
- [x] `pnpm server:build` — passed.
- [x] `pnpm exec next build --webpack` — compiled and generated pages; Next.js printed a security advisory reminder and the existing HEIC dependency emitted a webpack warning.
- [x] Runtime smoke check on port 8080 — `/api/health` returned 200, `/admin/login` returned 200, and signed-out `/admin` redirected.
- [ ] Admin screenshots and Playwright E2E — not run.

---

## Commit plan

One commit per group, explicit paths:

```
feat(admin): redesign group 1 — analytics, SEO, social, health, github pages
feat(admin): redesign group 2 — projects and apps pages + forms
feat(admin): redesign group 3 — blogs, blog config, and legal pages + forms
feat(admin): redesign group 4 — showcase component forms (home, about, gallery, ai-page, resume)
feat(admin): redesign group 5 — structure pages (contact, themes, desktop, footer, header, ads, terminal)
feat(admin): redesign group 6 — system pages (AI, MCP, security, database, storage)
```
