// @vitest-environment node
//
// react-pdf renders against Node streams/buffers, so this smoke test runs in the
// node environment (not jsdom). It proves the lib wiring end-to-end: seed data ->
// resolveProfile -> @react-pdf/renderer -> a real PDF Buffer.
import { describe, it, expect } from 'vitest';
import { renderResumePdf } from './render.js';
import { createDefaultResumeData } from './schema.js';

describe('renderResumePdf', () => {
  it('produces a non-empty PDF buffer for the seeded default profile', async () => {
    const { buffer, filename } = await renderResumePdf(createDefaultResumeData(), 'profile-default');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    // PDF magic number
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(filename).toBe('Ayaan-Ansari-Default.pdf');
  }, 20000);
});
