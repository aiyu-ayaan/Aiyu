import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { compileTemplate, compileTemplateObject } from '@/utils/cronRunner';

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
            ? await compileTemplateObject(template, cachedData)
            : await compileTemplate(template || '', cachedData);

        return NextResponse.json({
            success: true,
            data: typeof compiled === 'object' ? JSON.stringify(compiled, null, 2) : String(compiled)
        });
    } catch (error) {
        console.error('[API CRON PREVIEW ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const POST = withAuth(previewTemplate);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
