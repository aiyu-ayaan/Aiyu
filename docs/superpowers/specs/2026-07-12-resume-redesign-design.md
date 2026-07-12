# Design Spec: Resume Studio UI Redesign

A design specification for cleaning up, refactoring, and polishing the Resume Studio page (`/admin/resume`) to resolve clutter, fix double scrollbars, and create a premium, IDE-like editing experience.

## 1. Goals & Success Criteria
* **No Double Scrollbars**: Lock the page height to the viewport (`100vh - 64px`) and disable outer scrolling.
* **Streamlined Toolbar**: Consolidate secondary controls (LaTeX engine, auto-save, auto-compile) into a unified "Configure" dropdown popover, preventing wrapping and clutter on standard screens.
* **Contextual Tabs**: Move the Visual / Code editor mode toggle from the main toolbar to a tabbed header at the top of the editor pane, mimicking professional code editors (like VS Code or Overleaf).
* **High Polish & Transitions**: Apply premium dark-theme styles, clean visual states (`:active` press-scaling, custom easing), and distinct status labels.

## 2. Layout Structure
* **Outer Wrapper**: `h-[calc(100vh-64px)] overflow-hidden flex flex-col p-3 bg-slate-950 gap-3`
* **Split Workspace**: `flex flex-1 min-h-0 gap-3 overflow-hidden`
  * Left Editor Panel: `flex flex-1 flex-col min-w-0 rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden`
  * Right Preview Panel: `flex flex-1 flex-col min-w-0 gap-3 overflow-hidden`
  * Right Sidebar: `w-72 shrink-0 hidden lg:flex flex-col rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden`

## 3. Component Details

### A. Toolbar
* Compact document name `Resume Studio` and a tiny pulsing save indicator.
* **Primary buttons**:
  * `Compile` (cyan themed button, play icon, triggers save + compile)
  * `Publish` (emerald themed button, upload icon, triggers production publish)
* **Secondary buttons**:
  * `Save` (disk icon, saves local draft)
  * `Download PDF` (download icon, downloads compiled PDF)
  * `Take Snapshot` (camera icon, takes snapshot backup)
* **Configure Dropdown**:
  * A gear icon triggers a floating popover panel `z-50`.
  * Contains select dropdown for LaTeX engine (`engine`).
  * Contains toggle switch for Auto-save.
  * Contains toggle switch for Auto-compile.

### B. Tabbed Editor Header
* Tab list:
  * **Visual** (Pallette/Shapes icon, edits section model)
  * **Code** (Code bracket icon, edits raw LaTeX source)
* Styled with border bottom and glassmorphic tabs.
* Unsaved changes tag: `● unsaved` in amber displayed on the far right of the tabs.

### C. PDF Preview Pane
* Header bar with **PDF Preview** title.
* Inside is an iframe showing the compiled PDF blob URL.
* Integrates error details pane at the bottom if compilation fails.

## 4. Verification Plan
* Validate editor switching (no lost cursor or document state).
* Validate layout sizing on various browser heights/widths (ensure no outer scrollbars appear).
* Verify compile, save, and publish network requests complete successfully.
