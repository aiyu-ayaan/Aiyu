import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  extractCanonical,
  extractRobotsMeta,
  evaluateResponse,
  parseSitemapUrls,
  summarizeCrawl,
  crawlUrl,
  runPool,
} from './seoCrawl';

describe('normalizeUrl', () => {
  it('drops query and trailing slash, keeps origin+path', () => {
    expect(normalizeUrl('https://x.com/a/b/?q=1')).toBe('https://x.com/a/b');
  });
  it('normalizes the root to bare origin', () => {
    expect(normalizeUrl('https://x.com/')).toBe('https://x.com');
  });
});

describe('extractCanonical / extractRobotsMeta', () => {
  it('extracts canonical href (single or double quotes)', () => {
    expect(extractCanonical('<link rel="canonical" href="https://x.com/a">')).toBe('https://x.com/a');
    expect(extractCanonical("<link rel='canonical' href='https://x.com/b'>")).toBe('https://x.com/b');
  });
  it('returns empty string when absent', () => {
    expect(extractCanonical('<html></html>')).toBe('');
    expect(extractRobotsMeta('<html></html>')).toBe('');
  });
  it('extracts robots meta content', () => {
    expect(extractRobotsMeta('<meta name="robots" content="noindex, follow">')).toBe('noindex, follow');
  });
});

describe('evaluateResponse', () => {
  it('flags redirects', () => {
    const { issues } = evaluateResponse('https://x.com/a', { status: 301, location: 'https://x.com/b' });
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toMatch(/Redirects/);
  });
  it('flags non-200 status', () => {
    const { issues } = evaluateResponse('https://x.com/a', { status: 404 });
    expect(issues[0].message).toMatch(/Status 404/);
  });
  it('passes a clean self-canonical 200 page', () => {
    const html = '<link rel="canonical" href="https://x.com/a"><meta name="robots" content="index, follow">';
    const { issues } = evaluateResponse('https://x.com/a', { status: 200, html, ms: 100 });
    expect(issues).toEqual([]);
  });
  it('warns on a canonical mismatch', () => {
    const html = '<link rel="canonical" href="https://x.com/other">';
    const { issues } = evaluateResponse('https://x.com/a', { status: 200, html, ms: 100 });
    expect(issues.some((i) => i.message.includes('Canonical'))).toBe(true);
  });
  it('errors on noindex', () => {
    const html = '<meta name="robots" content="noindex">';
    const { issues } = evaluateResponse('https://x.com/a', { status: 200, html, ms: 100 });
    expect(issues.some((i) => i.severity === 'error' && /noindex/.test(i.message))).toBe(true);
  });
  it('warns on slow TTFB', () => {
    const { issues } = evaluateResponse('https://x.com/a', { status: 200, html: '', ms: 5000, slowMs: 1500 });
    expect(issues.some((i) => i.message.includes('Slow'))).toBe(true);
  });
});

describe('parseSitemapUrls', () => {
  it('extracts <loc> entries', () => {
    const xml = '<url><loc>https://x.com/a</loc></url><url><loc>https://x.com/b</loc></url>';
    expect(parseSitemapUrls(xml)).toEqual(['https://x.com/a', 'https://x.com/b']);
  });
});

describe('summarizeCrawl', () => {
  it('aggregates counts and average TTFB', () => {
    const results = [
      { ms: 100, issues: [] },
      { ms: 300, issues: [{ severity: 'warning' }] },
      { ms: 200, issues: [{ severity: 'error' }] },
    ];
    expect(summarizeCrawl(results)).toEqual({ total: 3, ok: 1, errors: 1, warnings: 1, avgMs: 200 });
  });
});

describe('crawlUrl (injected fetch)', () => {
  it('returns ERR status when fetch throws', async () => {
    const fetchImpl = async () => { throw new Error('boom'); };
    const r = await crawlUrl('https://x.com/a', { fetchImpl });
    expect(r.status).toBe('ERR');
    expect(r.issues[0].message).toMatch(/boom/);
  });
  it('reads and evaluates a 200 response body', async () => {
    const fetchImpl = async () => ({
      status: 200,
      headers: { get: () => null },
      text: async () => '<meta name="robots" content="noindex">',
    });
    const r = await crawlUrl('https://x.com/a', { fetchImpl });
    expect(r.status).toBe(200);
    expect(r.issues.some((i) => /noindex/.test(i.message))).toBe(true);
  });
});

describe('runPool', () => {
  it('processes every item with bounded concurrency', async () => {
    const items = [1, 2, 3, 4, 5];
    const out = await runPool(items, async (n) => n * 2, 2);
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });
});
