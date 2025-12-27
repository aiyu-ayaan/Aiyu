import Projects from "../../components/projects/Projects";
import dbConnect from "@/lib/db";
import ProjectModel from "@/models/Project";
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
  const description = 'Explore my latest projects and portfolio work.';
  const ogImage = config?.ogImage || `${baseUrl}/og-image.png`;

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
  await dbConnect();
  const projectsData = await ProjectModel.find().lean();
  const serializedProjectsData = JSON.parse(JSON.stringify(projectsData));
  return <Projects data={serializedProjectsData} />;
}