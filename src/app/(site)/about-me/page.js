import About from "../../components/about/About";
import { getConfigData, getAboutData } from "@/lib/dataFetchers";
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 0;

export async function generateMetadata() {
  const config = await getConfigData();
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = getSiteUrl();
  const description = 'Learn more about my background, skills, and experience.';
  const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

  return {
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
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${baseName} | About Me`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${baseUrl}/about-me`,
    },
  };
}
export default async function AboutPage() {
  const serializedAboutData = await getAboutData();
  return <About data={serializedAboutData} />;
}
