import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Prisma client so the template engine can be exercised in isolation
// (no DB, no sharp/encryption side-effects pulled in via cronRunner).
const findManyMock = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    blog: { findMany: (...args) => findManyMock(...args) },
    project: { findMany: vi.fn(async () => []) },
    gallery: { findMany: vi.fn(async () => []) },
    social: { findMany: vi.fn(async () => []) },
    contactMessage: { findMany: vi.fn(async () => []) },
    deployment: { findMany: vi.fn(async () => []) },
    cron: { findMany: vi.fn(async () => []) },
  },
}));

import {
  compileTemplate,
  clearTemplateCache,
  PREVIEW_ROW_LIMIT,
} from './cronTemplate';

function makeBlogs(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `id-${i}`,
    title: `Blog ${i}`,
    content: 'x'.repeat(1000),
  }));
}

describe('cronTemplate bounded data loading', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    findManyMock.mockResolvedValue(makeBlogs(50));
    clearTemplateCache();
  });

  it('caps collection queries with a `take` row limit', async () => {
    await compileTemplate('$blogs', {}, { rowLimit: 5, useCache: false });
    expect(findManyMock).toHaveBeenCalledTimes(1);
    const arg = findManyMock.mock.calls[0][0] || {};
    expect(arg.take).toBe(5);
  });

  it('defaults preview to a small sample limit', async () => {
    await compileTemplate('$blogs', {}, { rowLimit: PREVIEW_ROW_LIMIT, useCache: false });
    const arg = findManyMock.mock.calls[0][0] || {};
    expect(arg.take).toBe(PREVIEW_ROW_LIMIT);
    expect(PREVIEW_ROW_LIMIT).toBeLessThanOrEqual(25);
  });

  it('reuses the cross-request cache so repeated previews do not re-query', async () => {
    await compileTemplate('$blogs', {}, { rowLimit: 5, useCache: true });
    await compileTemplate('$blogs', {}, { rowLimit: 5, useCache: true });
    expect(findManyMock).toHaveBeenCalledTimes(1);
  });

  it('does not use the stale cache when useCache is false (execution path)', async () => {
    await compileTemplate('$blogs', {}, { rowLimit: 5, useCache: false });
    await compileTemplate('$blogs', {}, { rowLimit: 5, useCache: false });
    expect(findManyMock).toHaveBeenCalledTimes(2);
  });
});

describe('cronTemplate demand-driven fetching', () => {
  const lastArgs = () => findManyMock.mock.calls[findManyMock.mock.calls.length - 1][0] || {};

  beforeEach(() => {
    findManyMock.mockReset();
    findManyMock.mockResolvedValue(makeBlogs(50));
    clearTemplateCache();
  });

  it('shrinks `take` to the referenced row index', async () => {
    await compileTemplate('$blogs.0.title', {}, { rowLimit: 500, useCache: false });
    expect(lastArgs().take).toBe(1);

    findManyMock.mockClear();
    await compileTemplate('$blogs.2.title', {}, { rowLimit: 500, useCache: false });
    expect(lastArgs().take).toBe(3);
  });

  it('projects a `select` down to the referenced columns', async () => {
    await compileTemplate('$blogs.0.title', {}, { rowLimit: 500, useCache: false });
    expect(lastArgs().select).toEqual({ id: true, title: true });
  });

  it('loads all columns for a whole-row reference', async () => {
    await compileTemplate('$blogs.0', {}, { rowLimit: 500, useCache: false });
    expect(lastArgs().take).toBe(1);
    expect(lastArgs().select).toBeUndefined();
  });

  it('falls back to all columns for an unknown field', async () => {
    await compileTemplate('$blogs.0.nope', {}, { rowLimit: 500, useCache: false });
    expect(lastArgs().select).toBeUndefined();
  });

  it('needs the whole collection for a non-indexed path like .length', async () => {
    await compileTemplate('$blogs.length', {}, { rowLimit: 7, useCache: false });
    expect(lastArgs().take).toBe(7);
    expect(lastArgs().select).toBeUndefined();
  });

  it('upgrades to the union of columns across mixed references', async () => {
    await compileTemplate('a=$blogs.0.title b=$blogs.1.slug', {}, { rowLimit: 500, useCache: false });
    expect(lastArgs().take).toBe(2);
    expect(lastArgs().select).toEqual({ id: true, title: true, slug: true });
  });
});
