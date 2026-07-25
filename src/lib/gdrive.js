import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

const CONFIG_FIELDS = [
  'clientId',
  'clientSecret',
  'accessToken',
  'refreshToken',
  'tokenExpiry',
  'user',
  'folderId',
];

/**
 * Retrieves and decrypts `gdriveConfig` from `prisma.config`.
 */
export async function getGDriveConfig() {
  const configRecord = await prisma.config.findFirst();
  const rawConfig = configRecord?.data?.gdriveConfig || {};

  const config = {};
  for (const field of CONFIG_FIELDS) {
    const rawVal = rawConfig[field];
    if (rawVal) {
      const decryptedVal = decrypt(rawVal);
      if (field === 'tokenExpiry') {
        config[field] = decryptedVal ? Number(decryptedVal) : null;
      } else {
        config[field] = decryptedVal ?? null;
      }
    } else {
      config[field] = null;
    }
  }

  return config;
}

/**
 * Merges and encrypts `clientId`, `clientSecret`, `accessToken`, `refreshToken`, `tokenExpiry`, `user`, `folderId` into `prisma.config.data.gdriveConfig`.
 */
export async function saveGDriveConfig(updates = {}) {
  const configRecord = await prisma.config.findFirst();
  const existingData =
    configRecord?.data && typeof configRecord.data === 'object'
      ? configRecord.data
      : {};
  const currentGDrive = existingData.gdriveConfig || {};

  const updatedGDrive = { ...currentGDrive };

  for (const field of CONFIG_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      const val = updates[field];
      if (val !== undefined && val !== null && val !== '') {
        updatedGDrive[field] = encrypt(String(val));
      } else {
        updatedGDrive[field] = null;
      }
    }
  }

  const newData = {
    ...existingData,
    gdriveConfig: updatedGDrive,
  };

  if (configRecord) {
    await prisma.config.update({
      where: { id: configRecord.id },
      data: { data: newData },
    });
  } else {
    await prisma.config.create({
      data: { data: newData },
    });
  }

  return getGDriveConfig();
}

/**
 * Clears token data while preserving `clientId` and `clientSecret`.
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
 * Auto-refreshes `access_token` at `https://oauth2.googleapis.com/token` if expired using `refreshToken`.
 */
export async function getValidAccessToken() {
  const config = await getGDriveConfig();
  const now = Date.now();

  if (
    config.accessToken &&
    config.tokenExpiry &&
    Number(config.tokenExpiry) > now + 60000
  ) {
    return config.accessToken;
  }

  if (!config.refreshToken || !config.clientId || !config.clientSecret) {
    throw new Error('Google Drive credentials or refresh token missing');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Failed to refresh Google Drive token: ${response.statusText} - ${errText}`
    );
  }

  const tokenData = await response.json();
  if (!tokenData.access_token) {
    throw new Error('No access token returned from Google OAuth');
  }

  const newExpiry =
    Date.now() +
    (tokenData.expires_in ? tokenData.expires_in * 1000 : 3600 * 1000);

  const updates = {
    accessToken: tokenData.access_token,
    tokenExpiry: newExpiry,
  };

  if (tokenData.refresh_token) {
    updates.refreshToken = tokenData.refresh_token;
  }

  await saveGDriveConfig(updates);
  return tokenData.access_token;
}

/**
 * Finds or creates `Aiyu Backups` folder in Google Drive.
 */
export async function getOrCreateBackupFolder(accessToken) {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  const query =
    "name='Aiyu Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false";
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name)`;

  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Failed to search Google Drive folder: ${res.statusText} - ${errText}`
    );
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Aiyu Backups',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(
      `Failed to create Google Drive backup folder: ${createRes.statusText} - ${errText}`
    );
  }

  const folder = await createRes.json();
  return folder.id;
}

/**
 * Multipart upload to Google Drive.
 */
export async function uploadBackupToDrive(zipBuffer, filename) {
  const accessToken = await getValidAccessToken();
  const config = await getGDriveConfig();

  let folderId = config.folderId;
  if (!folderId) {
    folderId = await getOrCreateBackupFolder(accessToken);
    await saveGDriveConfig({ folderId });
  }

  const boundary =
    '-------AiyuBoundary' + Math.random().toString(36).substring(2);
  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType: 'application/zip',
  };

  const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}\r\n`;
  const mediaHeader = `--${boundary}\r\nContent-Type: application/zip\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(metadataPart, 'utf-8'),
    Buffer.from(mediaHeader, 'utf-8'),
    Buffer.isBuffer(zipBuffer) ? zipBuffer : Buffer.from(zipBuffer),
    Buffer.from(footer, 'utf-8'),
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Failed to upload backup to Google Drive: ${res.statusText} - ${errText}`
    );
  }

  return await res.json();
}

/**
 * Lists backup zip files in `Aiyu Backups` folder.
 */
export async function listDriveBackups() {
  const accessToken = await getValidAccessToken();
  const config = await getGDriveConfig();

  let folderId = config.folderId;
  if (!folderId) {
    folderId = await getOrCreateBackupFolder(accessToken);
    await saveGDriveConfig({ folderId });
  }

  const query = `'${folderId}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,size,createdTime,modifiedTime)&orderBy=createdTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Failed to list Google Drive backups: ${res.statusText} - ${errText}`
    );
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Downloads backup file as Buffer.
 */
export async function downloadDriveBackup(fileId) {
  const accessToken = await getValidAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Failed to download Google Drive backup: ${res.statusText} - ${errText}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Removes file from Google Drive.
 */
export async function deleteDriveBackup(fileId) {
  const accessToken = await getValidAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Failed to delete Google Drive backup: ${res.statusText} - ${errText}`
    );
  }

  return true;
}
