import { describe, it, expect } from 'vitest';
import { mergeSeoConfig, applySitemapOverrides, DEFAULT_SEO_CONFIG } from './seoConfig';

describe('mergeSeoConfig', () => {
  it('returns full defaults for empty input', () => {
    const merged = mergeSeoConfig({});
    expect(merged.robots.rules).toEqual(DEFAULT_SEO_CONFIG.robots.rules);
    expect(merged.sitemap.extraUrls).toEqual([]);
    expect(merged.indexing.enabled).toBe(false);
  });
  it('keeps stored robots rules when provided', () => {
    const custom = [{ userAgent: '*', allow: ['/'], disallow: ['/secret'], crawlDelay: 2 }];
    expect(mergeSeoConfig({ robots: { rules: custom } }).robots.rules).toEqual(custom);
  });
  it('falls back to default rules when stored rules are empty', () => {
    expect(mergeSeoConfig({ robots: { rules: [] } }).robots.rules).toEqual(DEFAULT_SEO_CONFIG.robots.rules);
  });
  it('coerces malformed sections to safe shapes', () => {
    const merged = mergeSeoConfig({ sitemap: { extraUrls: 'nope', excludePaths: null } });
    expect(merged.sitemap.extraUrls).toEqual([]);
    expect(merged.sitemap.excludePaths).toEqual([]);
  });
});

describe('applySitemapOverrides', () => {
  const base = 'https://x.com';
  const routes = [
    { url: 'https://x.com', priority: 1 },
    { url: 'https://x.com/blogs/a', priority: 0.7 },
    { url: 'https://x.com/blogs/b', priority: 0.7 },
  ];

  it('drops routes matching excludePaths (by path)', () => {
    const out = applySitemapOverrides(routes, { excludePaths: ['/blogs/a'] }, base);
    expect(out.map((r) => r.url)).not.toContain('https://x.com/blogs/a');
    expect(out).toHaveLength(2);
  });
  it('drops routes matching excludePaths (by full url)', () => {
    const out = applySitemapOverrides(routes, { excludePaths: ['https://x.com/blogs/b/'] }, base);
    expect(out.map((r) => r.url)).not.toContain('https://x.com/blogs/b');
  });
  it('appends extraUrls with defaults', () => {
    const out = applySitemapOverrides(routes, { extraUrls: [{ url: '/extra' }] }, base);
    const added = out.find((r) => r.url === 'https://x.com/extra');
    expect(added).toBeTruthy();
    expect(added.changeFrequency).toBe('monthly');
    expect(added.priority).toBe(0.5);
  });
  it('dedupes extraUrls already present and excluded ones', () => {
    const out = applySitemapOverrides(routes, {
      extraUrls: [{ url: '/blogs/a' }, { url: '/dropme' }],
      excludePaths: ['/dropme'],
    }, base);
    expect(out.filter((r) => r.url === 'https://x.com/blogs/a')).toHaveLength(1);
    expect(out.map((r) => r.url)).not.toContain('https://x.com/dropme');
  });
});
