import { SignJWT, jwtVerify } from 'jose';

/**
 * Edge-safe JWT helpers.
 *
 * This module is deliberately free of Node-only / server-only imports (no
 * Prisma, no `next/headers`) so it can be imported from the edge proxy
 * (`src/proxy.js`). Pulling these helpers out of `lib/auth` is what stops the
 * proxy from throwing at runtime — when it imported `decrypt` from `lib/auth` it
 * transitively loaded Prisma and `next/headers`, which are invalid in the proxy
 * runtime, causing the proxy to fail open (admin gate + rate limiter inert).
 */

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
    throw new Error('JWT_SECRET environment variable must be set');
}
const key = new TextEncoder().encode(secretKey);

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
    } catch {
        return null;
    }
}
