import { toCanonicalSiteUrl } from '@/lib/siteUrl';

const DISALLOWED_PATHS = [
    '/admin',
    '/api/admin',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/config',
    '/*.json$',
    '/*?',
    '/blog/',
    '/deployments/',
];

export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: DISALLOWED_PATHS,
                crawlDelay: 1,
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: DISALLOWED_PATHS,
                crawlDelay: 0,
            },
        ],
        sitemap: toCanonicalSiteUrl('/sitemap.xml'),
    };
}
