import Projects from '../../components/projects/Projects';
import { getConfigData, getProjectsData } from "@/lib/dataFetchers";

// Always fetch fresh data - no caching
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const config = await getConfigData();
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const description = 'Explore my latest projects and portfolio work.';
  const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

  return {
    title: `${baseName} | Projects`,
    description,
    keywords: ['projects', 'portfolio', 'development', 'case studies', 'web development', config?.profession || 'full stack'].join(', '),
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
  const serializedProjectsData = await getProjectsData();
  return <Projects data={serializedProjectsData} />;
}
