import HomeAbout from "./components/landing/HomeAbout";
import HomeProjects from "./components/landing/HomeProjects";
import GamePortfolio from "./components/landing/GamePortfolio";
import Divider from "./components/landing/Divider";
import { getHomeScreenData, getAboutData, getProjects } from "@/lib/api";

export default async function Home() {
  const homeData = await getHomeScreenData();
  const aboutData = await getAboutData();
  const projects = await getProjects();
  
  return(
    <div>
      <GamePortfolio homeData={homeData} />
      <Divider />
      <HomeAbout aboutData={aboutData} />
      <Divider />
      <HomeProjects projects={projects} />
    </div>
  ) ;
}
