# System Settings (Wi-Fi/Airplane Tray Icons, Night Light Overlay & Browser Offline Mode) Design

## 1. Overview
This design doc specifies the integration of system settings reactivity across the desktop environment (`Desktop.js`), system taskbar (`Taskbar.js`), and web browser (`Browser.js`).

## 2. Requirements & State Architecture
System state will be managed centrally in `Desktop.js` and passed down to `Taskbar.js` and `Browser.js`:

```
               +----------------------+
               |      Desktop.js      |
               | (systemSettings state|
               +----------+-----------+
                          |
         +----------------+----------------+
         |                                 |
         v                                 v
  +--------------+                 +----------------+
  |  Taskbar.js  |                 |   Browser.js   |
  | (Tray Icons &|                 | (Offline state |
  | Quick Panel) |                 |  & ERR Screen) |
  +--------------+                 +----------------+
```

### System State Schema (`systemSettings`):
- `wifiOn`: `boolean` (default: `true`)
- `airplaneOn`: `boolean` (default: `false`)
- `nightLightOn`: `boolean` (default: `false`)
- `brightness`: `number` (default: `100`)
- `volume`: `number` (default: `80`)
- `isMuted`: `boolean` (default: `false`)

### Derived State:
- `isOffline`: `!wifiOn || airplaneOn`

## 3. Component Updates

### 3.1 Taskbar & System Tray (`Taskbar.js`)
- **System Tray Button Icon**:
  - Displays `<Plane />` if `airplaneOn` is `true`.
  - Displays `<WifiOff />` if `airplaneOn` is `false` AND `wifiOn` is `false`.
  - Displays `<Wifi />` if `airplaneOn` is `false` AND `wifiOn` is `true`.
- **Quick Settings Interlocking Logic**:
  - Turning **Airplane Mode ON** sets `airplaneOn = true` and `wifiOn = false`.
  - Turning **Wi-Fi ON** sets `wifiOn = true` and `airplaneOn = false`.
  - Turning **Wi-Fi OFF** sets `wifiOn = false`.
  - Turning **Airplane Mode OFF** sets `airplaneOn = false` (restoring previous Wi-Fi state or leaving Wi-Fi off).

### 3.2 Desktop & Night Light (`Desktop.js`)
- Render a top-level pointer-events-none overlay layer when `nightLightOn` is `true`.
- Styled with high-quality warm color temperature amber tint (`bg-amber-500/15 backdrop-sepia-[0.35] pointer-events-none fixed inset-0 z-[9999] transition-opacity duration-300`).

### 3.3 Browser (`Browser.js`)
- Accepts `isOffline` boolean prop from `Desktop.js`.
- When `isOffline` is `true`:
  - Loading any tab or internal/external URL displays the Chrome/Windows style **"No Internet"** offline screen.
  - Page content includes: Dinosaur/Offline icon, `You are offline`, `ERR_INTERNET_DISCONNECTED`, troubleshooting steps ("Check network cables", "Turn off airplane mode / reconnect Wi-Fi"), and a "Try again" button.

## 4. Staged Execution & Git Commits
- **Stage 1**: Lift system settings state to `Desktop.js` and implement Night Light global overlay.
- **Stage 2**: Update `Taskbar.js` tray icons and Quick Settings interlocking behavior (Airplane mode & Wi-Fi off).
- **Stage 3**: Implement Browser offline detection and realistic Chrome-style "No Internet" offline screen.
