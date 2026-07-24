# Desktop Widgets Board & Winget Package Manager Design

**Date**: 2026-07-25  
**Scope**: `/desktop` route in Next.js portfolio (`src/app/components/desktop/`)

---

## 1. Executive Summary

This design specification introduces a Windows 11 style **Widgets Board** and **Winget Package Manager** integrated into the left side of the desktop taskbar. Clicking the Widgets icon on the bottom-left of the taskbar slides open a glassmorphic side panel containing a dual-tab experience:
1. **Widgets Feed**: A staggered (masonry) layout featuring a rich, paginated mix of Images, Blogs, Apps, Projects, and AI Skills.
2. **Winget Package Manager**: An interactive command-line / app catalog interface allowing users to search, inspect, and run simulated `winget install` commands for developer tools.

---

## 2. Requirements & Goals

- **Taskbar Left Button**: Add the authentic Windows 11 Widgets icon (split-card vector icon) on the left side of `Taskbar.js` where a blank spacer previously existed.
- **Glassmorphic Left Panel**: Toggling the Widgets button opens/closes a left-sliding backdrop-blurred drawer panel attached to the left edge of `/desktop`.
- **Tabbed Experience**:
  - `❖ Widgets Feed`: Staggered masonry grid of mixed content cards.
  - `📦 Winget CLI`: Interactive package launcher and command output terminal.
- **Widgets Content Categories**:
  - **Images**: Portfolio photography & gallery highlights with "Open in Photos" action.
  - **Blogs**: Recent blog posts with excerpts, tags, and reading triggers.
  - **Apps**: Quick launch cards for desktop apps (VS Code, Terminal, Photos, File Explorer, Browser, etc.).
  - **Projects**: Featured projects with tech stack badges and links.
  - **AI Skills**: Interactive skill cards showcasing AI capabilities, web frameworks, and engineering tools.
- **Pagination & Filters**:
  - Category filter pills (`All`, `Images`, `Blogs`, `Apps`, `Projects`, `AI Skills`).
  - Strict page-based pagination (6 items per page) with page number indicators, `< Prev` / `Next >` navigation, and animated page switching.
- **Staged Conventional Commits**: Split implementation into atomic conventional commits at each stage.

---

## 3. Component Architecture & Data Flow

```
src/app/components/desktop/
├── Desktop.js              # Manages open app state, active windows, widgetsOpen state
├── Taskbar.js              # Left-aligned Widgets button with Windows 11 icon
├── WidgetsPanel.js         # Slide-over panel container (z-40 overlay)
└── widgets/
    ├── WidgetsFeed.js      # Staggered 2-column masonry grid, filter bar & pagination
    ├── WingetPanel.js      # Interactive Winget CLI, search & simulated install runner
    └── data/
        └── widgetItems.js  # Curated stream of images, blogs, apps, projects & AI skills
```

---

## 4. Detailed Component Specifications

### 4.1 `Taskbar.js` Integration
* Remove the empty left-side `<div className="w-40" />` spacer.
* Insert a button aligned to the bottom left:
  * Icon: `WidgetsIcon` (Windows 11 split rectangle SVG).
  * Props: `onToggleWidgets`, `widgetsOpen`.
  * Active state styling: subtle light highlight when panel is open.

### 4.2 `WidgetsPanel.js` Overlay
* Position: `absolute left-0 top-0 bottom-12 w-full max-w-[460px] z-40`.
* Surface: `bg-[#1c1c1f]/85 backdrop-blur-2xl border-r border-white/10 text-white shadow-2xl`.
* Header:
  * Logo + Title ("Widgets & Winget").
  * Tab Switcher: `❖ Feed` | `📦 Winget`.
  * Close button (`✕`).

### 4.3 `WidgetsFeed.js` (Staggered Layout + Pagination)
* **Masonry Grid**:
  * 2-column layout (`grid grid-cols-2 gap-3 items-start`).
  * Dynamic height cards depending on content type.
* **Filter Bar**:
  * Horizontally scrollable category pills: `All`, `Images`, `Blogs`, `Apps`, `Projects`, `AI Skills`.
* **Pagination Logic**:
  * Filter items by selected category.
  * `itemsPerPage = 6`.
  * `totalPages = Math.ceil(filteredItems.length / itemsPerPage)`.
  * Render items for `currentPage` sliced range.
  * Controls: `< Prev`, `Page X of Y`, `Next >`, and quick page dot buttons.

### 4.4 `WingetPanel.js` (Package Manager CLI)
* **Search Header**: Input bar for `winget search <app>`.
* **Featured Developer Tools**: Preset package cards (Git, Node.js, VS Code, Next.js, Prisma, Docker, Python).
* **CLI Terminal Output Window**:
  * Displays simulated `winget install <package>` execution log.
  * Animated download progress bar (`[██████████████░░░░] 75%`).
  * Log lines: `Found Git [Git.Git]`, `Downloading package...`, `Successfully installed`.

---

## 5. Staged Implementation & Commit Plan

| Stage | Scope | Commit Message |
|-------|-------|----------------|
| **1** | Taskbar & Shell | `feat(desktop): add left taskbar widget button and slide-out panel shell` |
| **2** | Staggered Feed | `feat(desktop): implement staggered masonry widget feed with mixed content and category filters` |
| **3** | Pagination | `feat(desktop): add pagination controls and smooth page transitions to widget feed` |
| **4** | Winget CLI | `feat(desktop): implement interactive winget package manager tab in widget panel` |
| **5** | Integration | `refactor(desktop): polish animations, responsiveness, and verify integration` |

---

## 6. Verification Plan

1. Run `npm run lint` to ensure zero lint or syntax errors.
2. Launch `npm run dev` and navigate to `http://localhost:3000/desktop`.
3. Click Widgets button on left side of taskbar to confirm slide panel toggles smoothly.
4. Test filtering by category (`Images`, `Blogs`, `Apps`, `Projects`, `AI Skills`).
5. Test page navigation (`< Prev`, `Next >`, page indicators).
6. Click App and Image cards to verify they trigger corresponding desktop apps.
7. Switch to Winget tab, search for packages, and run `winget install <package>`.
