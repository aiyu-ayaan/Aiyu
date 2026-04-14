import About from "../../components/about/About";
import { getConfigData, getAboutData } from "@/lib/dataFetchers";

export const revalidate = 300;

export async function generateMetadata() {
  const config = await getConfigData();
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const description = 'Learn more about my background, skills, and experience.';
  const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

  return {
    title: `${baseName} | About Me`,
    description,
    keywords: ['about', 'developer', 'experience', 'skills', 'background', config?.profession || 'full stack'].join(', '),
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
