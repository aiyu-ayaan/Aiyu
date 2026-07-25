import { describe, it, expect, beforeEach, vi } from 'vitest';

process.env.JWT_SECRET = 'test-jwt-secret-key-for-gdrive-tests';

const { mockPrismaConfig } = vi.hoisted(() => {
  return {
    mockPrismaConfig: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    config: mockPrismaConfig,
  },
}));

import {
  getGDriveConfig,
  saveGDriveConfig,
  clearGDriveTokens,
  getValidAccessToken,
  getOrCreateBackupFolder,
  uploadBackupToDrive,
  listDriveBackups,
  downloadDriveBackup,
  deleteDriveBackup,
} from '@/lib/gdrive';

describe('Google Drive Helper Module (gdrive.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  describe('getGDriveConfig & saveGDriveConfig', () => {
    it('returns empty/null config structure when no config record exists in DB', async () => {
      mockPrismaConfig.findFirst.mockResolvedValue(null);

      const config = await getGDriveConfig();
      expect(config).toEqual({
        clientId: null,
        clientSecret: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        user: null,
        folderId: null,
      });
    });

    it('saves encrypted config values and retrieves decrypted config', async () => {
      let dbStorage = null;

      mockPrismaConfig.findFirst.mockImplementation(async () => dbStorage);
      mockPrismaConfig.create.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });
      mockPrismaConfig.update.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });

      const initialSave = await saveGDriveConfig({
        clientId: 'client_123',
        clientSecret: 'secret_456',
        accessToken: 'access_789',
        refreshToken: 'refresh_abc',
        tokenExpiry: 1700000000000,
        user: 'user@example.com',
        folderId: 'folder_xyz',
      });

      expect(initialSave.clientId).toBe('client_123');
      expect(initialSave.clientSecret).toBe('secret_456');
      expect(initialSave.accessToken).toBe('access_789');
      expect(initialSave.refreshToken).toBe('refresh_abc');
      expect(initialSave.tokenExpiry).toBe(1700000000000);
      expect(initialSave.user).toBe('user@example.com');
      expect(initialSave.folderId).toBe('folder_xyz');

      // Verify stored data in db is encrypted
      expect(dbStorage.data.gdriveConfig.clientId).not.toBe('client_123');
      expect(dbStorage.data.gdriveConfig.clientId).toContain(':');

      const fetched = await getGDriveConfig();
      expect(fetched).toEqual(initialSave);
    });
  });

  describe('clearGDriveTokens', () => {
    it('clears token details while preserving clientId and clientSecret', async () => {
      let dbStorage = null;
      mockPrismaConfig.findFirst.mockImplementation(async () => dbStorage);
      mockPrismaConfig.create.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });
      mockPrismaConfig.update.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });

      await saveGDriveConfig({
        clientId: 'client_123',
        clientSecret: 'secret_456',
        accessToken: 'token_abc',
        refreshToken: 'refresh_xyz',
        user: 'admin@aiyu.com',
        folderId: 'folder_123',
      });

      const cleared = await clearGDriveTokens();

      expect(cleared.clientId).toBe('client_123');
      expect(cleared.clientSecret).toBe('secret_456');
      expect(cleared.accessToken).toBeNull();
      expect(cleared.refreshToken).toBeNull();
      expect(cleared.tokenExpiry).toBeNull();
      expect(cleared.user).toBeNull();
      expect(cleared.folderId).toBeNull();
    });
  });

  describe('getValidAccessToken', () => {
    it('returns existing access token if not expired', async () => {
      let dbStorage = null;
      mockPrismaConfig.findFirst.mockImplementation(async () => dbStorage);
      mockPrismaConfig.create.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });

      const futureExpiry = Date.now() + 1000000;
      await saveGDriveConfig({
        clientId: 'c1',
        clientSecret: 's1',
        accessToken: 'valid_access_token',
        refreshToken: 'r1',
        tokenExpiry: futureExpiry,
      });

      const token = await getValidAccessToken();
      expect(token).toBe('valid_access_token');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('refreshes token at Google OAuth endpoint if expired', async () => {
      let dbStorage = null;
      mockPrismaConfig.findFirst.mockImplementation(async () => dbStorage);
      mockPrismaConfig.create.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });
      mockPrismaConfig.update.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });

      const pastExpiry = Date.now() - 1000;
      await saveGDriveConfig({
        clientId: 'client_id_val',
        clientSecret: 'client_secret_val',
        accessToken: 'expired_access_token',
        refreshToken: 'refresh_token_val',
        tokenExpiry: pastExpiry,
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_refreshed_access_token',
          expires_in: 3600,
        }),
      });

      const token = await getValidAccessToken();
      expect(token).toBe('new_refreshed_access_token');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('throws error if credentials or refresh token are missing', async () => {
      mockPrismaConfig.findFirst.mockResolvedValue(null);
      await expect(getValidAccessToken()).rejects.toThrow(
        'Google Drive credentials or refresh token missing'
      );
    });
  });

  describe('getOrCreateBackupFolder', () => {
    it('returns existing folder ID if folder exists', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ id: 'existing_folder_id', name: 'Aiyu Backups' }],
        }),
      });

      const folderId = await getOrCreateBackupFolder('token_123');
      expect(folderId).toBe('existing_folder_id');
    });

    it('creates new folder if not found', async () => {
      // 1. Search returns empty files
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      });

      // 2. Create returns new folder object
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new_created_folder_id', name: 'Aiyu Backups' }),
      });

      const folderId = await getOrCreateBackupFolder('token_123');
      expect(folderId).toBe('new_created_folder_id');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('uploadBackupToDrive', () => {
    it('performs multipart upload to Google Drive', async () => {
      let dbStorage = null;
      mockPrismaConfig.findFirst.mockImplementation(async () => dbStorage);
      mockPrismaConfig.create.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });

      const futureExpiry = Date.now() + 1000000;
      await saveGDriveConfig({
        clientId: 'c1',
        clientSecret: 's1',
        accessToken: 'access_123',
        refreshToken: 'r1',
        tokenExpiry: futureExpiry,
        folderId: 'folder_999',
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'uploaded_file_id', name: 'backup.zip' }),
      });

      const zipBuffer = Buffer.from('mock-zip-content');
      const res = await uploadBackupToDrive(zipBuffer, 'backup.zip');

      expect(res).toEqual({ id: 'uploaded_file_id', name: 'backup.zip' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer access_123',
          }),
        })
      );
    });
  });

  describe('listDriveBackups', () => {
    it('lists backup files in folder', async () => {
      let dbStorage = null;
      mockPrismaConfig.findFirst.mockImplementation(async () => dbStorage);
      mockPrismaConfig.create.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });

      const futureExpiry = Date.now() + 1000000;
      await saveGDriveConfig({
        clientId: 'c1',
        clientSecret: 's1',
        accessToken: 'access_123',
        refreshToken: 'r1',
        tokenExpiry: futureExpiry,
        folderId: 'folder_999',
      });

      const filesMock = [{ id: 'f1', name: 'backup_2026.zip' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: filesMock }),
      });

      const list = await listDriveBackups();
      expect(list).toEqual(filesMock);
    });
  });

  describe('downloadDriveBackup & deleteDriveBackup', () => {
    it('downloadDriveBackup retrieves file as Buffer', async () => {
      let dbStorage = null;
      mockPrismaConfig.findFirst.mockImplementation(async () => dbStorage);
      mockPrismaConfig.create.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });

      await saveGDriveConfig({
        clientId: 'c1',
        clientSecret: 's1',
        accessToken: 'access_123',
        refreshToken: 'r1',
        tokenExpiry: Date.now() + 1000000,
      });

      const fileData = Buffer.from('file-content-buffer');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength),
      });

      const downloaded = await downloadDriveBackup('file_123');
      expect(Buffer.isBuffer(downloaded)).toBe(true);
      expect(downloaded.toString()).toBe('file-content-buffer');
    });

    it('deleteDriveBackup calls DELETE API and returns true', async () => {
      let dbStorage = null;
      mockPrismaConfig.findFirst.mockImplementation(async () => dbStorage);
      mockPrismaConfig.create.mockImplementation(async ({ data }) => {
        dbStorage = { id: 'cfg_1', data: data.data };
        return dbStorage;
      });

      await saveGDriveConfig({
        clientId: 'c1',
        clientSecret: 's1',
        accessToken: 'access_123',
        refreshToken: 'r1',
        tokenExpiry: Date.now() + 1000000,
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await deleteDriveBackup('file_123');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file_123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
