import ProjectsV2 from '../../components/projects/v2/ProjectsV2';
import { getConfigData, getProjectsData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 0;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'The complete project archive, year by year — V2 edition.';

    return {
        title: `${baseName} | Projects — V2`,
        description,
        openGraph: {
            title: `${baseName} | Projects — V2`,
            description,
            url: `${baseUrl}/v2/projects`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}/v2/projects`,
        },
    };
}

export default async function ProjectsV2Page() {
    const [projectsData, config] = await Promise.all([
        getProjectsData(),
        getConfigData(),
    ]);

    return <ProjectsV2 data={projectsData} config={config} />;
}
