import Projects from '../../components/projects/Projects';
import { getConfigData, getProjectsData } from "@/lib/dataFetchers";
import { getSiteUrl } from '@/lib/siteUrl';
import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';

export const revalidate = 0;

export async function generateMetadata() {
  const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = getSiteUrl();
  const description = 'Explore my latest projects and portfolio work.';

  const base = {
    title: `${baseName} | Projects`,
    description,
    keywords: ['projects', 'portfolio', 'development', 'case studies', 'web development', config?.profession || 'full stack'].join(', '),
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
      title: `${baseName} | Projects`,
      description,
      url: `${baseUrl}/projects`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${baseName} | Projects`,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/projects`,
    },
  };

  return applySocialOverrides(base, social, '/projects', { baseUrl, fallbackImage: config?.ogImage });
}
export default async function ProjectsPage() {
  const [serializedProjectsData, config] = await Promise.all([
    getProjectsData(),
    getConfigData(),
  ]);

  return <Projects data={serializedProjectsData} initialConfig={config} />;
}
