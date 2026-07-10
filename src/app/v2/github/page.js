import GitHubV2Loader from '../../components/github/v2/GitHubV2Loader';
import BreadcrumbSchema from '../../components/shared/BreadcrumbSchema';
import { getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';

export const revalidate = 0;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Open source contributions, repositories, and GitHub statistics — V2 edition.';

    return {
        title: `${baseName} | GitHub`,
        description,
        openGraph: {
            title: `${baseName} | GitHub`,
            description,
            url: `${baseUrl}${v2PublicPath(config, '/github')}`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}${v2PublicPath(config, '/github')}`,
        },
    };
}

export default async function GitHubV2Page() {
    return (
        <>
            <BreadcrumbSchema path="/github" name="GitHub" />
            <GitHubV2Loader />
        </>
    );
}
