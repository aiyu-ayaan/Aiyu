import Projects from "../../components/projects/Projects";
import dbConnect from "@/lib/db";
import ProjectModel from "@/models/Project";

export default async function ProjectsPage() {
  await dbConnect();
  const projectsData = await ProjectModel.find().lean();
  const serializedProjectsData = JSON.parse(JSON.stringify(projectsData));
  return <Projects data={serializedProjectsData} />;
}