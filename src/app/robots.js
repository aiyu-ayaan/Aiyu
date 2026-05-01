import { toCanonicalSiteUrl } from '@/lib/siteUrl';

export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin',
                    '/api/admin',
                    '/api/auth/login',
                    '/api/auth/logout',
                    '/api/config',
                    '/*.json$',
                    '/*?*sort=',
                    '/*?*page=',
                ],
                crawlDelay: 1,
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                crawlDelay: 0,
            },
        ],
        sitemap: toCanonicalSiteUrl('/sitemap.xml'),
    };
}
