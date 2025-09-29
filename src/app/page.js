import HomeAbout from "./components/landing/HomeAbout";
import HomeProjects from "./components/landing/HomeProjects";
import SnakeGamePortfolio from "./components/landing/SnakeGamePortfolio";
import Divider from "./components/landing/Divider";

export default function Home() {
  return(
    <div>
      <SnakeGamePortfolio />
      <Divider />
      <HomeAbout />
      <Divider />
      <HomeProjects />
    </div>
  ) ;
}
