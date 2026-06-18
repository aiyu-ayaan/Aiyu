/**
 * Resume Hub — publish validation.
 *
 * The server never compiles LaTeX; the admin's browser uploads an already-
 * compiled PDF. This pure helper guards that trust boundary: it confirms the
 * payload decodes, is non-empty, within a size cap, and begins with the PDF
 * magic bytes before anything is persisted.
 */

export const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * @returns {{ ok: true, base64: string, bytes: number }
 *          | { ok: false, error: string }}
 */
export function validatePublishPdf(pdfBase64, max = MAX_PDF_BYTES) {
  if (typeof pdfBase64 !== 'string' || !pdfBase64.trim()) {
    return { ok: false, error: 'pdfBase64 is required' };
  }
  // Tolerate a `data:application/pdf;base64,...` prefix.
  const base64 = pdfBase64.includes(',') ? pdfBase64.slice(pdfBase64.indexOf(',') + 1) : pdfBase64;

  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return { ok: false, error: 'pdfBase64 is not valid base64' };
  }

  if (buffer.length === 0) return { ok: false, error: 'PDF is empty' };
  if (buffer.length > max) return { ok: false, error: 'PDF exceeds the size limit' };
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return { ok: false, error: 'payload is not a PDF' };
  }

  return { ok: true, base64, bytes: buffer.length };
}
