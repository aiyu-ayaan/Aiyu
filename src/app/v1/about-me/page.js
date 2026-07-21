import About from "../../components/about/About";
import { getConfigData, getAboutData } from "@/lib/dataFetchers";
import { getSiteUrl } from '@/lib/siteUrl';
import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';

export const revalidate = 0;

export async function generateMetadata() {
  const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = getSiteUrl();
  const description = 'Learn more about my background, skills, and experience.';

  const base = {
    title: `${baseName} | About Me`,
    description,
    keywords: ['about', 'developer', 'experience', 'skills', 'background', config?.profession || 'full stack'].join(', '),
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
      title: `${baseName} | About Me`,
      description,
      url: `${baseUrl}/about-me`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${baseName} | About Me`,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/about-me`,
    },
  };

  return applySocialOverrides(base, social, '/about-me', { baseUrl, fallbackImage: config?.ogImage });
}
export default async function AboutPage() {
  const serializedAboutData = await getAboutData();
  return <About data={serializedAboutData} />;
}
