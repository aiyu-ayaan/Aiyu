"use client";

import { useEffect } from "react";
import HomeAbout from "./components/landing/HomeAbout";
import HomeProjects from "./components/landing/HomeProjects";
import GamePortfolio from "./components/landing/GamePortfolio";
import Divider from "./components/landing/Divider";
import { useTheme } from "./context/ThemeContext";

export default function Home() {
  const { setPageTheme } = useTheme();
  
  useEffect(() => {
    setPageTheme('home');
  }, [setPageTheme]);
  
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
