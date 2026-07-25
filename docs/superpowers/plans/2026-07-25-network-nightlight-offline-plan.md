# System Settings, Night Light & Browser Offline Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate reactive system settings for Wi-Fi/Airplane tray icons, full-screen Night Light warm overlay, and realistic Chrome-style offline mode in Browser.

**Architecture:** Lift system settings (`wifiOn`, `airplaneOn`, `nightLightOn`, `brightness`, `volume`, `isMuted`) to `Desktop.js`. Pass settings state down to `Taskbar.js` for Quick Settings & tray icon rendering, and pass `isOffline` to `Browser.js` for rendering a realistic offline page.

**Tech Stack:** Next.js 16, React 19, Lucide React icons, Tailwind CSS, Framer Motion.

## Global Constraints
- Do not break existing windowing or taskbar functionality.
- Follow commit conventions: `feat(desktop): ...` or `fix(desktop): ...`.
- Verify using `npm run lint` and manual testing.

---

### Task 1: Lift System State & Implement Global Night Light Overlay in `Desktop.js`

**Files:**
- Modify: [Desktop.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/desktop/Desktop.js)

**Interfaces:**
- Consumes: None
- Produces: `systemSettings` state and `updateSystemSettings(updates)` handler passed to `Taskbar` and `Browser`.

- [ ] **Step 1: Add systemSettings state to Desktop.js**
  - Add state in `Desktop`:
    ```js
    const [systemSettings, setSystemSettings] = useState({
        wifiOn: true,
        airplaneOn: false,
        nightLightOn: false,
        brightness: 100,
        volume: 80,
        isMuted: false,
    });
    const updateSystemSettings = useCallback((updates) => {
        setSystemSettings((prev) => ({ ...prev, ...updates }));
    }, []);
    ```
- [ ] **Step 2: Render Night Light overlay**
  - Add conditional overlay in `Desktop.js` template:
    ```jsx
    {systemSettings.nightLightOn && (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[9999] bg-amber-500/15 backdrop-sepia-[0.35] transition-opacity duration-300"
        />
    )}
    ```
- [ ] **Step 3: Pass state to Taskbar and Browser**
  - Pass `systemSettings` and `updateSystemSettings` to `Taskbar`.
  - Pass `isOffline={!systemSettings.wifiOn || systemSettings.airplaneOn}` to `Browser`.
- [ ] **Step 4: Verify linting**
  - Run `npm run lint`.
- [ ] **Step 5: Commit Stage 1**
  - Commit with message `feat(desktop): lift system settings state and add night light overlay`.

---

### Task 2: Update System Tray Icon Reactions & Quick Settings Interlocking in `Taskbar.js`

**Files:**
- Modify: [Taskbar.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/desktop/Taskbar.js)

**Interfaces:**
- Consumes: `systemSettings` & `updateSystemSettings` from `Desktop.js`.
- Produces: Dynamic system tray icon (`Plane`, `WifiOff`, or `Wifi`) and interlocked Quick Settings toggle logic.

- [ ] **Step 1: Import WifiOff from lucide-react**
  - Update Lucide imports to include `WifiOff`.
- [ ] **Step 2: Replace internal state with props**
  - Use `systemSettings` and `updateSystemSettings` passed from `Desktop`.
- [ ] **Step 3: Implement Windows-like interlocking logic**
  - When Airplane mode is toggled ON: set `airplaneOn: true, wifiOn: false`.
  - When Airplane mode is toggled OFF: set `airplaneOn: false`.
  - When Wi-Fi is toggled ON: set `wifiOn: true, airplaneOn: false`.
  - When Wi-Fi is toggled OFF: set `wifiOn: false`.
- [ ] **Step 4: Update System Tray icon display**
  - In System Tray:
    - If `systemSettings.airplaneOn` -> Render `<Plane className="h-4 w-4 text-blue-400" />`
    - Else if `!systemSettings.wifiOn` -> Render `<WifiOff className="h-4 w-4 text-red-400 opacity-60" />`
    - Else -> Render `<Wifi className="h-4 w-4 text-blue-400" />`
- [ ] **Step 5: Verify linting**
  - Run `npm run lint`.
- [ ] **Step 6: Commit Stage 2**
  - Commit with message `feat(desktop): update tray icons for airplane mode and wifi disconnection`.

---

### Task 3: Implement Realistic "You Are Offline" Screen in `Browser.js`

**Files:**
- Modify: [Browser.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/desktop/apps/Browser.js)

**Interfaces:**
- Consumes: `isOffline` boolean prop from `Desktop.js`.
- Produces: Chrome/Edge-style offline UI when `isOffline` is true.

- [ ] **Step 1: Accept `isOffline` prop in Browser.js**
  - Update signature: `export default function Browser({ payload, closeWin, isOffline })`
- [ ] **Step 2: Create `OfflinePreview` component**
  - Design a realistic Chrome-style "No Internet / You are offline" screen:
    - Icon: Lucide `WifiOff` in gray/blue rounded container
    - Heading: `No internet`
    - Subtitle: `Try:`
      - Checking the network cables, modem, and router
      - Reconnecting to Wi-Fi
      - Turning off Airplane mode
    - Error code: `ERR_INTERNET_DISCONNECTED`
    - "Reload / Try again" button (which checks connection status).
- [ ] **Step 3: Render `OfflinePreview` when `isOffline` is true**
  - In the viewport area, if `isOffline` is true (and tab url is non-empty or navigation is attempted), render `OfflinePreview`.
- [ ] **Step 4: Verify linting & build**
  - Run `npm run lint`.
- [ ] **Step 5: Commit Stage 3**
  - Commit with message `feat(browser): add realistic offline no-internet error page`.
