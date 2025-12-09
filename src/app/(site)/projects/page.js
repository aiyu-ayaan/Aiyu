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

  return {
    title: `${baseName} | Projects`,
    description: 'Explore my latest projects and portfolio work.',
  };
}
export default async function ProjectsPage() {
  await dbConnect();
  const projectsData = await ProjectModel.find().lean();
  const serializedProjectsData = JSON.parse(JSON.stringify(projectsData));
  return <Projects data={serializedProjectsData} />;
}