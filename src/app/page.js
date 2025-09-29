import HomeAbout from "./components/landing/HomeAbout";
import HomeProjects from "./components/landing/HomeProjects";
import GamePortfolio from "./components/landing/GamePortfolio";
import Divider from "./components/landing/Divider";

export default function Home() {
  return(
    <div>
      <GamePortfolio />
      <Divider />
      <HomeAbout />
      <Divider />
      <HomeProjects />
    </div>
  ) ;
}
