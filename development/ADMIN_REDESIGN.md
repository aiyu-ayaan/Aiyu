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

## Group 3 — Blogs & legal ⬜ not started

| File | Lines | CSS import | `Toast` legacy | Status |
|---|---|---|---|---|
| `_admin/blogs/page.js` | 488 | `admin-blogs.css` ✅ | — | ⬜ not started |
| `_admin/blogs/[id]/page.js` | 10 | — | — | ⬜ not started |
| `_admin/blogs/new/page.js` | 6 | — | — | ⬜ not started |
| `_admin/blogs/config/page.js` | 307 | — (missing!) | — | ⬜ not started |
| `_admin/legal/page.js` | 226 | `admin-blogs.css` ✅ | — | ⬜ not started |
| `_admin/legal/[id]/page.js` | 262 | — | — | ⬜ not started |
| `_admin/legal/[id]/pages/[docId]/page.js` | — | — | — | ⬜ not started |
| `_admin/legal/new/page.js` | — | — | — | ⬜ not started |
| `components/admin/BlogEditorForm.js` | 921 | — | — | ⬜ not started |
| `components/admin/legal/*` | — | — | — | ⬜ not started |

### blogs/page.js — things to do
- List: `Panel flush` + `adm-list` / `adm-row`. Status badge (Draft/Published) → `Badge tone="warn"/"ok"`.
- Filter tabs (All / Published / Drafts) → `adm-tabs`.
- `blogs/config/page.js` is missing its CSS import — add `admin-blogs.css`.

### BlogEditorForm.js — things to do
- `adm-page-wide` layout (full-width editor).
- `adm-split` xl: editor main + `adm-side` publish panel.
- Markdown toolbar → `MarkdownToolbar.js` already exists; wire `adm-btn` class.
- Tags, cover image → `adm-sc-drop`, `adm-sc-gallery`.

---

## Group 4 — Showcase ✅ partial

| File | Lines | CSS import | Status |
|---|---|---|---|
| `_admin/home/page.js` | ~180 | `admin-showcase.css` ✅ | ✅ **done** |
| `_admin/about/page.js` | ~180 | `admin-showcase.css` ✅ | ✅ done |
| `_admin/gallery/page.js` | ~200 | `admin-showcase.css` ✅ | ✅ done |
| `_admin/ai-page/page.js` | ~200 | `admin-showcase.css` ✅ | ✅ done |
| `_admin/resume/page.js` | ~180 | `admin-showcase.css` ✅ | ✅ done |
| `components/admin/HomeForm.js` | 770 | — | ⬜ not started |
| `components/admin/AboutForm.js` | 1056 | — | ⬜ not started |
| `components/admin/GalleryManager.js` | 974 | — | ⬜ not started |
| `components/admin/AiPageForm.js` | 169 | — | ⬜ not started |
| `components/admin/aiPage/*` | — | — | ⬜ not started |
| `components/admin/aiSections/*` | — | — | ⬜ not started |
| `components/admin/resume/*` | — | — | ⬜ not started |

### GalleryManager.js — things to do
- Upload zone → `adm-sc-drop`.
- Thumbnail grid → `adm-sc-gallery` / `adm-sc-photo` / `adm-sc-photo-media` / `adm-sc-photo-foot`.
- Drag-to-reorder handles → `adm-sc-drag`.
- Progress bar → `adm-sc-progress`.
- Migrate/WebP action → confirm via `useAdminFeedback()`.

### AboutForm.js / HomeForm.js — things to do
- Section anchors → `adm-sc-anchor`.
- Repeatable items (skills, links) → `adm-sc-item` / `adm-sc-item-head` / `adm-sc-item-body`.
- Save bar → sticky `adm-sc-save` bottom bar on mobile, panel in sidebar on desktop.
- Field grids → `adm-sc-fields`.

---

## Group 5 — Structure & appearance ⬜ not started

| File | Lines | CSS import | `Toast` legacy | Status |
|---|---|---|---|---|
| `_admin/header/page.js` | 18 | `admin-structure.css` ✅ | — | ⬜ not started |
| `_admin/footer/page.js` | 330 | `admin-structure.css` ✅ | `Toast` ⚠️ | ⬜ not started |
| `_admin/contact/page.js` | 572 | `admin-structure.css` ✅ | `Toast` ⚠️ | ⬜ not started |
| `_admin/themes/page.js` | 437 | `admin-structure.css` ✅ | `Toast` ⚠️ | ⬜ not started |
| `_admin/desktop/page.js` | 277 | `admin-structure.css` ✅ | `Toast` ⚠️ | ⬜ not started |
| `_admin/terminal/page.js` | 18 | `admin-structure.css` ✅ | — | ⬜ not started |
| `_admin/ads/page.js` | 24 | `admin-structure.css` ✅ | — | ⬜ not started |
| `components/admin/HeaderForm.js` | 417 | — | — | ⬜ not started |
| `components/admin/SocialForm.js` | 220 | — | — | ⬜ not started |
| `components/admin/ThemeEditor.js` | 395 | — | — | ⬜ not started |
| `components/admin/ThemePreviewCard.js` | 156 | — | — | ⬜ not started |
| `components/admin/TerminalForm.js` | 293 | — | — | ⬜ not started |
| `components/admin/AdsForm.js` | 463 | — | — | ⬜ not started |

> [!WARNING]
> `footer/page.js`, `contact/page.js`, `themes/page.js`, and `desktop/page.js` all import the
> legacy `Toast` component. Replace with `useAdminFeedback()` during the redesign pass.

### contact/page.js — things to do
- Two-pane layout: message list (left) + message detail + config form.
- Message list → `adm-list` / `adm-row`. Search bar → `adm-input`.
- Webhook panel → `adm-split` / `adm-stack`.
- Notification status row → `Badge tone="ok"/"warn"`.
- Replace `Toast` → `useAdminFeedback()`.

### themes/page.js — things to do
- Theme grid → `adm-theme-grid` (define in `admin-structure.css`; 2-col auto-fill).
- `ThemePreviewCard` → border + radius from tokens; active ring uses `var(--accent-cyan)`.
- Variant toggle (Dark / Light) → `adm-tabs`.
- Per-route dropdown list → `adm-list` / `adm-row` + `<select className="adm-input">`.
- Replace `Toast` → `useAdminFeedback()`.

### desktop/page.js — things to do
- Wallpaper picker → `adm-sc-gallery` / `adm-sc-choice` tiles.
- Custom URL field → `adm-input`.
- Replace `Toast` → `useAdminFeedback()`.

---

## Group 6 — System & developer ✅ partial

| File | Lines | CSS import | Status |
|---|---|---|---|
| `_admin/config/page.js` | ~180 | `admin-system.css` ✅ | ✅ **done** |
| `_admin/resources/page.js` | ~200 | `admin-system.css` ✅ | ✅ done |
| `_admin/settings/page.js` | ~185 | `admin-system.css` ✅ | ✅ done |
| `components/admin/ConfigForm.js` | 348 | — | ✅ done |
| `components/admin/StorageManager.js` | 696 | — | ⬜ not started |
| `_admin/ai/page.js` | 1342 | `admin-system.css` ✅ | ⬜ not started |
| `_admin/mcp/page.js` | 1135 | `admin-system.css` ✅ | ⬜ not started |
| `_admin/security/page.js` | 470 | `admin-system.css` ✅ | ⬜ not started |
| `_admin/database/page.js` | 1560 | `admin-system.css` ✅ | ⬜ not started |
| `_admin/api-reference/page.js` | — | — | ⬜ not started |

### ai/page.js — things to do
- Tabs (Config, Generate, Logs, Models) → `adm-tabs`.
- Provider cards → `adm-choice` / `adm-pick` toggles.
- Log table → `adm-table-wrap` / `adm-table`.
- Token usage meters → `MeterBar` from `health/shared.js`.

### mcp/page.js — things to do
- Eight tabs → `adm-tabs`; each tab body in its own component.
- Tool list (server, transports, capabilities, tools, resources, prompts, links, security) → `adm-list` / `adm-row`.
- Annotation toggles → `adm-pick` checkbox tiles.
- Token field → `adm-input` + copy button `adm-btn`.

### security/page.js — things to do
- Two tabs (Sessions, Audit log) → `adm-tabs`.
- Session cards: device icon + UA + IP + expiry → `adm-row !items-start`.
- Revoke button: `adm-btn` with `adm-danger` variant for current-device case.
- Audit table → `adm-table-wrap` / `adm-table`; category filter tabs nested inside `Panel flush`.

### database/page.js — things to do
- Backup collection selector popup → `adm-dialog adm-dialog-framed` with `adm-dialog-head` / `adm-dialog-foot`.
- Collection checkboxes → `adm-pick` tiles grouped by section.
- Drive status panel → `adm-split`.
- Streamed restore progress → `adm-sc-progress`.
- Import/export action buttons → `adm-btn adm-btn-primary`.

### StorageManager.js — things to do
- File list → `adm-list` / `adm-row`.
- Unreferenced-file section → `adm-panel adm-danger`.
- Migration progress → `adm-sc-progress`.

---

## Cross-cutting: legacy `Toast` removal

All pages below still import the old `Toast` component. During the redesign, replace each with `useAdminFeedback()`:

```js
// Before
import Toast from '@/app/components/admin/Toast';
...
const [notification, setNotification] = useState(null);
...
<Toast notification={notification} />

// After
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
...
const { toast } = useAdminFeedback();
toast.success('...');
toast.error('...');
// No JSX to add — feedback renders globally in the shell
```

Affected files:
- `_admin/footer/page.js`
- `_admin/contact/page.js`
- `_admin/themes/page.js`
- `_admin/desktop/page.js`
- `_admin/github/page.js`

---

## Verification checklist (run once all groups are done)

```bash
# 1. Lint
pnpm exec eslint src

# 2. Unit tests
pnpm vitest run

# 3. Vite build (admin is a Vite + React SPA in web/)
pnpm web:build

# 4. Restart Rust server (loads web/dist/index.html at startup)
pnpm server:build && NEXT_UPSTREAM=http://127.0.0.1:3100 RUST_LISTEN=0.0.0.0:8080 pnpm server:start

# 5. Screenshots (untracked helper, check it first)
node scripts/perf/admin-shots.mjs

# 6. E2E (~12 min)
E2E_PORT=8080 pnpm exec playwright test e2e/admin-pages.spec.js
```

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
