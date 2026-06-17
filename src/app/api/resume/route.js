import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { renderResumePdf } from '@/lib/resume/render';
import cache, { CACHE_TTL } from '@/lib/cache';

// @react-pdf/renderer needs the Node runtime (fontkit/yoga), not Edge.
export const runtime = 'nodejs';

/**
 * Public resume endpoint. Three modes, decided by config.resume.type and an
 * optional ?profile=<id> override:
 *   - generated : render the active (or requested) profile to PDF via the
 *                 Resume Tailoring Hub. `?profile=` forces generated mode.
 *   - file      : legacy base64 data-URI PDF stored in config.resume.value.
 *   - url       : never reaches here (the link points straight at the URL).
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedProfile = searchParams.get('profile');

        const config = await getSingleton(prisma, 'config');
        const resume = config?.resume;

        const useGenerated = Boolean(requestedProfile) || resume?.type === 'generated';

        if (useGenerated) {
            const profileId = requestedProfile || resume?.value?.profileId || '';
            // Cache the rendered buffer; admin saves bust the `db:resume` prefix.
            const cacheKey = `db:resume:pdf:${profileId || 'active'}`;
            const { buffer, filename } = await cache.getOrSet(
                cacheKey,
                async () => {
                    const builder = await getSingleton(prisma, 'resumeBuilder');
                    // renderResumePdf tolerates a null builder (falls back to the
                    // seeded default), so generated mode always yields a PDF.
                    return renderResumePdf(builder, profileId);
                },
                CACHE_TTL.MEDIUM
            );

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="${filename}"`,
                    'Cache-Control': 'public, max-age=300, must-revalidate',
                },
            });
        }

        // Legacy uploaded-file mode: config.resume.value is a Data URI.
        if (!resume || resume.type !== 'file' || !resume.value) {
            return new NextResponse('Resume not found', { status: 404 });
        }

        const parts = resume.value.split(',');
        if (parts.length !== 2) {
            return new NextResponse('Invalid resume data', { status: 500 });
        }

        const mimeMatch = parts[0].match(/:(.*?);/);
        const contentType = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const buffer = Buffer.from(parts[1], 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${resume.filename || 'resume'}"`,
            },
        });
    } catch (error) {
        console.error('Error serving resume:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
