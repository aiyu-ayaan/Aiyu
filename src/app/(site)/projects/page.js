import Projects from '../../components/projects/Projects';
import { getConfigData, getProjectsData } from "@/lib/dataFetchers";
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 0;

export async function generateMetadata() {
  const config = await getConfigData();
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = getSiteUrl();
  const description = 'Explore my latest projects and portfolio work.';
  const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

  return {
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
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${baseName} | Projects`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${baseUrl}/projects`,
    },
  };
}
export default async function ProjectsPage() {
  const [serializedProjectsData, config] = await Promise.all([
    getProjectsData(),
    getConfigData(),
  ]);

  return <Projects data={serializedProjectsData} initialConfig={config} />;
}
