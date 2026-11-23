import AboutV2 from "../../components/about/v2/AboutV2";
import BreadcrumbSchema from "../../components/shared/BreadcrumbSchema";
import { getConfigData, getAboutData } from "@/lib/dataFetchers";
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';
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
    openGraph: {
      title: `${baseName} | About Me`,
      description,
      url: `${baseUrl}${v2PublicPath(config, '/about-me')}`,
      type: 'website',
    },
    alternates: {
      canonical: `${baseUrl}${v2PublicPath(config, '/about-me')}`,
    },
  };

  return applySocialOverrides(base, social, '/about-me', { baseUrl, fallbackImage: config?.ogImage });
}

export default async function AboutV2Page() {
  const serializedAboutData = await getAboutData();
  return (
    <>
      <BreadcrumbSchema path="/about-me" name="About Me" />
      <AboutV2 data={serializedAboutData} />
    </>
  );
}
