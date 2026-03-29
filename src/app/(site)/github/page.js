import dynamic from 'next/dynamic';
import { getConfigData } from '@/lib/dataFetchers';

const GitHubStatsLoader = dynamic(() => import('@/app/components/github/GitHubStatsLoader'), {
    loading: () => (
        <div className="min-h-screen p-4 lg:p-8">
            <div
                className="mx-auto max-w-6xl animate-pulse rounded-3xl border"
                style={{
                    minHeight: '420px',
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
    const description = 'Check out my open source contributions, repositories, and GitHub statistics.';
    const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | GitHub`,
        description,
        keywords: ['github', 'repositories', 'open source', 'coding', 'development', 'contributions'].join(', '),
        openGraph: {
            title: `${baseName} | GitHub`,
            description,
            url: `${baseUrl}/github`,
            type: 'website',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${baseName} | GitHub`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `${baseUrl}/github`,
        },
    };
}

export default async function GitHubPage() {
    return <GitHubStatsLoader />;
}
