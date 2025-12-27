// SEO Helper utilities

export function generateMetadataObject(config = {}) {
    const {
        title = 'Portfolio',
        description = 'Full Stack Developer & Designer',
        keywords = [],
        ogTitle,
        ogDescription,
        ogImage,
        twitterHandle = '',
        canonical,
        robots = 'index, follow',
    } = config;

    return {
        title,
        description,
        keywords: Array.isArray(keywords) ? keywords.join(', ') : keywords,
        openGraph: {
            title: ogTitle || title,
            description: ogDescription || description,
            images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
            type: 'website',
            locale: 'en_US',
            url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        },
        twitter: {
            card: 'summary_large_image',
            title: ogTitle || title,
            description: ogDescription || description,
            creator: twitterHandle,
            images: ogImage ? [ogImage] : [],
        },
        robots,
        alternates: canonical ? { canonical } : undefined,
    };
}

export function generatePageMetadata(pageConfig, baseConfig) {
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const siteTitle = baseConfig?.siteTitle || baseConfig?.logoText || 'Portfolio';
    const ogImage = pageConfig.ogImage || `${siteUrl}/og-image.png`;

    return generateMetadataObject({
        title: `${pageConfig.title} | ${siteTitle}`,
        description: pageConfig.description,
        keywords: pageConfig.keywords || [],
        ogTitle: pageConfig.ogTitle || `${pageConfig.title} | ${siteTitle}`,
        ogDescription: pageConfig.ogDescription || pageConfig.description,
        ogImage,
        robots: 'index, follow',
        canonical: `${siteUrl}${pageConfig.path}`,
    });
}

export function truncateDescription(text, maxLength = 160) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

export function generateSlug(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
