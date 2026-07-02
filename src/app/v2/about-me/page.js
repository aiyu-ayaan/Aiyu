import AboutV2 from "../../components/about/v2/AboutV2";
import { getConfigData, getAboutData } from "@/lib/dataFetchers";
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 0;

export async function generateMetadata() {
  const config = await getConfigData();
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = getSiteUrl();
  const description = 'Learn more about my background, skills, and experience.';

  return {
    title: `${baseName} | About Me — V2`,
    description,
    openGraph: {
      title: `${baseName} | About Me — V2`,
      description,
      url: `${baseUrl}/v2/about-me`,
      type: 'website',
    },
    alternates: {
      canonical: `${baseUrl}/v2/about-me`,
    },
  };
}

export default async function AboutV2Page() {
  const serializedAboutData = await getAboutData();
  return <AboutV2 data={serializedAboutData} />;
}
