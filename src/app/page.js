"use client";

import HomeAbout from "./components/landing/HomeAbout";
import HomeProjects from "./components/landing/HomeProjects";
import GamePortfolio from "./components/landing/GamePortfolio";
import Divider from "./components/landing/Divider";
import ScrollReveal from "./components/shared/ScrollReveal";

export default function Home() {
  return(
    <div>
      <GamePortfolio />
      <ScrollReveal direction="up" delay={0.2}>
        <Divider />
      </ScrollReveal>
      <ScrollReveal direction="up" delay={0.1}>
        <HomeAbout />
      </ScrollReveal>
      <ScrollReveal direction="up" delay={0.2}>
        <Divider />
      </ScrollReveal>
      <ScrollReveal direction="up" delay={0.1}>
        <HomeProjects />
      </ScrollReveal>
    </div>
  ) ;
}
