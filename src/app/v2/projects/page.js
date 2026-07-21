import ProjectsV2 from '../../components/projects/v2/ProjectsV2';
import BreadcrumbSchema from '../../components/shared/BreadcrumbSchema';
import { getConfigData, getProjectsData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';
import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';

export const revalidate = 0;

export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'The complete project archive, year by year — V2 edition.';

    const base = {
        title: `${baseName} | Projects`,
        description,
        openGraph: {
            title: `${baseName} | Projects`,
            description,
            url: `${baseUrl}${v2PublicPath(config, '/projects')}`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}${v2PublicPath(config, '/projects')}`,
        },
    };

    return applySocialOverrides(base, social, '/projects', { baseUrl, fallbackImage: config?.ogImage });
}

export default async function ProjectsV2Page() {
    const [projectsData, config] = await Promise.all([
        getProjectsData(),
        getConfigData(),
    ]);

    return (
        <>
            <BreadcrumbSchema path="/projects" name="Projects" />
            <ProjectsV2 data={projectsData} config={config} />
        </>
    );
}
