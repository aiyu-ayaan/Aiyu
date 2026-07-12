import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upsertSingleton } from '@/lib/serialize';
import { withAuth } from '@/middleware/auth';
import cache from '@/lib/cache';

/**
 * Publish a compiled resume PDF to the public site: stores it in the Config
 * singleton's `resume` slot (the same shape the settings uploader writes),
 * so the existing public /api/resume route serves it immediately.
 */
const MAX_PDF_BYTES = 8 * 1024 * 1024;

async function publish(request) {
    try {
        const { pdfBase64, filename } = await request.json();

        if (!pdfBase64 || typeof pdfBase64 !== 'string') {
            return NextResponse.json({ success: false, error: 'No PDF provided — compile first.' }, { status: 400 });
        }

        const pdf = Buffer.from(pdfBase64, 'base64');
        if (pdf.length === 0 || pdf.length > MAX_PDF_BYTES) {
            return NextResponse.json({ success: false, error: 'Invalid PDF size (8MB max)' }, { status: 413 });
        }
        if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') {
            return NextResponse.json({ success: false, error: 'Payload is not a PDF' }, { status: 400 });
        }

        const publishedAt = new Date().toISOString();
        await upsertSingleton(prisma, 'config', {
            resume: {
                type: 'file',
                value: `data:application/pdf;base64,${pdfBase64}`,
                filename: String(filename || 'resume.pdf').slice(0, 120),
            },
        });
        await upsertSingleton(prisma, 'resumeStudio', { lastPublishedAt: publishedAt });
        await cache.invalidatePrefixAsync('db:config');

        return NextResponse.json({ success: true, data: { publishedAt } });
    } catch (error) {
        console.error('[Resume Publish] failed:', error);
        return NextResponse.json({ success: false, error: 'Failed to publish resume' }, { status: 500 });
    }
}

export const POST = withAuth(publish);
export const runtime = 'nodejs';
