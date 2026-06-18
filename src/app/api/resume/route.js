import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { normalizeResumeData } from '@/lib/resume/schema';

export const runtime = 'nodejs';

/**
 * Public resume endpoint. Modes decided by config.resume.type, with an optional
 * ?doc=<id> override:
 *   - latex : serve the live (or requested) LaTeX document's published PDF,
 *             compiled in the admin browser via the Resume Hub. `?doc=` forces it.
 *   - file  : legacy base64 data-URI PDF stored in config.resume.value.
 *   - url   : never reaches here (the link points straight at the URL).
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        // `profile` kept as a back-compat alias for the old generated mode.
        const requestedDoc = searchParams.get('doc') || searchParams.get('profile');

        const config = await getSingleton(prisma, 'config');
        const resume = config?.resume;

        const useLatex = Boolean(requestedDoc) || resume?.type === 'latex';

        if (useLatex) {
            const builder = normalizeResumeData(await getSingleton(prisma, 'resumeBuilder'));
            const liveId = builder.latex.liveDocumentId;
            const wantedId = requestedDoc || resume?.value?.documentId || liveId;
            const doc =
                builder.latex.documents.find((d) => d.id === wantedId) ||
                builder.latex.documents.find((d) => d.id === liveId);

            if (!doc || !doc.pdf || !doc.pdf.data) {
                return new NextResponse('Resume not published yet', { status: 404 });
            }

            const buffer = Buffer.from(doc.pdf.data, 'base64');
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="${doc.pdf.filename || 'resume.pdf'}"`,
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
