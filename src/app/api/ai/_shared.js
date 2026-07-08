import { NextResponse } from 'next/server';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { requireAiWrite, AiSectionError } from '@/lib/aiSections';

/**
 * Shared helpers for the public AI-section REST routes (/api/ai/*).
 * Reads are public (cached at the edge); writes require an admin session or a
 * bearer token (see requireAiWrite). Handlers stay thin — validation and
 * persistence live in lib/aiSections.
 */

/** JSON response for a public read, with medium public cache headers. */
export function publicJson(value, init = {}) {
    return NextResponse.json(value, {
        ...init,
        headers: { ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM), ...(init.headers || {}) },
    });
}

/** Parse a JSON body, tolerating an empty body. */
async function readJson(request) {
    try {
        return await request.json();
    } catch {
        return {};
    }
}

/**
 * Run a guarded write: enforce auth, parse the body, execute `fn(body, ctx)`,
 * and map AiSectionError to the right HTTP status. Returns a NextResponse.
 */
export async function handleWrite(request, fn) {
    if (!(await requireAiWrite(request))) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await readJson(request);
        const result = await fn(body);
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        if (error instanceof AiSectionError) {
            return NextResponse.json({ ok: false, error: error.message }, { status: error.status || 400 });
        }
        console.error('AI section write failed:', error);
        return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
    }
}

/** Run a public read; map errors to 500. */
export async function handleRead(fn) {
    try {
        return publicJson(await fn());
    } catch (error) {
        console.error('AI section read failed:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
