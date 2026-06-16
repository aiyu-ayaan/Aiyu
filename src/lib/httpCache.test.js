import { describe, it, expect } from 'vitest';
import { createPublicCacheHeaders, RESPONSE_CACHE } from './httpCache';

describe('createPublicCacheHeaders', () => {
  it('defaults to the PUBLIC_SHORT policy across all three headers', () => {
    const headers = createPublicCacheHeaders();
    expect(headers['Cache-Control']).toBe(RESPONSE_CACHE.PUBLIC_SHORT);
    expect(headers['CDN-Cache-Control']).toBe(RESPONSE_CACHE.PUBLIC_SHORT);
    expect(headers['Vercel-CDN-Cache-Control']).toBe(RESPONSE_CACHE.PUBLIC_SHORT);
  });
  it('uses the provided cache-control value', () => {
    const headers = createPublicCacheHeaders(RESPONSE_CACHE.NO_STORE);
    expect(headers['Cache-Control']).toBe(RESPONSE_CACHE.NO_STORE);
    expect(headers['Vercel-CDN-Cache-Control']).toBe(RESPONSE_CACHE.NO_STORE);
  });
});
