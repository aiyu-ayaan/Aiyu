// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validatePublishPdf, MAX_PDF_BYTES } from './publish';

const pdfB64 = () => Buffer.from('%PDF-1.5\n...rest...').toString('base64');

describe('validatePublishPdf', () => {
  it('accepts a valid base64 PDF', () => {
    const r = validatePublishPdf(pdfB64());
    expect(r.ok).toBe(true);
    expect(r.bytes).toBeGreaterThan(0);
  });
  it('strips a data: URI prefix', () => {
    const r = validatePublishPdf(`data:application/pdf;base64,${pdfB64()}`);
    expect(r.ok).toBe(true);
  });
  it('rejects a non-PDF payload', () => {
    const r = validatePublishPdf(Buffer.from('not a pdf').toString('base64'));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not a PDF/i);
  });
  it('rejects empty / missing input', () => {
    expect(validatePublishPdf('').ok).toBe(false);
    expect(validatePublishPdf(null).ok).toBe(false);
    expect(validatePublishPdf(Buffer.from('').toString('base64')).ok).toBe(false);
  });
  it('rejects oversize PDFs', () => {
    const big = `%PDF-${'a'.repeat(MAX_PDF_BYTES)}`;
    const r = validatePublishPdf(Buffer.from(big).toString('base64'));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/size limit/i);
  });
});
