"use client";

import TechStackCarousel from './TechStackCarousel';
import HomeAbout from './HomeAbout';
import HomeProjects from './HomeProjects';
import HomeBlogs from './HomeBlogs';
import Divider from './Divider';

export default function HomeLazySections({ aboutData, projectsData, blogsData }) {
  return (
    <>
      <section id="home-tech">
        <TechStackCarousel data={aboutData} />
      </section>

      <Divider />

      <section id="home-about">
        <HomeAbout data={aboutData} />
      </section>

      <Divider />

      <section id="home-projects">
        <HomeProjects data={projectsData} />
      </section>

      <Divider />

      <section id="home-blogs">
        <HomeBlogs blogs={blogsData} />
      </section>
    </>
  );
}
