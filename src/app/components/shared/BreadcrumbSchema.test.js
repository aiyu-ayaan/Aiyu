import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/dataFetchers', () => ({
    getLayoutData: vi.fn(),
}));

import { resolveNavLabel } from './BreadcrumbSchema';
import { generateBreadcrumbSchema } from '@/app/schema';

describe('resolveNavLabel', () => {
    const navLinks = [
        { name: '_hello', href: '/' },
        { name: '_about-me', href: '/about-me' },
        { name: '_projects', href: '/projects/' },
        { name: '_ai-hub', href: '/ai', beta: true },
        { name: '_resume', href: 'https://example.com/resume.pdf', target: '_blank' },
    ];

    it('resolves and prettifies the admin-managed nav name for a path', () => {
        expect(resolveNavLabel(navLinks, '/about-me')).toBe('About Me');
        expect(resolveNavLabel(navLinks, '/ai')).toBe('Ai Hub');
    });

    it('matches hrefs regardless of trailing slashes', () => {
        expect(resolveNavLabel(navLinks, '/projects')).toBe('Projects');
    });

    it('falls back to the provided name when the path is not in the nav', () => {
        expect(resolveNavLabel(navLinks, '/contact-us', 'Contact')).toBe('Contact');
    });

    it('falls back to a prettified path segment without nav match or name', () => {
        expect(resolveNavLabel(navLinks, '/some-page')).toBe('Some Page');
    });

    it('handles missing nav data', () => {
        expect(resolveNavLabel(null, '/gallery', 'Gallery')).toBe('Gallery');
        expect(resolveNavLabel(undefined, '/gallery')).toBe('Gallery');
    });

    it('does not match external hrefs against paths', () => {
        expect(resolveNavLabel(navLinks, '/resume.pdf', 'Resume')).toBe('Resume');
    });
});

describe('generateBreadcrumbSchema', () => {
    it('builds an ordered BreadcrumbList document', () => {
        const schema = generateBreadcrumbSchema([
            { name: 'Home', item: 'https://example.com' },
            { name: 'Projects', item: 'https://example.com/projects' },
            { name: 'My App', item: 'https://example.com/projects/my-app' },
        ]);

        expect(schema).toEqual({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com' },
                { '@type': 'ListItem', position: 2, name: 'Projects', item: 'https://example.com/projects' },
                { '@type': 'ListItem', position: 3, name: 'My App', item: 'https://example.com/projects/my-app' },
            ],
        });
    });

    it('tolerates an empty trail', () => {
        expect(generateBreadcrumbSchema([]).itemListElement).toEqual([]);
        expect(generateBreadcrumbSchema(undefined).itemListElement).toEqual([]);
    });
});
