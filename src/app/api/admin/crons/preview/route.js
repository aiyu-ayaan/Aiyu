import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { compileTemplate, compileTemplateObject, PREVIEW_ROW_LIMIT } from '@/utils/cronTemplate';

// Cap the serialized preview so a placeholder resolving to a large structure
// can't build a multi-MB string in the response (extra memory + slow UI).
const MAX_PREVIEW_CHARS = 50_000;

// Preview only needs a representative sample, and the debounced keystrokes
// hammer this endpoint — so sample a few rows and reuse the cross-request cache.
const PREVIEW_OPTS = { rowLimit: PREVIEW_ROW_LIMIT, useCache: true };

function truncate(str) {
    if (str.length <= MAX_PREVIEW_CHARS) return str;
    return `${str.slice(0, MAX_PREVIEW_CHARS)}\n\n…[preview truncated — output exceeds ${MAX_PREVIEW_CHARS.toLocaleString()} chars; full data is resolved at run time]`;
}

// POST: Safely evaluate and preview dynamic templates (Admin only)
async function previewTemplate(request) {
    try {
        const body = await request.json();
        const { template } = body;

        const cachedData = {
            env: new Proxy({}, {
                get(target, prop) {
                    if (typeof prop === 'string') {
                        return `[SECRET: ${prop}]`;
                    }
                    return undefined;
                }
            })
        };

        const compiled = typeof template === 'object'
            ? await compileTemplateObject(template, cachedData, PREVIEW_OPTS)
            : await compileTemplate(template || '', cachedData, PREVIEW_OPTS);

        const serialized = typeof compiled === 'object'
            ? JSON.stringify(compiled, null, 2)
            : String(compiled);

        return NextResponse.json({
            success: true,
            data: truncate(serialized)
        });
    } catch (error) {
        console.error('[API CRON PREVIEW ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const POST = withAuth(previewTemplate);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
