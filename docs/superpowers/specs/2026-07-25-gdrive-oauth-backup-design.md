# Google Drive OAuth 2.0 Cloud Backup Specification

**Date:** 2026-07-25  
**Target Page:** `http://localhost:3000/admin/database`  
**Feature:** Dynamic Google Drive OAuth 2.0 Integration & Cloud Database Backups

---

## 1. Executive Summary

This feature adds dynamic Google Drive OAuth 2.0 backup and restoration capabilities directly to the Aiyu Admin Database Manager (`/admin/database`). 

Key highlights:
- **Dynamic In-App Credentials Management:** Admins can configure Google OAuth `Client ID` and `Client Secret` dynamically inside the `/admin/database` interface without hardcoding or restarting the server.
- **Dynamic Redirect URL Detection:** Automatically constructs and displays the exact OAuth Redirect URI (e.g. `http://localhost:3000/api/admin/gdrive/callback` or production domain) with a 1-click copy button.
- **Embedded Setup Documentation:** Step-by-step interactive setup guide embedded directly inside the admin panel UI.
- **End-to-End Encryption & Portable Backup:** OAuth Client Secrets and Refresh Tokens are encrypted using AES-256-CBC (`lib/encryption.js`). The configuration is stored within the system `Config` collection so it is automatically included in exported system backups and restored during imports.
- **Seamless User Account Linking:** Admins can connect, disconnect, or switch Google Accounts anytime.
- **Unified Visual Design:** Designed with the exact cyberpunk / dark grid aesthetics (neon accents, monospace typography, framed cards) matching the existing `SYSTEM BACKUP`, `SYSTEM RESTORE`, and `CONFIGURE_DUMP` panels.

---

## 2. Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                            /admin/database UI Panel                               |
|  +---------------------------+  +----------------------------------------------+  |
|  | Google Drive Cloud Card   |  | API Configuration Modal                      |  |
|  | - Status: Connected/Off   |  | - Client ID & Encrypted Secret Inputs        |  |
|  | - Connected User Info     |  | - Auto-detected Redirect URL + Copy Button   |  |
|  | - Connect/Disconnect      |  | - Interactive Setup Guide                    |  |
|  | - Backup & Restore History|  +----------------------------------------------+  |
|  +---------------------------+                                                    |
+----------------------------------------|------------------------------------------+
                                         |
                                  API Endpoints
                                         |
    +------------------------------------+------------------------------------+
    |                                    |                                    |
GET /api/admin/gdrive/auth      GET /api/admin/gdrive/callback       POST /api/admin/gdrive/config
(Generates Google OAuth URL)    (Exchanges Code -> Tokens)           (Saves encrypted credentials)
    |                                    |                                    |
    +------------------------------------+------------------------------------+
                                         |
                                   System State
                                         |
    +------------------------------------+------------------------------------+
    |                                                                         |
prisma.config (JSON Blob)                                            Google Drive API
- encryptedClientId & encryptedSecret                                - Folder: Aiyu Backups
- encryptedTokens & User Profile                                     - Upload & Download ZIP
- Included in System Export/Import ZIP                               - File List & Delete
```

---

## 3. Detailed Component & API Design

### 3.1 Configuration & Credential Security (`src/lib/gdrive.js`)
- Helper module to handle:
  - Reading/writing Google Drive config from `prisma.config`.
  - Encrypting `clientSecret`, `accessToken`, and `refreshToken` via `lib/encryption.js`.
  - Exchanging OAuth code for tokens at `https://oauth2.googleapis.com/token`.
  - Refreshing `access_token` automatically when expired using `refresh_token`.
  - Calling Google Drive REST APIs (v3) using native `fetch` (no heavy third-party SDK dependencies).

### 3.2 API Routes (`src/app/api/admin/gdrive/`)
1. **`GET /api/admin/gdrive/config` & `POST /api/admin/gdrive/config`**
   - Save & retrieve dynamic Client ID, Client Secret, and auto-computed callback URL.
2. **`GET /api/admin/gdrive/auth`**
   - Constructs OAuth authorization URL with `access_type=offline` and `prompt=consent` to guarantee a refresh token.
3. **`GET /api/admin/gdrive/callback`**
   - Receives authorization code, exchanges it for tokens, fetches user profile info from `https://www.googleapis.com/oauth2/v2/userinfo`, encrypts tokens, and updates system `Config`. Redirects back to `/admin/database?gdrive=connected`.
4. **`GET /api/admin/gdrive/status`**
   - Returns current connection state, configured Client ID status, user email, name, avatar, and last backup timestamp.
5. **`POST /api/admin/gdrive/disconnect`**
   - Clears tokens from database while preserving Client ID/Secret settings, allowing instant reconnection or switching accounts.
6. **`POST /api/admin/gdrive/backup`**
   - Triggers full system export (`/api/admin/export`), uploads the resulting `.zip` buffer to Google Drive in the folder `Aiyu Backups`, and records metadata.
7. **`GET /api/admin/gdrive/list`**
   - Lists backup `.zip` files currently in the user's `Aiyu Backups` Google Drive folder with line details (file ID, name, size, created time).
8. **`POST /api/admin/gdrive/restore`**
   - Downloads specified file ID from Google Drive and passes buffer to system import logic (`/api/admin/import`).
9. **`DELETE /api/admin/gdrive/delete`**
   - Deletes a backup `.zip` file from Google Drive.

### 3.3 UI Integration (`src/app/admin/database/page.js`)
1. **Google Drive Cloud Card:**
   - Positioned alongside `SYSTEM BACKUP`, `SYSTEM RESTORE`, `CACHE PURGE`, `ANALYTICS RESET`.
   - Displays real-time connection badge (`CONNECTED` / `NOT_CONFIGURED` / `DISCONNECTED`).
   - If connected: Shows user profile avatar, name, email, `BACKUP_TO_DRIVE` button, `SWITCH_ACCOUNT` button, and `DRIVE_SETTINGS` button.
   - Includes expandable **Google Drive Backups History** drawer/table with 1-click `RESTORE` and `DELETE` actions.
2. **Dynamic Configuration & Guide Modal:**
   - Client ID input field.
   - Client Secret input field (masked with toggle visibility).
   - **Dynamic Callback URL Display:** Auto-populates `origin + /api/admin/gdrive/callback` with copy to clipboard button.
   - **Interactive Step-by-Step Setup Guide:** Expandable accordion walking user through Google Cloud Console project creation, enabling Drive API, creating OAuth Web Client ID, and setting test users.
3. **Configure Backup Modal Integration:**
   - Adds a "Direct Cloud Backup to Google Drive" option inside the `CONFIGURE_DUMP` modal so users can trigger an instant cloud dump with custom selected collection filters.

---

## 4. Backup & Restore Portability

- The Google Drive API setup (Client ID, Client Secret, Encrypted Tokens, Account Info) is stored inside `Config.data.gdriveConfig`.
- Because `COLLECTION_PRODUCERS.config` in `src/app/api/admin/export/route.js` exports the `Config` table, all Google Drive settings are automatically backed up whenever a system backup occurs.
- Restoring a system backup onto a new machine or localhost environment will restore the Google Drive configuration automatically. `JWT_SECRET` decrypts secrets seamlessly.

---

## 5. Verification & Testing Plan

1. **API Validation:**
   - Test saving Client ID and Secret -> verify database stores encrypted values.
   - Test OAuth redirect flow -> verify callback receives code and stores encrypted refresh token.
   - Test Token Refresh -> verify expired access tokens are automatically renewed.
2. **Backup & Restore Validation:**
   - Trigger `BACKUP_TO_DRIVE` -> verify file appears in Google Drive under `Aiyu Backups` folder.
   - List files -> verify files match Google Drive API response.
   - Trigger `RESTORE` from Drive -> verify system data is updated successfully.
   - Run system export `.zip` -> verify `gdriveConfig` is present inside `config.json`.
3. **Lint & Build Verification:**
   - Run `npm run lint` to ensure zero syntax or formatting regressions.

---

## 6. Commit Strategy

Per AGENTS.md rules, work will be executed in atomic stages with git commits:
1. `feat(gdrive): add encrypted gdrive config and OAuth helper utilities`
2. `feat(gdrive): implement google drive OAuth and backup API endpoints`
3. `feat(gdrive): add dynamic gdrive card, setup modal, and cloud backup UI to admin database page`
4. `docs(gdrive): update documentation and verify full backup/restore integration`
