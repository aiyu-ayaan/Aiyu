import { describe, it, expect } from 'vitest';
import {
  getBlogIssues,
  getProjectIssues,
  getDeploymentIssues,
  getStaticConfigIssues,
  summarizeAudit,
} from './seoAudit';

const goodBlog = {
  slug: 'intro-to-react-19',
  seoDescription: 'A practical, hands-on walkthrough of the new React 19 features and how to adopt them.',
  image: '/cover.png',
  imageAlt: 'React 19 logo',
  published: true,
  noIndex: false,
};

describe('getBlogIssues', () => {
  it('returns no issues for a fully-optimized blog', () => {
    expect(getBlogIssues(goodBlog)).toEqual([]);
  });
  it('flags missing description as an error', () => {
    const issues = getBlogIssues({ ...goodBlog, seoDescription: '', excerpt: '' });
    expect(issues.some((i) => i.field === 'seoDescription' && i.severity === 'error')).toBe(true);
  });
  it('falls back to excerpt for the description check', () => {
    const issues = getBlogIssues({ ...goodBlog, seoDescription: '', excerpt: goodBlog.seoDescription });
    expect(issues.some((i) => i.field === 'seoDescription')).toBe(false);
  });
  it('flags an image without alt text as an error', () => {
    const issues = getBlogIssues({ ...goodBlog, imageAlt: '' });
    expect(issues.some((i) => i.field === 'imageAlt' && i.severity === 'error')).toBe(true);
  });
  it('warns when a published post is noIndex', () => {
    const issues = getBlogIssues({ ...goodBlog, noIndex: true });
    expect(issues.some((i) => i.field === 'noIndex' && i.severity === 'warning')).toBe(true);
  });
  it('warns when the description is too long', () => {
    const issues = getBlogIssues({ ...goodBlog, seoDescription: 'x'.repeat(200) });
    expect(issues.some((i) => i.field === 'seoDescription' && i.severity === 'warning')).toBe(true);
  });
  it('flags a missing slug as an error', () => {
    const issues = getBlogIssues({ ...goodBlog, slug: '' });
    expect(issues.some((i) => i.field === 'slug' && i.severity === 'error')).toBe(true);
  });
});

describe('getProjectIssues / getDeploymentIssues', () => {
  it('flags missing description as an error', () => {
    expect(getProjectIssues({ slug: 'x', image: '/i.png' }).some((i) => i.field === 'description' && i.severity === 'error')).toBe(true);
    expect(getDeploymentIssues({ slug: 'x', image: '/i.png' }).some((i) => i.field === 'description' && i.severity === 'error')).toBe(true);
  });
  it('returns no issues when description, image and slug are present', () => {
    expect(getProjectIssues({ slug: 'x', description: 'A solid project description that is long enough.', image: '/i.png' })).toEqual([]);
  });
  it('warns on missing slug rather than erroring (fallback exists)', () => {
    const issues = getProjectIssues({ description: 'ok desc that is plenty long here', image: '/i.png' });
    expect(issues.some((i) => i.field === 'slug' && i.severity === 'warning')).toBe(true);
  });
});

describe('getStaticConfigIssues', () => {
  it('errors when no site title is configured', () => {
    expect(getStaticConfigIssues({}).some((i) => i.field === 'siteTitle' && i.severity === 'error')).toBe(true);
  });
  it('accepts logoText as a site title', () => {
    const issues = getStaticConfigIssues({ logoText: '< aiyu />', description: 'd', ogImage: '/og.png' });
    expect(issues).toEqual([]);
  });
});

describe('summarizeAudit', () => {
  it('counts errors, warnings and ok records', () => {
    const records = [
      { issues: [] },
      { issues: [{ severity: 'warning' }] },
      { issues: [{ severity: 'error' }, { severity: 'warning' }] },
    ];
    expect(summarizeAudit(records)).toEqual({ total: 3, errors: 1, warnings: 1, ok: 1 });
  });
});
