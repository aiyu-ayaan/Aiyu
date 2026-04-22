export default function robots() {
    const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

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
        sitemap: `${normalizedBaseUrl}/sitemap.xml`,
    };
}
