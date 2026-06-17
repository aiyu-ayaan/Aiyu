import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
    throw new Error('JWT_SECRET environment variable must be set');
}
const key = new TextEncoder().encode(secretKey);

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// Only bump lastSeenAt at most once per minute to avoid a write on every request.
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

export async function encrypt(payload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

export async function decrypt(input) {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

/**
 * Authenticate the admin and, on success, open a DB-backed session.
 *
 * The JWT carries an opaque `jti` that maps to the Session row. Statelessly
 * signed tokens cannot be revoked individually; the row is what lets us list
 * active devices and remotely log one out (see getSession / revokeSession).
 *
 * @param {FormData} formData
 * @param {{ ipAddress?: string, userAgent?: string }} [meta]
 * @returns {Promise<boolean>}
 */
export async function login(formData, meta = {}) {
    const user = { email: formData.get('email'), name: 'Admin' };

    const username = formData.get('username');
    const password = formData.get('password');

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {
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
