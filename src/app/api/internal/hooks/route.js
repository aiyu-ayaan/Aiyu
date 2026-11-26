/**
 * Side effects of the writes that now run in the Rust server (server/src/write.rs). Content readers still served
 * by Next (MCP, sitemap.xml, SEO tools) cache in this process, and auto-indexing pings need `after()` and the
 * Google service account. Rust calls this after each write. It goes away with Next.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import cache from '@/lib/cache';
import { autoPing } from '@/lib/autoIndexing';

function authorized(request) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;
    const expected = Buffer.from(createHmac('sha256', secret).update('internal:hooks').digest('hex'));
    const given = Buffer.from(request.headers.get('x-aiyu-internal') || '');
    return given.length === expected.length && timingSafeEqual(given, expected);
}

const strings = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []);

export async function POST(request) {
    if (!authorized(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json();
    for (const prefix of strings(body.prefixes)) await cache.invalidatePrefixAsync(prefix);
    for (const key of strings(body.keys)) await cache.invalidateAsync(key);
    for (const path of strings(body.revalidate)) revalidatePath(path);
    for (const ping of Array.isArray(body.pings) ? body.pings : []) autoPing(strings(ping?.paths), ping?.type);
    return new NextResponse(null, { status: 204 });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
