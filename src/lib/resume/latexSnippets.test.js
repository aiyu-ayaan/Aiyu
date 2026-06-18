// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  escapeLatex,
  dateRange,
  normalizeBullets,
  stackToString,
  experienceSnippet,
  projectSnippet,
} from './latexSnippets';

describe('escapeLatex', () => {
  it('escapes LaTeX special characters', () => {
    expect(escapeLatex('a & b 50% #1 $x_y')).toBe('a \\& b 50\\% \\#1 \\$x\\_y');
  });
  it('escapes backslashes and braces without double-escaping', () => {
    expect(escapeLatex('{x}')).toBe('\\{x\\}');
    expect(escapeLatex('a\\b')).toBe('a\\textbackslash{}b');
  });
  it('coerces null/undefined to empty', () => {
    expect(escapeLatex(null)).toBe('');
    expect(escapeLatex(undefined)).toBe('');
  });
});

describe('helpers', () => {
  it('dateRange joins both sides or tolerates one', () => {
    expect(dateRange('Jan 2024', 'Present')).toBe('Jan 2024 -- Present');
    expect(dateRange('', 'Present')).toBe('Present');
    expect(dateRange('Jan 2024', '')).toBe('Jan 2024');
    expect(dateRange('', '')).toBe('');
  });
  it('normalizeBullets accepts arrays, bullet objects, and strings', () => {
    expect(normalizeBullets(['a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeBullets([{ text: 'a' }, { text: '' }, { text: 'c' }])).toEqual(['a', 'c']);
    expect(normalizeBullets('solo')).toEqual(['solo']);
    expect(normalizeBullets(null)).toEqual([]);
  });
  it('stackToString joins arrays or passes strings', () => {
    expect(stackToString(['Kotlin', 'Compose'])).toBe('Kotlin, Compose');
    expect(stackToString('C#, Azure')).toBe('C#, Azure');
  });
});

describe('experienceSnippet', () => {
  it('builds a macro + bullet list from a Hub-shaped record', () => {
    const out = experienceSnippet({
      role: 'Software Engineer',
      company: 'Adrosonic',
      location: 'Mumbai',
      start: 'Jun 2025',
      end: 'Present',
      bullets: [{ text: 'Built things' }],
    });
    expect(out).toContain('\\resumeExperience{Software Engineer}{Jun 2025 -- Present}{Adrosonic}{Mumbai}');
    expect(out).toContain('\\resumeItemListStart');
    expect(out).toContain('\\resumeItem{Built things}');
    expect(out).toContain('\\resumeItemListEnd');
  });
  it('tolerates About-shaped records (title/organisation/duration)', () => {
    const out = experienceSnippet({ title: 'Dev', organisation: 'Co', duration: '2020-2021' });
    expect(out).toContain('\\resumeExperience{Dev}{2020-2021}{Co}{}');
  });
  it('omits the list when there are no bullets', () => {
    const out = experienceSnippet({ role: 'Dev', company: 'Co' });
    expect(out).not.toContain('resumeItemListStart');
  });
});

describe('projectSnippet', () => {
  it('builds from a Hub-shaped project with bullets', () => {
    const out = projectSnippet({
      name: 'ExpenseSync',
      stack: 'Kotlin, Compose',
      link: 'github.com/x',
      bullets: [{ text: 'Cut sync 75%' }],
    });
    expect(out).toContain('\\resumeProject{ExpenseSync}{Kotlin, Compose}{github.com/x}');
    expect(out).toContain('\\resumeItem{Cut sync 75\\%}');
  });
  it('handles a site Project record (techStack array + description + codeLink)', () => {
    const out = projectSnippet({
      name: 'BetweenUs-Server',
      techStack: ['Kotlin', 'Ktor'],
      description: 'Backend powering chat.',
      codeLink: 'https://github.com/x',
    });
    expect(out).toContain('\\resumeProject{BetweenUs-Server}{Kotlin, Ktor}{https://github.com/x}');
    expect(out).toContain('\\resumeItem{Backend powering chat.}');
  });
  it('handles a Deployment record (hostedUrl) and empty stack/link', () => {
    expect(projectSnippet({ name: 'App', hostedUrl: 'https://app' })).toContain('\\resumeProject{App}{}{https://app}');
    expect(projectSnippet({ name: 'Bare' })).toContain('\\resumeProject{Bare}{}{}');
  });
});
