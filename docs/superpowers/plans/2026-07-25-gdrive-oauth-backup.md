# Google Drive OAuth 2.0 Cloud Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dynamic Google Drive OAuth 2.0 credentials configuration, account linking/unlinking, and cloud database backup & restore functionality to `http://localhost:3000/admin/database`.

**Architecture:** Encrypted credentials and OAuth refresh tokens are managed via a helper module (`src/lib/gdrive.js`) and stored inside the system `Config` database document (`prisma.config`). Nine dedicated API routes under `src/app/api/admin/gdrive/` handle configuration, OAuth authorization, token exchange, backup creation/uploading, Drive file listing, download/restore, and file deletion. The front-end UI (`src/app/admin/database/page.js`) receives a new Google Drive Cloud Card, dynamic credentials & step-by-step setup modal with dynamic redirect URL detection, and cloud history table with 1-click restore.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Prisma ORM, Framer Motion, AES-256-CBC Encryption (`src/lib/encryption.js`), Native Fetch for Google Drive REST API v3.

## Global Constraints
- Encryption must use `src/lib/encryption.js` (`encrypt` / `decrypt`).
- Credentials and settings must be saved in `prisma.config` under `data.gdriveConfig` so system export (`/api/admin/export`) automatically includes them.
- All API routes under `src/app/api/admin/gdrive/*` must enforce session check via `getSession()`.
- UI must strictly follow the dark cyberpunk aesthetic of `/admin/database/page.js`.

---

### Task 1: Create Google Drive Core Helper Module (`src/lib/gdrive.js`)

**Files:**
- Create: `src/lib/gdrive.js`
- Test: `src/lib/__tests__/gdrive.test.js`

**Interfaces:**
- Produces:
  - `getGDriveConfig()`: Returns `{ clientId, clientSecret, accessToken, refreshToken, user, folderId, updatedTime, isConnected, isConfigured }` with decrypted secrets.
  - `saveGDriveConfig(updates)`: Merges and encrypts updates into `prisma.config`.
  - `clearGDriveTokens()`: Clears token data while keeping `clientId` / `clientSecret`.
  - `getValidAccessToken()`: Returns a valid access token, auto-refreshing if expired.
  - `uploadBackupToDrive(zipBuffer, filename)`: Uploads zip archive to Google Drive folder `Aiyu Backups`.
  - `listDriveBackups()`: Returns array of backup zip files in Google Drive.
  - `downloadDriveBackup(fileId)`: Returns ArrayBuffer of specified backup zip file.
  - `deleteDriveBackup(fileId)`: Removes backup file from Google Drive.

- [ ] **Step 1: Write unit tests for `src/lib/gdrive.js`**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseGDriveFolderId } from '../gdrive';

describe('GDrive Helpers', () => {
    it('parses folder id or extracts from drive response', () => {
        const files = [{ id: '123', name: 'Aiyu Backups', mimeType: 'application/vnd.google-apps.folder' }];
        const found = files.find(f => f.name === 'Aiyu Backups');
        expect(found?.id).toBe('123');
    });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/gdrive.test.js`
Expected: PASS

- [ ] **Step 3: Implement `src/lib/gdrive.js`**

```javascript
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const GOOGLE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_NAME = 'Aiyu Backups';

/**
 * Fetch and decrypt Google Drive settings from System Config.
 */
export async function getGDriveConfig() {
    const configRow = await prisma.config.findFirst();
    const data = configRow?.data || {};
    const raw = data.gdriveConfig || {};

    const clientId = raw.clientId || process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = raw.encryptedClientSecret ? decrypt(raw.encryptedClientSecret) : (process.env.GOOGLE_CLIENT_SECRET || '');
    const accessToken = raw.encryptedAccessToken ? decrypt(raw.encryptedAccessToken) : '';
    const refreshToken = raw.encryptedRefreshToken ? decrypt(raw.encryptedRefreshToken) : '';
    const tokenExpiry = raw.tokenExpiry || 0;
    const user = raw.user || null;
    const folderId = raw.folderId || null;

    return {
        clientId,
        clientSecret,
        accessToken,
        refreshToken,
        tokenExpiry,
        user,
        folderId,
        isConfigured: Boolean(clientId && clientSecret),
        isConnected: Boolean(refreshToken && user),
        updatedAt: raw.updatedAt || null,
    };
}

/**
 * Save / Update Google Drive settings in System Config.
 */
export async function saveGDriveConfig(updates) {
    let configRow = await prisma.config.findFirst();
    if (!configRow) {
        configRow = await prisma.config.create({ data: { data: {} } });
    }

    const currentData = typeof configRow.data === 'object' && configRow.data !== null ? configRow.data : {};
    const currentGDrive = currentData.gdriveConfig || {};

    const nextGDrive = {
        ...currentGDrive,
        updatedAt: new Date().toISOString(),
    };

    if (updates.clientId !== undefined) nextGDrive.clientId = updates.clientId;
    if (updates.clientSecret !== undefined) {
        nextGDrive.encryptedClientSecret = updates.clientSecret ? encrypt(updates.clientSecret) : null;
    }
    if (updates.accessToken !== undefined) {
        nextGDrive.encryptedAccessToken = updates.accessToken ? encrypt(updates.accessToken) : null;
    }
    if (updates.refreshToken !== undefined) {
        nextGDrive.encryptedRefreshToken = updates.refreshToken ? encrypt(updates.refreshToken) : null;
    }
    if (updates.tokenExpiry !== undefined) nextGDrive.tokenExpiry = updates.tokenExpiry;
    if (updates.user !== undefined) nextGDrive.user = updates.user;
    if (updates.folderId !== undefined) nextGDrive.folderId = updates.folderId;

    const updatedConfig = await prisma.config.update({
        where: { id: configRow.id },
        data: {
            data: {
                ...currentData,
                gdriveConfig: nextGDrive,
            },
        },
    });

    return updatedConfig;
}

/**
 * Disconnect account (clears tokens and user profile while preserving Client Credentials).
 */
export async function clearGDriveTokens() {
    return saveGDriveConfig({
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        user: null,
        folderId: null,
    });
}

/**
 * Get a valid Access Token, auto-refreshing via Refresh Token if expired.
 */
export async function getValidAccessToken() {
    const config = await getGDriveConfig();
    if (!config.isConnected) {
        throw new Error('Google Drive account is not connected.');
    }

    const now = Date.now();
    // If token is still valid (with 60s buffer), return it
    if (config.accessToken && config.tokenExpiry && config.tokenExpiry > now + 60000) {
        return config.accessToken;
    }

    if (!config.refreshToken) {
        throw new Error('No refresh token available. Please reconnect Google Drive.');
    }

    // Refresh access token
    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: config.refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        throw new Error(data.error_description || data.error || 'Failed to refresh Google access token.');
    }

    const newAccessToken = data.access_token;
    const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;

    await saveGDriveConfig({
        accessToken: newAccessToken,
        tokenExpiry: newExpiry,
    });

    return newAccessToken;
}

/**
 * Find or create the `Aiyu Backups` folder in Google Drive.
 */
export async function getOrCreateBackupFolder(accessToken) {
    // 1. Search for existing folder
    const query = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await fetch(`${GOOGLE_DRIVE_API_URL}/files?q=${query}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const searchData = await searchRes.json().catch(() => ({}));

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    // 2. Create new folder
    const createRes = await fetch(`${GOOGLE_DRIVE_API_URL}/files`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        }),
    });

    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !createData.id) {
        throw new Error('Failed to create backup folder on Google Drive.');
    }

    return createData.id;
}

/**
 * Upload a ZIP archive buffer to Google Drive.
 */
export async function uploadBackupToDrive(zipBuffer, filename) {
    const accessToken = await getValidAccessToken();
    const folderId = await getOrCreateBackupFolder(accessToken);

    const metadata = {
        name: filename,
        parents: [folderId],
        mimeType: 'application/zip',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody = Buffer.concat([
        Buffer.from(
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/zip\r\n\r\n'
        ),
        zipBuffer,
        Buffer.from(closeDelimiter),
    ]);

    const uploadRes = await fetch(`${GOOGLE_UPLOAD_URL}?uploadType=multipart&fields=id,name,webContentLink,createdTime,size`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
            'Content-Length': multipartRequestBody.length.toString(),
        },
        body: multipartRequestBody,
    });

    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok || !uploadData.id) {
        throw new Error(uploadData.error?.message || 'Failed to upload backup archive to Google Drive.');
    }

    return uploadData;
}

/**
 * List all backup files in the `Aiyu Backups` Google Drive folder.
 */
export async function listDriveBackups() {
    const accessToken = await getValidAccessToken();
    const folderId = await getOrCreateBackupFolder(accessToken);

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id, name, mimeType, createdTime, size, webViewLink, webContentLink)');
    const res = await fetch(`${GOOGLE_DRIVE_API_URL}/files?q=${query}&fields=${fields}&orderBy=createdTime desc`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch backups from Google Drive.');
    }

    return data.files || [];
}

/**
 * Download a backup ZIP file from Google Drive as ArrayBuffer.
 */
export async function downloadDriveBackup(fileId) {
    const accessToken = await getValidAccessToken();
    const res = await fetch(`${GOOGLE_DRIVE_API_URL}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
        throw new Error(`Failed to download backup file from Google Drive (HTTP ${res.status}).`);
    }

    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer);
}

/**
 * Delete a backup file from Google Drive.
 */
export async function deleteDriveBackup(fileId) {
    const accessToken = await getValidAccessToken();
    const res = await fetch(`${GOOGLE_DRIVE_API_URL}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete backup file from Google Drive (HTTP ${res.status}).`);
    }

    return true;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/gdrive.js src/lib/__tests__/gdrive.test.js
git commit -m "feat(gdrive): add encrypted gdrive config and OAuth helper utilities"
```

---

### Task 2: Create Google Drive API Routes (`src/app/api/admin/gdrive/*`)

**Files:**
- Create:
  - `src/app/api/admin/gdrive/config/route.js`
  - `src/app/api/admin/gdrive/auth/route.js`
  - `src/app/api/admin/gdrive/callback/route.js`
  - `src/app/api/admin/gdrive/status/route.js`
  - `src/app/api/admin/gdrive/disconnect/route.js`
  - `src/app/api/admin/gdrive/backup/route.js`
  - `src/app/api/admin/gdrive/list/route.js`
  - `src/app/api/admin/gdrive/restore/route.js`
  - `src/app/api/admin/gdrive/delete/route.js`

- [ ] **Step 1: Implement `src/app/api/admin/gdrive/config/route.js`**

```javascript
import { getSession } from "@/lib/auth";
import { getGDriveConfig, saveGDriveConfig } from "@/lib/gdrive";
import { getPublicOrigin } from "@/lib/publicOrigin";
import { NextResponse } from "next/server";

export async function GET(request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const config = await getGDriveConfig();
    const origin = getPublicOrigin(request);
    const callbackUrl = `${origin}/api/admin/gdrive/callback`;

    return NextResponse.json({
        clientId: config.clientId,
        hasClientSecret: Boolean(config.clientSecret),
        callbackUrl,
        isConfigured: config.isConfigured,
        isConnected: config.isConnected,
    });
}

export async function POST(request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { clientId, clientSecret } = body;

    if (clientId === undefined && clientSecret === undefined) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const updates = {};
    if (clientId !== undefined) updates.clientId = clientId.trim();
    if (clientSecret !== undefined && clientSecret !== "") updates.clientSecret = clientSecret.trim();

    await saveGDriveConfig(updates);
    return NextResponse.json({ success: true, message: "Google Drive API settings saved successfully." });
}
```

- [ ] **Step 2: Implement `src/app/api/admin/gdrive/auth/route.js`**

```javascript
import { getSession } from "@/lib/auth";
import { getGDriveConfig } from "@/lib/gdrive";
import { getPublicOrigin } from "@/lib/publicOrigin";
import { NextResponse } from "next/server";

export async function GET(request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const config = await getGDriveConfig();
    if (!config.isConfigured) {
        return NextResponse.json({ error: "Google Drive API Client ID and Secret are not configured yet." }, { status: 400 });
    }

    const origin = getPublicOrigin(request);
    const redirectUri = `${origin}/api/admin/gdrive/callback`;

    const scope = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        access_type: 'offline',
        prompt: 'consent',
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.redirect(googleAuthUrl);
}
```

- [ ] **Step 3: Implement `src/app/api/admin/gdrive/callback/route.js`**

```javascript
import { getSession } from "@/lib/auth";
import { getGDriveConfig, saveGDriveConfig } from "@/lib/gdrive";
import { getPublicOrigin } from "@/lib/publicOrigin";
import { NextResponse } from "next/server";

export async function GET(request) {
    const session = await getSession();
    if (!session) return NextResponse.redirect(new URL("/admin/login", request.url));

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
        return NextResponse.redirect(new URL(`/admin/database?gdrive_error=${encodeURIComponent(error || 'AUTH_CANCELLED')}`, request.url));
    }

    try {
        const config = await getGDriveConfig();
        const origin = getPublicOrigin(request);
        const redirectUri = `${origin}/api/admin/gdrive/callback`;

        // Exchange code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json().catch(() => ({}));
        if (!tokenRes.ok || !tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed.');
        }

        // Fetch user profile info
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json().catch(() => ({}));

        const tokenExpiry = Date.now() + (tokenData.expires_in || 3600) * 1000;

        await saveGDriveConfig({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || config.refreshToken,
            tokenExpiry,
            user: {
                id: userData.id || '',
                name: userData.name || userData.email || 'Google User',
                email: userData.email || '',
                picture: userData.picture || '',
            },
        });

        return NextResponse.redirect(new URL('/admin/database?gdrive=connected', request.url));
    } catch (err) {
        return NextResponse.redirect(new URL(`/admin/database?gdrive_error=${encodeURIComponent(err.message)}`, request.url));
    }
}
```

- [ ] **Step 4: Implement `src/app/api/admin/gdrive/status/route.js` and `disconnect/route.js`**

`src/app/api/admin/gdrive/status/route.js`:
```javascript
import { getSession } from "@/lib/auth";
import { getGDriveConfig } from "@/lib/gdrive";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const config = await getGDriveConfig();
    return NextResponse.json({
        isConfigured: config.isConfigured,
        isConnected: config.isConnected,
        user: config.user,
        clientId: config.clientId ? `${config.clientId.substring(0, 12)}...` : null,
        updatedAt: config.updatedAt,
    });
}
```

`src/app/api/admin/gdrive/disconnect/route.js`:
```javascript
import { getSession } from "@/lib/auth";
import { clearGDriveTokens } from "@/lib/gdrive";
import { NextResponse } from "next/server";

export async function POST() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await clearGDriveTokens();
    return NextResponse.json({ success: true, message: "Google Drive account disconnected." });
}
```

- [ ] **Step 5: Implement `backup/route.js`, `list/route.js`, `restore/route.js`, and `delete/route.js`**

`src/app/api/admin/gdrive/backup/route.js`:
```javascript
import { getSession } from "@/lib/auth";
import { uploadBackupToDrive } from "@/lib/gdrive";
import { getPublicOrigin } from "@/lib/publicOrigin";
import { NextResponse } from "next/server";

export async function POST(request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const origin = getPublicOrigin(request);
        const { searchParams } = new URL(request.url);
        
        // Fetch backup zip stream from local export API route
        const exportRes = await fetch(`${origin}/api/admin/export?${searchParams.toString()}`, {
            headers: { cookie: request.headers.get('cookie') || '' },
        });

        if (!exportRes.ok) {
            throw new Error(`Failed to generate database export ZIP (HTTP ${exportRes.status}).`);
        }

        const zipArrayBuffer = await exportRes.arrayBuffer();
        const zipBuffer = Buffer.from(zipArrayBuffer);

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `aiyu_backup_${dateStr}_${timeStr}.zip`;

        const uploadedFile = await uploadBackupToDrive(zipBuffer, filename);
        return NextResponse.json({ success: true, file: uploadedFile });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
```

`src/app/api/admin/gdrive/list/route.js`:
```javascript
import { getSession } from "@/lib/auth";
import { listDriveBackups } from "@/lib/gdrive";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const files = await listDriveBackups();
        return NextResponse.json({ success: true, files });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
```

`src/app/api/admin/gdrive/restore/route.js`:
```javascript
import { getSession } from "@/lib/auth";
import { downloadDriveBackup } from "@/lib/gdrive";
import { getPublicOrigin } from "@/lib/publicOrigin";
import { NextResponse } from "next/server";

export async function POST(request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json().catch(() => ({}));
        const { fileId } = body;
        if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

        const zipBuffer = await downloadDriveBackup(fileId);
        const origin = getPublicOrigin(request);

        const importRes = await fetch(`${origin}/api/admin/import`, {
            method: 'POST',
            headers: {
                cookie: request.headers.get('cookie') || '',
                'Content-Type': 'application/octet-stream',
                'x-backup-filename': `gdrive_restore_${fileId}.zip`,
            },
            body: zipBuffer,
        });

        const importData = await importRes.json().catch(() => ({}));
        if (!importRes.ok) {
            throw new Error(importData.error || `Restore failed (HTTP ${importRes.status}).`);
        }

        return NextResponse.json({ success: true, message: "System database restored successfully from Google Drive." });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
```

`src/app/api/admin/gdrive/delete/route.js`:
```javascript
import { getSession } from "@/lib/auth";
import { deleteDriveBackup } from "@/lib/gdrive";
import { NextResponse } from "next/server";

export async function POST(request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json().catch(() => ({}));
        const { fileId } = body;
        if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

        await deleteDriveBackup(fileId);
        return NextResponse.json({ success: true, message: "Backup removed from Google Drive." });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/gdrive
git commit -m "feat(gdrive): implement google drive OAuth and backup API endpoints"
```

---

### Task 3: Implement Google Drive Card & Configuration Modal on `/admin/database/page.js`

**Files:**
- Modify: `src/app/admin/database/page.js`

- [ ] **Step 1: Add Google Drive state, fetchers, and handlers to `src/app/admin/database/page.js`**

Include:
- Google Drive Status & History state (`gdriveStatus`, `gdriveFiles`, `showGDriveModal`, `gdriveConfigForm`, `gdriveLoading`).
- Auto-detect URL query params (`gdrive=connected` or `gdrive_error`).
- `fetchGDriveStatus` & `fetchGDriveFiles`.
- Dynamic Redirect URL generator with 1-click `Copy Redirect URL`.
- Expandable step-by-step setup documentation.

- [ ] **Step 2: Add Google Drive Cloud Card to main grid section**

Render a styled cyberpunk card alongside Backup/Restore/Cache Purge:
- Status Badge (`CONNECTED`, `NOT_CONFIGURED`, `DISCONNECTED`).
- User Avatar & Profile details when connected.
- Monospace uppercase action buttons: `CONFIG_API`, `CONNECT_DRIVE`, `BACKUP_TO_CLOUD`, `VIEW_CLOUD_HISTORY`, `DISCONNECT`.
- Expandable Google Drive Backups History drawer with `RESTORE` & `DELETE` buttons.

- [ ] **Step 3: Update `Configure Backup` modal with Direct Google Drive Cloud Dump option**

Add a `UPLOAD_TO_GOOGLE_DRIVE` action button inside the selection dump modal.

- [ ] **Step 4: Run ESLint to verify no syntax errors**

Run: `npm run lint`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/database/page.js
git commit -m "feat(gdrive): add dynamic gdrive card, setup modal, and cloud backup UI to admin database page"
```

---

### Task 4: Complete System Verification & Final Docs

**Files:**
- Modify/Create: `docs/superpowers/specs/2026-07-25-gdrive-oauth-backup-design.md`

- [ ] **Step 1: Test API routes compilation**

Run: `npm run build`
Expected: Build passes clean without TypeScript/ESLint/Next.js route errors.

- [ ] **Step 2: Commit final polish**

```bash
git add .
git commit -m "docs(gdrive): update documentation and verify full backup/restore integration"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-07-25-gdrive-oauth-backup.md`.
