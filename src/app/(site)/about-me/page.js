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

  return {
    title: `${baseName} | About Me`,
    description: 'Learn more about my background, skills, and experience.',
  };
}
export default async function AboutPage() {
  await dbConnect();
  const aboutData = await AboutModel.findOne().lean();
  const serializedAboutData = JSON.parse(JSON.stringify(aboutData));
  return <About data={serializedAboutData} />;
}