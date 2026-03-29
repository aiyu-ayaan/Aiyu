"use client";

import TechStackCarousel from './TechStackCarousel';
import HomeAbout from './HomeAbout';
import HomeProjects from './HomeProjects';
import HomeBlogs from './HomeBlogs';
import Divider from './Divider';
import ViewportLazySection from '../shared/ViewportLazySection';

export default function HomeLazySections({ aboutData, projectsData, blogsData }) {
  return (
    <>
      <ViewportLazySection id="home-tech" placeholderHeight={420} rootMargin="300px 0px">
        <TechStackCarousel data={aboutData} />
      </ViewportLazySection>

      <Divider />

      <ViewportLazySection id="home-about" placeholderHeight={420} rootMargin="260px 0px">
        <HomeAbout data={aboutData} />
      </ViewportLazySection>

      <Divider />

      <ViewportLazySection id="home-projects" placeholderHeight={520} rootMargin="260px 0px">
        <HomeProjects data={projectsData} />
      </ViewportLazySection>

      <Divider />

      <ViewportLazySection id="home-blogs" placeholderHeight={520} rootMargin="260px 0px">
        <HomeBlogs blogs={blogsData} />
      </ViewportLazySection>
    </>
  );
}
