/**
 * Public, unauthenticated analytics ingestion endpoint.
 *
 * Receives a small beacon payload from the public site and records it via the
 * analytics engine. Rate-limited per client to blunt abuse, and always returns
 * 204 (even on internal failure) so tracking never disrupts the user.
 */
import { NextResponse } from 'next/server';
import { recordEvent } from '@/lib/analytics';
import { decrypt } from '@/lib/auth';
import { getClientIdentifier, reserveRequestSlot } from '@/lib/trafficControl';

const NO_CONTENT = () => new NextResponse(null, { status: 204 });

export async function POST(request) {
    // Don't pollute visitor analytics with the admin's own traffic. The httpOnly
    // `session` cookie still rides along on the same-origin beacon, so a valid
    // (signed, unexpired) token means this is us browsing — skip recording.
    // Signature verification alone is enough here; no DB lookup on the hot path.
    const sessionToken = request.cookies.get('session')?.value;
    if (sessionToken && (await decrypt(sessionToken))) {
        return NO_CONTENT();
    }

    const clientId = getClientIdentifier(request);
    const slot = reserveRequestSlot('analytics-track', clientId, {
        maxRequests: Number.parseInt(process.env.ANALYTICS_RATE_LIMIT || '120', 10),
    });

    if (!slot.ok) {
        return new NextResponse(null, { status: slot.status });
    }

    try {
        let payload = {};
        try {
            payload = await request.json();
        } catch {
            payload = {};
        }

        if (payload && typeof payload === 'object') {
            await recordEvent(payload, request);
        }
    } catch (error) {
        // Never surface tracking failures to the client.
        console.error('[analytics] track route error:', error?.message);
    } finally {
        slot.release?.();
    }

    return NO_CONTENT();
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
