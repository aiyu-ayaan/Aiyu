import { describe, expect, it } from 'vitest';
import { fromClient, toConfigBackupList } from '@/lib/serialize';

describe('toConfigBackupList', () => {
    const row = {
        id: 'cfg1',
        data: { siteName: 'Aiyu' },
        encryptedGithubToken: 'enc-token',
        encryptedGithubWebhookSecret: 'enc-webhook',
    };

    it('includes the webhook secret but still withholds other secrets', () => {
        const [doc] = toConfigBackupList([row]);
        expect(doc).toMatchObject({ _id: 'cfg1', siteName: 'Aiyu', encryptedGithubWebhookSecret: 'enc-webhook' });
        expect(doc).not.toHaveProperty('encryptedGithubToken');
    });

    it('round-trips through import into the secret column', () => {
        const [doc] = toConfigBackupList([row]);
        const restored = fromClient('config', doc, { keepId: true });
        expect(restored.encryptedGithubWebhookSecret).toBe('enc-webhook');
        expect(restored.data).not.toHaveProperty('encryptedGithubWebhookSecret');
    });

    it('omits the key when no secret is set', () => {
        const [doc] = toConfigBackupList([{ ...row, encryptedGithubWebhookSecret: null }]);
        expect(doc).not.toHaveProperty('encryptedGithubWebhookSecret');
    });
});
