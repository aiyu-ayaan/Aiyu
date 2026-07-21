import GitHubStatsLoader from '@/app/components/github/GitHubStatsLoader';
import { getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';

export const revalidate = 0;

export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Check out my open source contributions, repositories, and GitHub statistics.';

    const base = {
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
        },
        twitter: {
            card: 'summary_large_image',
            title: `${baseName} | GitHub`,
            description,
        },
        alternates: {
            canonical: `${baseUrl}/github`,
        },
    };

    return applySocialOverrides(base, social, '/github', { baseUrl, fallbackImage: config?.ogImage });
}

export default async function GitHubPage() {
    return <GitHubStatsLoader />;
}
