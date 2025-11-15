import Projects from "../components/projects/Projects";
import { getProjects, getProjectsRoles } from "@/lib/api";

export default async function ProjectsPage() {
  const projects = await getProjects();
  const roles = await getProjectsRoles();
  return <Projects projects={projects} roles={roles} />;
}