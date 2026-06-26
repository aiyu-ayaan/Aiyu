import { cookies } from 'next/headers';
import { randomUUID, createHash, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from './jwt';

// Re-exported so existing `import { encrypt, decrypt } from '@/lib/auth'` call
// sites keep working. The implementations live in the edge-safe `./jwt` module.
export { encrypt, decrypt };

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// Only bump lastSeenAt at most once per minute to avoid a write on every request.
const LAST_SEEN_THROTTLE_MS = 60 * 1000;
// Inactive (revoked or expired) sessions are retained this long for the
// security audit view, then purged by the `prune_sessions` system cron.
export const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_RETENTION_DAYS = 7;

/**
 * Constant-time string comparison. Hashing both sides to a fixed 32-byte digest
 * keeps `timingSafeEqual` happy (it requires equal-length buffers) and prevents
 * the comparison time from leaking the secret's length or content.
 */
function safeEqual(provided, expected) {
    const a = createHash('sha256').update(String(provided ?? '')).digest();
    const b = createHash('sha256').update(String(expected ?? '')).digest();
    return timingSafeEqual(a, b);
}

/**
 * Open a DB-backed session and set the signed `session` cookie.
 *
 * The JWT carries an opaque `jti` that maps to the Session row. Statelessly
 * signed tokens cannot be revoked individually; the row is what lets us list
 * active devices and remotely log one out (see getSession / revokeSession).
 *
 * Shared by every successful auth path (password login and GitHub OAuth) so the
 * cookie flags, TTL, and jti handling live in exactly one place.
 *
 * @param {{ user: object, meta?: { ipAddress?: string, userAgent?: string } }} args
 * @returns {Promise<void>}
 */
export async function createSession({ user, meta = {} }) {
    const expires = new Date(Date.now() + SESSION_TTL_MS);
    const jti = randomUUID();

    await prisma.session.create({
        data: {
            jti,
            ipAddress: meta.ipAddress || '',
            userAgent: meta.userAgent || '',
            expiresAt: expires,
        },
    });

    const session = await encrypt({ user, jti, expires });

    (await cookies()).set('session', session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
}

/**
 * Authenticate the admin and, on success, open a DB-backed session.
 *
 * @param {FormData} formData
 * @param {{ ipAddress?: string, userAgent?: string }} [meta]
 * @returns {Promise<boolean>}
 */
export async function login(formData, meta = {}) {
    const user = { email: formData.get('email'), name: 'Admin' };

    const username = formData.get('username');
    const password = formData.get('password');

    const expectedUsername = process.env.ADMIN_USERNAME || '';
    const expectedPassword = process.env.ADMIN_PASSWORD || '';

    // Fail closed if admin credentials are not configured, so a blank submission
    // can never match an unset (empty) env var.
    if (!expectedUsername || !expectedPassword) {
        return false;
    }

    // Evaluate both comparisons before branching (no `&&` short-circuit) so the
    // response time does not reveal which field was wrong.
    const usernameOk = safeEqual(username, expectedUsername);
    const passwordOk = safeEqual(password, expectedPassword);

    if (usernameOk && passwordOk) {
        await createSession({ user, meta });
        return true;
    }

    return false;
}

export async function logout() {
    // Revoke the DB session backing the current cookie, then clear the cookie.
    const cookieStore = await cookies();
    const raw = cookieStore.get('session')?.value;
    if (raw) {
        const payload = await decrypt(raw);
        if (payload?.jti) {
            await prisma.session
                .updateMany({
                    where: { jti: payload.jti, revokedAt: null },
                    data: { revokedAt: new Date() },
                })
                .catch(() => {});
        }
    }

    cookieStore.set('session', '', {
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
}

/**
 * Resolve the current session from the cookie. Returns null unless a matching
 * Session row exists and is neither revoked nor expired. The decoded payload is
 * augmented with `sessionId` (the Session row id) so callers can identify the
 * device currently in use.
 */
export async function getSession() {
    const token = (await cookies()).get('session')?.value;
    if (!token) return null;

    const payload = await decrypt(token);
    if (!payload) return null;

    // Legacy tokens issued before DB-backed sessions have no jti — reject so the
    // admin re-logs in once and gets a tracked session.
    if (!payload.jti) return null;

    let row;
    try {
        row = await prisma.session.findUnique({ where: { jti: payload.jti } });
    } catch {
        return null;
    }

    if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
        return null;
    }

    // Throttled liveness update so the session list shows recent activity
    // without writing on every authenticated request.
    if (Date.now() - row.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
        prisma.session
            .update({ where: { id: row.id }, data: { lastSeenAt: new Date() } })
            .catch(() => {});
    }

    return { ...payload, sessionId: row.id };
}

/**
 * Revoke a single session by row id. Returns the revoked session id, or null if
 * it did not exist / was already revoked.
 */
export async function revokeSession(sessionId) {
    const result = await prisma.session.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    return result.count > 0 ? sessionId : null;
}

/**
 * Permanently delete sessions that have been inactive (revoked or naturally
 * expired) for longer than SESSION_RETENTION_MS. Active sessions are never
 * touched. Returns the number of rows removed. Driven by the `prune_sessions`
 * system cron, but safe to call ad-hoc.
 */
export async function pruneSessions(now = new Date()) {
    const cutoff = new Date(now.getTime() - SESSION_RETENTION_MS);
    const result = await prisma.session.deleteMany({
        where: {
            OR: [
                { revokedAt: { not: null, lt: cutoff } },
                { revokedAt: null, expiresAt: { lt: cutoff } },
            ],
        },
    });
    return result.count;
}
