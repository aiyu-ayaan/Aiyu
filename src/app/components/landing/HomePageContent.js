"use client";

import { useState } from 'react';
import HomeAbout from "./HomeAbout";
import HomeProjects from "./HomeProjects";
import SnakeGamePortfolio from "./SnakeGamePortfolio";
import Divider from "./Divider";

export default function HomePageContent() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  return(
    <div>
      <SnakeGamePortfolio onUnlock={handleUnlock} isUnlocked={isUnlocked} />
      <Divider />
      <HomeAbout isUnlocked={isUnlocked} />
      <Divider />
      <HomeProjects isUnlocked={isUnlocked} />
    </div>
  ) ;
}
