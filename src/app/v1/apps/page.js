import Deployments from '../../components/deployments/Deployments';
import { getConfigData, getDeploymentsData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';

export const revalidate = 0;

export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Browse the apps and services currently hosted by this portfolio.';

    const base = {
        title: `${baseName} | Apps`,
        description,
        keywords: ['apps', 'hosted applications', 'services', 'production apps', config?.profession || 'developer'].join(', '),
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
            title: `${baseName} | Apps`,
            description,
            url: `${baseUrl}/apps`,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${baseName} | Apps`,
            description,
        },
        alternates: {
            canonical: `${baseUrl}/apps`,
        },
    };

    return applySocialOverrides(base, social, '/apps', { baseUrl, fallbackImage: config?.ogImage });
}

export default async function AppsPage() {
    const [deployments, config] = await Promise.all([getDeploymentsData(), getConfigData()]);

    return <Deployments data={deployments} config={config} />;
}
