# Mobile (Windows Phone Theme) & Tablet (Surface Mode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a mobile (Windows Phone Metro theme) and tablet (Surface split-screen / touch theme) version of Aiyu OS with auto-viewport detection and manual mode switcher.

**Architecture:** A unified `DeviceModeContext` controls the active device mode (`mobile`, `tablet`, `desktop`, or `auto`). Depending on the computed `effectiveMode`, `Desktop.js` dynamically renders `MobilePhoneShell.js` (Metro Live Tiles, status bar, bottom circular action app bar, WP pivot app controls, card deck app switcher), `TabletSurfaceShell.js` (touch taskbar, side-by-side split screen snap assist, touch drag handles, quick action center sheet), or the classic Windows 11 desktop shell.

**Tech Stack:** Next.js 16 (React 19), Tailwind CSS 4, Framer Motion, Lucide Icons.

## Global Constraints

- Keep public UI changes responsive on mobile, tablet, and desktop.
- Do not break existing desktop behavior or admin routes.
- Commit at each completed stage using conventional commit format.
- Run `npm run lint` before completing tasks.

---

### Task 1: Create `DeviceModeContext` & Provider Integration

**Files:**
- Create: `src/app/context/DeviceModeContext.js`
- Modify: `src/app/desktop/page.js`

**Interfaces:**
- Consumes: `localStorage` key `'aiyu_device_mode'`, `'aiyu_accent_color'`
- Produces: `useDeviceMode()` hook returning `{ deviceMode, setDeviceMode, effectiveMode, accentColor, setAccentColor, isMobile, isTablet, isDesktop }`

- [ ] **Step 1: Create `DeviceModeContext.js`**

```javascript
"use client";
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const DeviceModeContext = createContext(null);

export function DeviceModeProvider({ children }) {
    const [deviceMode, setDeviceModeState] = useState('auto');
    const [accentColor, setAccentColorState] = useState('lumia-cyan');
    const [viewportWidth, setViewportWidth] = useState(1200);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const savedMode = localStorage.getItem('aiyu_device_mode');
            if (savedMode) setDeviceModeState(savedMode);
            const savedAccent = localStorage.getItem('aiyu_accent_color');
            if (savedAccent) setAccentColorState(savedAccent);
        } catch {}

        const handleResize = () => setViewportWidth(window.innerWidth);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const setDeviceMode = (mode) => {
        setDeviceModeState(mode);
        try {
            localStorage.setItem('aiyu_device_mode', mode);
        } catch {}
    };

    const setAccentColor = (color) => {
        setAccentColorState(color);
        try {
            localStorage.setItem('aiyu_accent_color', color);
        } catch {}
    };

    const effectiveMode = useMemo(() => {
        if (deviceMode !== 'auto') return deviceMode;
        if (viewportWidth < 768) return 'mobile';
        if (viewportWidth <= 1024) return 'tablet';
        return 'desktop';
    }, [deviceMode, viewportWidth]);

    const value = useMemo(() => ({
        deviceMode,
        setDeviceMode,
        effectiveMode,
        accentColor,
        setAccentColor,
        isMobile: effectiveMode === 'mobile',
        isTablet: effectiveMode === 'tablet',
        isDesktop: effectiveMode === 'desktop',
    }), [deviceMode, effectiveMode, accentColor]);

    return <DeviceModeContext.Provider value={value}>{children}</DeviceModeContext.Provider>;
}

export function useDeviceMode() {
    const context = useContext(DeviceModeContext);
    if (!context) {
        return {
            deviceMode: 'auto',
            setDeviceMode: () => {},
            effectiveMode: 'desktop',
            accentColor: 'lumia-cyan',
            setAccentColor: () => {},
            isMobile: false,
            isTablet: false,
            isDesktop: true,
        };
    }
    return context;
}
```

- [ ] **Step 2: Wrap `DesktopPage` in `DeviceModeProvider`**

In `src/app/desktop/page.js`, wrap the returned `<Desktop />` in `<DeviceModeProvider>`.

- [ ] **Step 3: Verify and Commit**

```bash
git add src/app/context/DeviceModeContext.js src/app/desktop/page.js
git commit -m "feat(desktop): add DeviceModeContext for auto and manual device mode switching"
```

---

### Task 2: Implement Windows Phone Theme Shell (`MobilePhoneShell.js`)

**Files:**
- Create: `src/app/components/desktop/MobilePhoneShell.js`

**Interfaces:**
- Consumes: `useDeviceMode()`, `apps` array, `openApp`, `closeWin`, `windows`, `activeWindowId`, `focusWindow`, `config`, `wallpaper`
- Produces: `<MobilePhoneShell />` rendering WP Status Bar, Metro Live Tiles grid, App List view, WP Pivot app container, WP circular AppBar, and card-deck Task Switcher.

- [ ] **Step 1: Create `MobilePhoneShell.js` with WP Metro UI & Framer Motion**

Build `MobilePhoneShell` with:
- Top Phone Status Bar: Battery level percentage, Wi-Fi icon, cellular signal bars, time, device name.
- Metro Start Screen: 2-column live tiles grid. Flipping live cards using Framer Motion (Photos preview, Notepad counts, GitHub stats, recent files, time/weather).
- Accent Color styling: Theme maps for `'lumia-cyan'` (`#00abf0`), `'crimson'` (`#e51400`), `'cobalt'` (`#0050ef`), `'emerald'` (`#008a00`), `'magenta'` (`#d80073`), `'amber'` (`#f0a30a`), `'violet'` (`#76608a`).
- App List Tab: Swipe left or header arrow tap to view alphabetical list with letter jump index.
- WP Bottom AppBar: Iconic circular buttons `[Back]`, `[Start/Home]`, `[Task Switcher]`.
- Active App View: Full screen WP Pivot layout (`MAIN | DETAILS | SETTINGS`) with push/pop transition animations.
- Card Deck Task Switcher: Swipeable app snapshot cards with swipe-up to close.

- [ ] **Step 2: Verify and Commit**

```bash
git add src/app/components/desktop/MobilePhoneShell.js
git commit -m "feat(desktop): add MobilePhoneShell with Windows Phone Metro theme and live tiles"
```

---

### Task 3: Implement Tablet Surface Theme Shell (`TabletSurfaceShell.js`)

**Files:**
- Create: `src/app/components/desktop/TabletSurfaceShell.js`

**Interfaces:**
- Consumes: `useDeviceMode()`, `apps`, `windows`, `openApp`, `closeWin`, `focusWindow`, `config`, `wallpaper`
- Produces: `<TabletSurfaceShell />` with touch taskbar, touch start panel, side-by-side Snap Assist dual-window grid, touch drag handles, and Quick Action Center side sheet.

- [ ] **Step 1: Create `TabletSurfaceShell.js`**

Build `TabletSurfaceShell` with:
- Touch Taskbar (`48px` height, large touch targets, battery/time trigger for Action Center).
- Side-by-side dual window split screen (`50/50` or `60/40` snap assist).
- Window touch header with Touch Drag handles and Snap buttons.
- Quick Action Center side sheet with toggles for Brightness, Volume, Dark/Light mode, Device Mode (`Mobile`, `Tablet`, `Desktop`), Accent Color, and system info.

- [ ] **Step 2: Verify and Commit**

```bash
git add src/app/components/desktop/TabletSurfaceShell.js
git commit -m "feat(desktop): add TabletSurfaceShell with Surface touch layout and snap assist"
```

---

### Task 4: Integrate Device Shell Manager into `Desktop.js` & Add Quick Toggles

**Files:**
- Modify: `src/app/components/desktop/Desktop.js`
- Modify: `src/app/components/desktop/Taskbar.js`
- Modify: `src/app/components/desktop/apps/Settings.jsx`

**Interfaces:**
- Consumes: `useDeviceMode()` in `Desktop.js`, `Taskbar.js`, and `Settings.jsx`.
- Produces: Seamless switching between `MobilePhoneShell`, `TabletSurfaceShell`, and `Desktop`.

- [ ] **Step 1: Update `Desktop.js` to render shells based on `effectiveMode`**
- [ ] **Step 2: Add Device Mode switcher to `Taskbar.js` system tray & `Settings.jsx` system tab**
- [ ] **Step 3: Verify and Commit**

```bash
git add src/app/components/desktop/Desktop.js src/app/components/desktop/Taskbar.js src/app/components/desktop/apps/Settings.jsx
git commit -m "feat(desktop): integrate mobile, tablet, and desktop shells into Desktop manager"
```

---

### Task 5: Adapt Desktop Apps for Mobile & Tablet Touch Views

**Files:**
- Modify: `src/app/components/desktop/apps/FileExplorer.jsx`
- Modify: `src/app/components/desktop/apps/CodeEditor.jsx`
- Modify: `src/app/components/desktop/apps/Browser.jsx`
- Modify: `src/app/components/desktop/apps/Photos.jsx`
- Modify: `src/app/components/desktop/apps/Terminal.jsx`
- Modify: `src/app/components/desktop/apps/TaskManager.jsx`
- Modify: `src/app/components/desktop/apps/Notepad.jsx`
- Modify: `src/app/components/desktop/apps/Calculator.jsx`
- Modify: `src/app/components/desktop/apps/Whiteboard.jsx`
- Modify: `src/app/components/desktop/apps/MarkdownViewer.jsx`

**Interfaces:**
- Consumes: `isMobile`, `isTablet` from `useDeviceMode()` inside app components.
- Produces: Responsive mobile list/pivot views and tablet split views across all apps.

- [ ] **Step 1: Adapt File Explorer & Code Editor for mobile/tablet**
- [ ] **Step 2: Adapt Browser, Photos, & Settings for mobile/tablet**
- [ ] **Step 3: Adapt Notepad, Calculator, Terminal, Task Manager, Whiteboard, & Markdown Viewer**
- [ ] **Step 4: Verify and Commit**

```bash
git add src/app/components/desktop/apps/*
git commit -m "feat(desktop): optimize all desktop apps for mobile pivot and tablet split views"
```

---

### Task 6: Comprehensive Verification & Linting

- [ ] **Step 1: Run `npm run lint`**
- [ ] **Step 2: Confirm clean build / dev server execution**
- [ ] **Step 3: Commit final stage**

```bash
git commit -m "refactor(desktop): finalize mobile and tablet mode implementation"
```
