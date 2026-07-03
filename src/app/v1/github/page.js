import GitHubStatsLoader from '@/app/components/github/GitHubStatsLoader';
import { getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 0;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Check out my open source contributions, repositories, and GitHub statistics.';
    const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | GitHub`,
        description,
        keywords: ['github', 'repositories', 'open source', 'coding', 'development', 'contributions'].join(', '),
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-snippet': -1,
                'max-image-preview': 'large',
                'max-video-preview': -1,
            },
        },
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
