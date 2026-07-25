import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse, NextRequest } from 'next/server';

process.env.JWT_SECRET = 'test-jwt-secret-key-for-gdrive-routes-tests';

const { mockGetSession, mockGDrive, mockPublicOrigin, mockPrismaConfig } = vi.hoisted(() => {
  return {
    mockGetSession: vi.fn(),
    mockGDrive: {
      getGDriveConfig: vi.fn(),
      saveGDriveConfig: vi.fn(),
      clearGDriveTokens: vi.fn(),
      uploadBackupToDrive: vi.fn(),
      listDriveBackups: vi.fn(),
      downloadDriveBackup: vi.fn(),
      deleteDriveBackup: vi.fn(),
      cleanOldDriveBackups: vi.fn(),
      OAUTH_STATE_COOKIE: 'gdrive_oauth_state',
      OAUTH_STATE_MAX_AGE: 600,
    },
    mockPublicOrigin: vi.fn().mockReturnValue('http://localhost:3000'),
    mockPrismaConfig: {
      findFirst: vi.fn(),
    },
  };
});

vi.mock('@/lib/auth', () => ({
  getSession: mockGetSession,
}));

vi.mock('@/lib/gdrive', () => mockGDrive);

vi.mock('@/lib/publicOrigin', () => ({
  getPublicOrigin: mockPublicOrigin,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    config: mockPrismaConfig,
  },
}));

import { GET as getConfig, POST as postConfig } from '../config/route';
import { GET as getAuth } from '../auth/route';
import { GET as getCallback } from '../callback/route';
import { GET as getStatus } from '../status/route';
import { POST as postDisconnect } from '../disconnect/route';
import { POST as postBackup } from '../backup/route';
import { GET as getList } from '../list/route';
import { POST as postRestore } from '../restore/route';
import { POST as postDelete } from '../delete/route';

describe('Google Drive API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    global.fetch = vi.fn();
    mockPublicOrigin.mockReturnValue('http://localhost:3000');
  });

  describe('1. /api/admin/gdrive/config', () => {
    it('GET returns 401 when unauthorized', async () => {
      mockGetSession.mockResolvedValue(null);
      const res = await getConfig(new Request('http://localhost:3000/api/admin/gdrive/config'));
      expect(res.status).toBe(401);
    });

    it('GET returns configuration status when session exists', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });
      mockGDrive.getGDriveConfig.mockResolvedValue({
        clientId: 'client123',
        clientSecret: 'secret456',
        accessToken: 'access789',
        refreshToken: 'refreshabc',
      });

      const res = await getConfig(new Request('http://localhost:3000/api/admin/gdrive/config'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        clientId: 'client123',
        hasClientSecret: true,
        callbackUrl: 'http://localhost:3000/api/admin/gdrive/callback',
        isConfigured: true,
        isConnected: true,
        retentionMonths: 1,
        autoDeleteEnabled: false,
      });
    });

    it('POST saves config and returns success', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });
      mockGDrive.saveGDriveConfig.mockResolvedValue({
        clientId: 'new_client',
        clientSecret: 'new_secret',
      });

      const req = new Request('http://localhost:3000/api/admin/gdrive/config', {
        method: 'POST',
        body: JSON.stringify({ clientId: 'new_client', clientSecret: 'new_secret' }),
      });
      const res = await postConfig(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        success: true,
        isConfigured: true,
        retentionMonths: 1,
        autoDeleteEnabled: false,
      });
      expect(mockGDrive.saveGDriveConfig).toHaveBeenCalledWith({
        clientId: 'new_client',
        clientSecret: 'new_secret',
      });
    });
  });

  describe('2. /api/admin/gdrive/auth', () => {
    it('GET returns 400 if Google Drive is not configured', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });
      mockGDrive.getGDriveConfig.mockResolvedValue({ clientId: null, clientSecret: null });

      const res = await getAuth(new Request('http://localhost:3000/api/admin/gdrive/auth'));
      expect(res.status).toBe(400);
    });

    it('GET redirects to Google OAuth endpoint with required query params', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });
      mockGDrive.getGDriveConfig.mockResolvedValue({
        clientId: 'my_client_id',
        clientSecret: 'my_client_secret',
      });

      const res = await getAuth(new Request('http://localhost:3000/api/admin/gdrive/auth'));
      expect(res.status).toBe(307);
      const redirectUrl = new URL(res.headers.get('location'));
      expect(redirectUrl.origin).toBe('https://accounts.google.com');
      expect(redirectUrl.pathname).toBe('/o/oauth2/v2/auth');
      expect(redirectUrl.searchParams.get('client_id')).toBe('my_client_id');
      expect(redirectUrl.searchParams.get('access_type')).toBe('offline');
      expect(redirectUrl.searchParams.get('prompt')).toBe('consent');
      expect(redirectUrl.searchParams.get('response_type')).toBe('code');
      expect(redirectUrl.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/drive.file');

      // The CSRF nonce must travel in the URL and be pinned in a cookie the
      // callback can compare against.
      const state = redirectUrl.searchParams.get('state');
      expect(state).toMatch(/^[a-f0-9]{64}$/);
      expect(res.cookies.get('gdrive_oauth_state')?.value).toBe(state);
    });
  });

  describe('3. /api/admin/gdrive/callback', () => {
    const STATE = 'a'.repeat(64);

    // The callback reads a cookie, so it needs a NextRequest rather than a bare
    // Request.
    const callbackRequest = (query, { state = STATE } = {}) => {
      const req = new NextRequest(`http://localhost:3000/api/admin/gdrive/callback?${query}`);
      if (state !== null) req.cookies.set('gdrive_oauth_state', state);
      return req;
    };

    it('GET redirects with error if code is missing or error is present', async () => {
      const res = await getCallback(callbackRequest('error=access_denied'));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/database?gdrive_error=access_denied');
    });

    it('GET rejects a code whose state does not match the cookie', async () => {
      const res = await getCallback(
        callbackRequest(`code=oauth_code_123&state=${'b'.repeat(64)}`)
      );
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/database?gdrive_error=invalid_state');
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockGDrive.saveGDriveConfig).not.toHaveBeenCalled();
    });

    it('GET rejects a code with no state cookie at all', async () => {
      const res = await getCallback(
        callbackRequest(`code=oauth_code_123&state=${STATE}`, { state: null })
      );
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/database?gdrive_error=invalid_state');
      expect(mockGDrive.saveGDriveConfig).not.toHaveBeenCalled();
    });

    it('GET exchanges code for tokens and redirects to success', async () => {
      mockGDrive.getGDriveConfig.mockResolvedValue({
        clientId: 'my_client_id',
        clientSecret: 'my_client_secret',
      });

      // Token response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'acc_123',
          refresh_token: 'ref_456',
          expires_in: 3600,
        }),
      });

      // User info response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: 'admin@aiyu.com' }),
      });

      const res = await getCallback(callbackRequest(`code=oauth_code_123&state=${STATE}`));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/database?gdrive=connected');
      expect(mockGDrive.saveGDriveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'acc_123',
          refreshToken: 'ref_456',
          user: 'admin@aiyu.com',
        })
      );
      // Nonce consumed, so the same callback URL cannot be replayed.
      expect(res.cookies.get('gdrive_oauth_state')?.value).toBe('');
    });
  });

  describe('4. /api/admin/gdrive/status', () => {
    it('GET returns status info', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });
      mockGDrive.getGDriveConfig.mockResolvedValue({
        clientId: 'c1',
        clientSecret: 's1',
        refreshToken: 'r1',
        user: 'user@test.com',
      });
      mockPrismaConfig.findFirst.mockResolvedValue({ updatedAt: new Date('2026-01-01T00:00:00Z') });

      const res = await getStatus(new Request('http://localhost:3000/api/admin/gdrive/status'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        isConfigured: true,
        isConnected: true,
        user: 'user@test.com',
        clientId: 'c1',
        updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
        retentionMonths: 1,
        autoDeleteEnabled: false,
      });
    });
  });

  describe('5. /api/admin/gdrive/disconnect', () => {
    it('POST calls clearGDriveTokens', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });
      mockGDrive.clearGDriveTokens.mockResolvedValue({});

      const res = await postDisconnect(new Request('http://localhost:3000/api/admin/gdrive/disconnect', { method: 'POST' }));
      expect(res.status).toBe(200);
      expect(mockGDrive.clearGDriveTokens).toHaveBeenCalled();
    });
  });

  describe('6. /api/admin/gdrive/backup', () => {
    it('POST exports backup and uploads to Google Drive', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-disposition': 'attachment; filename="aiyu-backup.zip"' }),
        arrayBuffer: async () => Buffer.from('mock-zip-bytes').buffer,
      });

      mockGDrive.uploadBackupToDrive.mockResolvedValue({ id: 'drive_file_id', name: 'aiyu-backup.zip' });

      const res = await postBackup(new Request('http://localhost:3000/api/admin/gdrive/backup', { method: 'POST' }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.file).toEqual({ id: 'drive_file_id', name: 'aiyu-backup.zip' });
    });
  });

  describe('7. /api/admin/gdrive/list', () => {
    it('GET lists backups from Google Drive', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });
      mockGDrive.listDriveBackups.mockResolvedValue([{ id: 'f1', name: 'b1.zip' }]);

      const res = await getList(new Request('http://localhost:3000/api/admin/gdrive/list'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ success: true, files: [{ id: 'f1', name: 'b1.zip' }] });
    });
  });

  describe('8. /api/admin/gdrive/restore', () => {
    it('POST downloads backup from drive and posts to local import', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });
      mockGDrive.downloadDriveBackup.mockResolvedValue(Buffer.from('zip-content'));

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Import successful' }),
      });

      const req = new Request('http://localhost:3000/api/admin/gdrive/restore', {
        method: 'POST',
        body: JSON.stringify({ fileId: 'drive_file_id_1' }),
      });

      const res = await postRestore(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockGDrive.downloadDriveBackup).toHaveBeenCalledWith('drive_file_id_1');
    });
  });

  describe('9. /api/admin/gdrive/delete', () => {
    it('POST deletes backup from Google Drive', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 1 } });
      mockGDrive.deleteDriveBackup.mockResolvedValue(true);

      const req = new Request('http://localhost:3000/api/admin/gdrive/delete', {
        method: 'POST',
        body: JSON.stringify({ fileId: 'drive_file_id_1' }),
      });

      const res = await postDelete(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockGDrive.deleteDriveBackup).toHaveBeenCalledWith('drive_file_id_1');
    });
  });
});
