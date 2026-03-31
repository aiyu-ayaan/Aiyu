import Deployments from '../../components/deployments/Deployments';
import { getConfigData, getDeploymentsData } from '@/lib/dataFetchers';

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const description = 'Browse the apps and services currently hosted by this portfolio.';
    const ogImage = (typeof config?.ogImage === 'string'
        ? config.ogImage
        : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0
            ? config.ogImage.value
            : null) || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | Apps`,
        description,
        keywords: ['apps', 'hosted applications', 'services', 'production apps', config?.profession || 'developer'].join(', '),
        openGraph: {
            title: `${baseName} | Apps`,
            description,
            url: `${baseUrl}/apps`,
            type: 'website',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${baseName} | Apps`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `${baseUrl}/apps`,
        },
    };
}

export default async function AppsPage() {
    const [deployments, config] = await Promise.all([getDeploymentsData(), getConfigData()]);

    return <Deployments data={deployments} config={config} />;
}
