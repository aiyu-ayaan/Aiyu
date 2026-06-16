import { describe, it, expect } from 'vitest';
import {
  classifyDevice,
  isBotUA,
  normalizeReferrer,
  classifyReferrer,
  dayKey,
  visitorHash,
} from './analytics.js';

describe('classifyDevice', () => {
  it('detects bots', () => {
    expect(classifyDevice('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe('bot');
    expect(classifyDevice('python-requests/2.31')).toBe('bot');
  });
  it('detects mobile and tablet', () => {
    expect(classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile')).toBe('mobile');
    expect(classifyDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
  });
  it('defaults to desktop', () => {
    expect(classifyDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(classifyDevice('')).toBe('desktop');
  });
});

describe('isBotUA', () => {
  it('flags crawlers', () => {
    expect(isBotUA('facebookexternalhit/1.1')).toBe(true);
    expect(isBotUA('Mozilla/5.0 (Windows NT 10.0)')).toBe(false);
  });
});

describe('normalizeReferrer', () => {
  it('reduces to bare host and strips www + path/query', () => {
    expect(normalizeReferrer('https://www.Google.com/search?q=foo')).toBe('google.com');
    expect(normalizeReferrer('https://news.ycombinator.com/item?id=1')).toBe('news.ycombinator.com');
  });
  it('returns empty for invalid/empty', () => {
    expect(normalizeReferrer('')).toBe('');
    expect(normalizeReferrer('not a url')).toBe('');
  });
});

describe('classifyReferrer', () => {
  it('classifies direct, internal, search, social, external', () => {
    expect(classifyReferrer('', 'aiyu.dev')).toBe('direct');
    expect(classifyReferrer('aiyu.dev', 'aiyu.dev')).toBe('internal');
    expect(classifyReferrer('aiyu.dev', 'www.aiyu.dev')).toBe('internal');
    expect(classifyReferrer('google.com', 'aiyu.dev')).toBe('search');
    expect(classifyReferrer('t.co', 'aiyu.dev')).toBe('social');
    expect(classifyReferrer('linkedin.com', 'aiyu.dev')).toBe('social');
    expect(classifyReferrer('example.com', 'aiyu.dev')).toBe('external');
  });
});

describe('dayKey', () => {
  it('produces a UTC YYYY-MM-DD bucket', () => {
    expect(dayKey(new Date('2026-06-16T23:59:59.000Z'))).toBe('2026-06-16');
  });
});

describe('visitorHash', () => {
  it('is stable for the same inputs and rotates by day', () => {
    const a = visitorHash('1.2.3.4', 'UA', '2026-06-16');
    const b = visitorHash('1.2.3.4', 'UA', '2026-06-16');
    const c = visitorHash('1.2.3.4', 'UA', '2026-06-17');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{32}$/);
  });
  it('differs by IP', () => {
    expect(visitorHash('1.1.1.1', 'UA', '2026-06-16'))
      .not.toBe(visitorHash('2.2.2.2', 'UA', '2026-06-16'));
  });
});
