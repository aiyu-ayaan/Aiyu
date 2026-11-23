import DeploymentsV2 from '../../components/deployments/v2/DeploymentsV2';
import BreadcrumbSchema from '../../components/shared/BreadcrumbSchema';
import { getConfigData, getDeploymentsData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';
import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';

export const revalidate = 0;

export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Hosted apps and services as a live process table — V2 edition.';

    const base = {
        title: `${baseName} | Apps`,
        description,
        openGraph: {
            title: `${baseName} | Apps`,
            description,
            url: `${baseUrl}${v2PublicPath(config, '/apps')}`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}${v2PublicPath(config, '/apps')}`,
        },
    };

    return applySocialOverrides(base, social, '/apps', { baseUrl, fallbackImage: config?.ogImage });
}

export default async function AppsV2Page() {
    const deployments = await getDeploymentsData();
    return (
        <>
            <BreadcrumbSchema path="/apps" name="Apps" />
            <DeploymentsV2 data={deployments} />
        </>
    );
}
