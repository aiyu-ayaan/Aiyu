
import React from 'react';
import dynamic from 'next/dynamic';
import { getConfigData } from '@/lib/dataFetchers';

const BlogList = dynamic(() => import('../../components/blogs/BlogList'), {
    loading: () => (
        <div className="min-h-screen p-4 lg:p-8">
            <div
                className="mx-auto max-w-6xl animate-pulse rounded-3xl border"
                style={{
                    minHeight: '440px',
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                    background:
                        'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 84%, transparent), color-mix(in srgb, var(--bg-secondary) 86%, transparent))',
                }}
            />
        </div>
    ),
});

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const description = 'Read my latest blogs and articles on web development and technology.';
    const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

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
