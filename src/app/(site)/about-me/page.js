import About from "../../components/about/About";
import dbConnect from "@/lib/db";
import AboutModel from "@/models/About";
import Config from "@/models/Config";

async function getConfig() {
  try {
    await dbConnect();
    let config = await Config.findOne().lean();
    if (!config) return null;
    return config;
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return null;
  }
}

export async function generateMetadata() {
  const config = await getConfig();
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const description = 'Learn more about my background, skills, and experience.';
  const ogImage = config?.ogImage || `${baseUrl}/og-image.png`;

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
  await dbConnect();
  const aboutData = await AboutModel.findOne().lean();
  const serializedAboutData = JSON.parse(JSON.stringify(aboutData));
  return <About data={serializedAboutData} />;
}