import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  truncateDescription,
  generateMetadataObject,
  generatePageMetadata,
} from './seoHelper';

describe('generateSlug', () => {
  it('lowercases, strips punctuation and collapses spaces', () => {
    expect(generateSlug('  Hello,  World!  ')).toBe('hello-world');
  });
  it('collapses repeated hyphens', () => {
    expect(generateSlug('a -- b')).toBe('a-b');
  });
  it('returns empty string for falsy input', () => {
    expect(generateSlug('')).toBe('');
  });
});

describe('truncateDescription', () => {
  it('returns text unchanged when under the limit', () => {
    expect(truncateDescription('short', 160)).toBe('short');
  });
  it('truncates and appends ellipsis', () => {
    const long = 'a'.repeat(200);
    const out = truncateDescription(long, 10);
    expect(out.endsWith('...')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(13);
  });
  it('returns empty string for falsy input', () => {
    expect(truncateDescription(undefined)).toBe('');
  });
});

describe('generateMetadataObject', () => {
  it('joins keyword arrays and falls back og fields to base', () => {
    const meta = generateMetadataObject({
      title: 'T',
      description: 'D',
      keywords: ['a', 'b'],
    });
    expect(meta.keywords).toBe('a, b');
    expect(meta.openGraph.title).toBe('T');
    expect(meta.twitter.card).toBe('summary_large_image');
  });
});

describe('generatePageMetadata', () => {
  it('builds a titled, canonical metadata object', () => {
    const meta = generatePageMetadata(
      { title: 'Projects', description: 'My work', path: '/projects' },
      { siteTitle: 'Aiyu' }
    );
    expect(meta.title).toBe('Projects | Aiyu');
    expect(meta.alternates.canonical).toMatch(/\/projects$/);
  });
});
