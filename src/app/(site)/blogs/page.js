
import React from 'react';
import BlogList from '../../components/blogs/BlogList';

import dbConnect from '../../../lib/db';
import Config from '../../../models/Config';

async function getConfig() {
    try {
        await dbConnect();
        let config = await Config.findOne().lean();
        if (!config) return null;
        return config;
    } catch (error) {
        console.error('Failed to fetch config:', error);
        return null;
    }
}

export async function generateMetadata() {
    const config = await getConfig();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const description = 'Read my latest blogs and articles on web development and technology.';
    const ogImage = config?.ogImage || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | Blogs`,
        description,
        keywords: ['blog', 'articles', 'web development', 'technology', 'tutorials', config?.profession || 'full stack'].join(', '),
        openGraph: {
            title: `${baseName} | Blogs`,
            description,
            url: `${baseUrl}/blogs`,
            type: 'website',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${baseName} | Blogs`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `${baseUrl}/blogs`,
        },
    };
}

export default function BlogsPage() {
    return (
        <BlogList />
    );
}
