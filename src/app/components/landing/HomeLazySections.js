"use client";

import dynamic from 'next/dynamic';
import Divider from './Divider';
import ViewportLazySection from '../shared/ViewportLazySection';

const TechStackCarousel = dynamic(() => import('./TechStackCarousel'), { loading: () => <div className="h-[420px]" /> });
const HomeAbout = dynamic(() => import('./HomeAbout'), { loading: () => <div className="h-[420px]" /> });
const HomeProjects = dynamic(() => import('./HomeProjects'), { loading: () => <div className="h-[520px]" /> });
const HomeBlogs = dynamic(() => import('./HomeBlogs'), { loading: () => <div className="h-[520px]" /> });

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
