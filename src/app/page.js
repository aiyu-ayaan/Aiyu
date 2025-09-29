import HomeAbout from "./components/home/HomeAbout";
import HomeProjects from "./components/home/HomeProjects";
import SnakeGamePortfolio from "./components/home/SnakeGamePortfolio";
import Divider from "./components/home/Divider";

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
