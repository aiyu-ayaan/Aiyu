// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  createDefaultResumeData,
  normalizeResumeData,
  normalizeLatex,
  createLatexDocument,
  duplicateLatexDocument,
  resumeFilename,
} from './schema';
import { buildDefaultTemplate } from './defaultTemplate';

describe('createDefaultResumeData', () => {
  it('seeds a schema and a single live LaTeX document', () => {
    const d = createDefaultResumeData();
    expect(d.schema.basics.name).toBe('Ayaan Ansari');
    expect(d.latex.documents).toHaveLength(1);
    expect(d.latex.documents[0].id).toBe('doc-default');
    expect(d.latex.liveDocumentId).toBe('doc-default');
    expect(d.latex.documents[0].files[0].name).toBe('main.tex');
    expect(d.latex.documents[0].files[0].content).toContain('\\documentclass');
    expect(d.latex.documents[0].pdf).toBeNull();
  });
});

describe('buildDefaultTemplate', () => {
  it('renders a compilable-looking document with the Insert macros + content', () => {
    const tex = buildDefaultTemplate(createDefaultResumeData().schema);
    expect(tex).toContain('\\newcommand{\\resumeExperience}');
    expect(tex).toContain('\\newcommand{\\resumeProject}');
    expect(tex).toContain('\\begin{document}');
    expect(tex).toContain('\\end{document}');
    expect(tex).toContain('Ayaan Ansari');
    expect(tex).toContain('ExpenseSync');
  });
  it('tolerates an empty schema', () => {
    const tex = buildDefaultTemplate({});
    expect(tex).toContain('\\begin{document}');
    expect(tex).toContain('\\end{document}');
  });
});

describe('normalizeResumeData (migration)', () => {
  it('adds a latex block when missing (legacy profiles blob)', () => {
    const legacy = { schema: { basics: { name: 'X' } }, profiles: [{ id: 'p1' }], defaultProfileId: 'p1' };
    const out = normalizeResumeData(legacy);
    expect(out.profiles).toBeUndefined();
    expect(out.latex.documents.length).toBeGreaterThanOrEqual(1);
    expect(out.latex.documents.some((d) => d.id === out.latex.liveDocumentId)).toBe(true);
  });
  it('preserves valid documents and repairs a dangling liveDocumentId', () => {
    const input = {
      schema: {},
      latex: {
        documents: [{ id: 'a', name: 'A', files: [{ name: 'main.tex', content: 'x' }], entry: 'main.tex' }],
        liveDocumentId: 'missing',
      },
    };
    const out = normalizeResumeData(input);
    expect(out.latex.documents[0].id).toBe('a');
    expect(out.latex.liveDocumentId).toBe('a');
  });
  it('keeps a stored pdf only when it has string data', () => {
    const withPdf = normalizeLatex({ documents: [{ id: 'a', files: [{ name: 'main.tex', content: 'x' }], pdf: { data: 'AAAA', filename: 'r.pdf' } }] }, {});
    expect(withPdf.documents[0].pdf.data).toBe('AAAA');
    const badPdf = normalizeLatex({ documents: [{ id: 'a', files: [{ name: 'main.tex', content: 'x' }], pdf: { data: 123 } }] }, {});
    expect(badPdf.documents[0].pdf).toBeNull();
  });
  it('returns the seeded default for non-object input', () => {
    expect(normalizeResumeData(null).latex.documents).toHaveLength(1);
  });
});

describe('document helpers', () => {
  it('duplicate clears the pdf and names it Copy of X', () => {
    const doc = createLatexDocument('AI Engineer', {});
    doc.pdf = { data: 'AAAA', filename: 'x.pdf', compiledAt: 'now' };
    const dup = duplicateLatexDocument(doc);
    expect(dup.name).toBe('Copy of AI Engineer');
    expect(dup.id).not.toBe(doc.id);
    expect(dup.pdf).toBeNull();
    expect(dup.files[0].content).toBe(doc.files[0].content);
  });
  it('resumeFilename slugifies', () => {
    expect(resumeFilename('Ayaan Ansari — AI Engineer')).toBe('Ayaan-Ansari-AI-Engineer.pdf');
    expect(resumeFilename('')).toBe('resume.pdf');
  });
});
