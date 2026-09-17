/**
 * Cron secret store.
 *
 * Secrets for scheduled tasks live in the `cronEnv` singleton, AES-256
 * encrypted at rest and managed from "Manage Global Environment Secrets" on
 * /admin/config/crons. Webhook templates read them as `$env.KEY`; system tasks
 * read them through `resolveCronEnv()`.
 *
 * Deployment environment variables act as a fallback, so a key may be supplied
 * either from the admin UI (no redeploy) or from .env / prod.env. The store
 * wins when a key is set in both: it is the one an operator can see and edit.
 */
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';

/**
 * Decrypted secrets from the admin-managed store. Returns {} and logs rather
 * than throwing, so a task can still fall back to process.env if the store is
 * unreadable.
 */
export async function loadCronSecrets() {
    const secrets = {};
    try {
        const doc = await getSingleton(prisma, 'cronEnv');
        if (doc && Array.isArray(doc.env)) {
            for (const entry of doc.env) {
                if (entry.key && entry.key.trim()) {
                    secrets[entry.key.trim()] = entry.value ? decrypt(entry.value) : '';
                }
            }
        }
    } catch (err) {
        console.error('[CRON SECRETS] Failed to load global environment variables:', err);
    }
    return secrets;
}

/**
 * The store layered over process.env: admin-managed values take precedence,
 * blank entries fall through to the deployment environment.
 */
export async function resolveCronEnv() {
    const secrets = await loadCronSecrets();
    const merged = { ...process.env };
    for (const [key, value] of Object.entries(secrets)) {
        if (value !== '') merged[key] = value;
    }
    return merged;
}

/** Where a given key was found — for log lines that have to explain a 401. */
export function describeSecretSource(key, secrets, env = process.env) {
    if (secrets[key]) return 'global environment secrets';
    if (env[key]) return 'deployment environment';
    return 'not configured';
}
