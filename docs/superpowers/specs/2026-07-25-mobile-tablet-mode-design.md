# Specification: Mobile (Windows Phone Theme) & Tablet (Surface Mode) Experience for Aiyu OS

## 1. Overview
This design transforms Aiyu OS into a adaptive OS web application with tailored user experiences for Desktop, Tablet, and Mobile viewports. 

Key themes:
- **Mobile Mode**: Inspired by the **Windows Phone Metro UI** (live tiles, accent colors, top status bar, bottom circular action bar, full-screen pivot apps, fluid swipe transitions, card-deck multi-tasking switcher).
- **Tablet Mode**: Inspired by **Surface / Tablet OS** (touch-optimized dock/taskbar, full-screen touch start menu, side-by-side 50/50 & 60/40 snap assist layout, touch drag handles, quick settings action center sheet).
- **Desktop Mode**: Existing Windows 11 desktop experience.
- **Device Mode Switcher**: Auto-detects screen width (`< 768px` = Mobile, `768px - 1024px` = Tablet, `> 1024px` = Desktop) with a manual override in Settings and System Tray/Status Bar.

---

## 2. Architecture & Device Context

### 2.1 `DeviceModeContext` (`src/app/context/DeviceModeContext.js`)
- **State**:
  - `deviceMode`: `'auto'` | `'mobile'` | `'tablet'` | `'desktop'` (persisted in `localStorage`).
  - `viewportWidth`: Number (tracks window resize).
  - `effectiveMode`: Derived mode based on auto-detection or manual lock (`'mobile'`, `'tablet'`, or `'desktop'`).
  - `accentColor`: Windows Phone accent color string (`'lumia-cyan'`, `'crimson'`, `'cobalt'`, `'emerald'`, `'magenta'`, `'amber'`, `'violet'`). Persisted in `localStorage`.
- **Hooks**: `useDeviceMode()` exposes `{ deviceMode, setDeviceMode, effectiveMode, accentColor, setAccentColor, isMobile, isTablet, isDesktop }`.

### 2.2 Shell Component Hierarchy
```
DesktopPage (src/app/desktop/page.js)
 └── DeviceModeProvider (src/app/context/DeviceModeContext.js)
      └── Desktop Shell Manager (src/app/components/desktop/Desktop.js)
           ├── EffectiveMode === 'mobile'  ──> MobilePhoneShell.js (Windows Phone Theme)
           ├── EffectiveMode === 'tablet'  ──> TabletSurfaceShell.js (Surface Theme)
           └── EffectiveMode === 'desktop' ──> Classic Windows 11 Desktop
```

---

## 3. Component Design

### 3.1 Mobile Mode — Windows Phone (Metro Theme) (`MobilePhoneShell.js`)
1. **Top Phone Status Bar**:
   - Time display, cellular signal bars, Wi-Fi icon, battery indicator (level percentage), custom phone device name (e.g., `AIYU-PHONE`).
2. **Start Screen (Metro Live Tiles)**:
   - 2-column Metro grid of live tiles.
   - Tile sizes: 1x1 (small icon), 2x2 (medium live tile), 4x2 (wide live tile).
   - Live flipping cards:
     - *Photos Tile*: Animated slideshow preview of gallery images.
     - *Notepad Tile*: Displays total note count & latest preview snippet.
     - *Code Editor Tile*: Shows recent project file names.
     - *GitHub Tile*: Displays public repo count / commits star stats.
     - *Clock/Weather Tile*: Displays live time & animated weather widget.
   - Customizable accent colors (Lumia Cyan `#00abf0`, Crimson `#e51400`, Cobalt `#0050ef`, Emerald `#008a00`, Magenta `#d80073`, Amber `#f0a30a`, Violet `#76608a`).
3. **App List View**:
   - Swipe left or tap top header to switch to alphabetical Metro app list.
   - Metro letter headers (`A`, `B`, `C`...) with quick jump picker overlay.
4. **Bottom App Navigation Bar (AppBar)**:
   - Metro circular buttons: `[Back]`, `[Start/Home]`, `[Task Switcher / Search]`.
   - Contextual app action buttons (e.g. Refresh, Share, Settings, New Note).
5. **App Window Chrome & Multi-Tasking**:
   - Active app renders full-screen with WP Pivot control header (`MAIN | DETAILS | SETTINGS`).
   - Smooth Framer Motion push/pop page transition animations.
   - Multi-Tasking Switcher: Long press back or tap Task Switcher button to bring up a horizontally scrollable card deck of running app snapshots. Swipe up card to terminate app.

### 3.2 Tablet Mode — Touch & Surface Layout (`TabletSurfaceShell.js`)
1. **Touch Taskbar & Action Center**:
   - Height-optimized taskbar with larger touch targets (`48px` min height).
   - Centered app icons + Start button + Quick Action Center trigger button.
2. **Touch Start Menu & App Grid**:
   - Full-screen or side-dock touch launcher with oversized tiles and touch-friendly search input.
3. **Snap Assist / Dual-App Split View**:
   - Snap 2 open windows side-by-side (`50% / 50%` or `60% / 40%` ratio).
   - Visual snap preview drop zones when dragging a window to left/right edge.
   - Touch drag bar at top of window frame with quick Snap options button.
4. **Quick Action Center Sheet**:
   - Touch slide-over sheet containing toggles for Brightness, Volume, Dark/Light theme, Device Mode (`Mobile`, `Tablet`, `Desktop`), Accent color, and Battery/System health.

---

## 4. Per-App Mobile & Tablet Adaptations

1. **File Explorer (`FileExplorer.jsx`)**:
   - *Mobile*: Single column touch list with breadcrumb bar, swipe items for details, full-bleed file view.
   - *Tablet*: Dual-pane split view (sidebar tree on left, main content grid on right).
2. **Visual Studio Code (`CodeEditor.jsx`)**:
   - *Mobile*: Slide-out file tree drawer, touch text editor with line numbers, code highlighting, line wrapping toggle, and mobile shortcut toolbar (`Tab`, `{`, `}`, `;`, `=`).
   - *Tablet*: Side-by-side sidebar and editor pane.
3. **Browser (`Browser.jsx`)**:
   - *Mobile*: Compact top address bar, full-screen viewport, tab count badge opening tab grid modal, bottom back/forward/refresh navigation bar.
   - *Tablet*: Desktop-style tab strip with touch padding.
4. **Photos (`Photos.jsx`)**:
   - *Mobile*: Full-screen image gallery with touch swipe lightbox, double tap to zoom, swipe down to dismiss.
   - *Tablet*: Grid gallery with side photo details panel.
5. **Settings (`Settings.jsx`)**:
   - *Mobile*: Windows Phone style categories (`System`, `Personalization`, `Device Mode`, `Accent Color`, `About`) navigating into full sub-screens.
   - *Tablet*: Split view sidebar + detail panel.
6. **Task Manager, Terminal, Notepad, Calculator, Whiteboard, Markdown Viewer, GitHub, Get Started**:
   - Touch-optimized headers, scroll containers, responsive controls, mobile/tablet app bar actions.

---

## 5. Verification & Testing Plan
1. **Linting**: Run `npm run lint` to ensure zero syntax or ESLint warnings.
2. **Device Viewport Verification**:
   - Test in Chrome DevTools mobile devices (iPhone 14/15, Pixel 7, iPad Air, Surface Pro 8).
   - Verify layout responsiveness, touch drag handles, live tile animations, and app switching.
3. **Manual Switcher Test**:
   - Switch between `Mobile`, `Tablet`, and `Desktop` modes explicitly in Settings and Action Center across all device sizes.
