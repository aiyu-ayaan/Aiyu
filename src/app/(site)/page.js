import HomeAbout from "../components/landing/HomeAbout";
import HomeProjects from "../components/landing/HomeProjects";
import GamePortfolio from "../components/landing/GamePortfolio";
import Divider from "../components/landing/Divider";
import dbConnect from "@/lib/db";
import HomeModel from "@/models/Home";
import AboutModel from "@/models/About";
import ProjectModel from "@/models/Project";

export default async function Home() {
  await dbConnect();
  const homeData = await HomeModel.findOne().lean();
  const aboutData = await AboutModel.findOne().lean();
  const projectsData = await ProjectModel.find().lean();

  // Serialize data to plain objects
  const serializedHomeData = JSON.parse(JSON.stringify(homeData));
  const serializedAboutData = JSON.parse(JSON.stringify(aboutData));
  const serializedProjectsData = JSON.parse(JSON.stringify(projectsData));

  return (
    <div>
      <GamePortfolio data={serializedHomeData} />
      <Divider />
      <HomeAbout data={serializedAboutData} />
      <Divider />
      <HomeProjects data={serializedProjectsData} />
    </div>
  );
}
