import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import cache from '@/lib/cache';
import { normalizeResumeData, resumeFilename } from '@/lib/resume/schema';
import { validatePublishPdf } from '@/lib/resume/publish';

export const runtime = 'nodejs';

/**
 * Publish a compiled LaTeX document to the live site.
 *
 * The browser compiles the `.tex` (the server can't) and POSTs the resulting
 * PDF here. With `pdfBase64` we validate + store it on the document; without it
 * we just promote an already-published document. Either way the document becomes
 * `liveDocumentId` and `config.resume` is pointed at it.
 *
 * Body: { documentId: string, pdfBase64?: string, filename?: string }
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { documentId, pdfBase64, filename } = await request.json();
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    const builder = normalizeResumeData(await getSingleton(prisma, 'resumeBuilder'));
    const doc = builder.latex.documents.find((d) => d.id === documentId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (pdfBase64 != null) {
      const check = validatePublishPdf(pdfBase64);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      doc.pdf = {
        data: check.base64,
        filename: resumeFilename(filename || doc.name),
        compiledAt: new Date().toISOString(),
      };
    }

    // Going live requires a stored PDF (just-uploaded or previously published).
    if (!doc.pdf || !doc.pdf.data) {
      return NextResponse.json({ error: 'Compile and publish this document before setting it live' }, { status: 409 });
    }

    builder.latex.liveDocumentId = documentId;
    await upsertSingleton(prisma, 'resumeBuilder', builder);
    await upsertSingleton(prisma, 'config', { resume: { type: 'latex', value: { documentId } } });
    await cache.invalidatePrefixAsync('db:resume');
    await cache.invalidatePrefixAsync('db:config');

    return NextResponse.json({ ok: true, liveDocumentId: documentId, filename: doc.pdf.filename });
  } catch (error) {
    console.error('Resume publish error:', error);
    return NextResponse.json({ error: 'Failed to publish resume' }, { status: 500 });
  }
}
