/**
 * Server-side "is the admin browsing right now?" probe.
 *
 * Mirrors the check in /api/analytics/track: a signed, unexpired `session`
 * cookie means this request is us, not a visitor. Signature verification alone
 * is enough — no DB lookup, so this stays cheap enough to call from the root
 * layout on every request.
 *
 * Used to suppress analytics (first-party beacons and Google Analytics) while
 * logged in, so the admin's own browsing never pollutes visitor stats.
 */
import { cookies } from 'next/headers';
import { cache } from 'react';
import { decrypt } from '@/lib/jwt';

/** True when the current request carries a valid admin session cookie. */
export const isAdminViewer = cache(async () => {
    try {
        const token = (await cookies()).get('session')?.value;
        if (!token) return false;
        return Boolean(await decrypt(token));
    } catch {
        return false;
    }
});
