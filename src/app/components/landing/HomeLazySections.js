"use client";

import dynamic from 'next/dynamic';
import Divider from './Divider';
import ViewportLazySection from '../shared/ViewportLazySection';

const sectionFallback = (minHeight = 360) => (
  <div
    className="mx-auto max-w-6xl animate-pulse rounded-3xl border"
    style={{
      minHeight: `${minHeight}px`,
      borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
      background:
        'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 86%, transparent), color-mix(in srgb, var(--bg-secondary) 88%, transparent))',
    }}
    aria-hidden="true"
  />
);

const TechStackCarousel = dynamic(() => import('./TechStackCarousel'), {
  loading: () => sectionFallback(420),
});

const HomeAbout = dynamic(() => import('./HomeAbout'), {
  loading: () => sectionFallback(360),
});

const HomeProjects = dynamic(() => import('./HomeProjects'), {
  loading: () => sectionFallback(420),
});

const HomeBlogs = dynamic(() => import('./HomeBlogs'), {
  loading: () => sectionFallback(420),
});

export default function HomeLazySections({ aboutData, projectsData, blogsData }) {
  return (
    <>
      <ViewportLazySection id="home-tech" placeholderHeight={420}>
        <TechStackCarousel data={aboutData} />
      </ViewportLazySection>

      <Divider />

      <ViewportLazySection id="home-about" placeholderHeight={360}>
        <HomeAbout data={aboutData} />
      </ViewportLazySection>

      <Divider />

      <ViewportLazySection id="home-projects" placeholderHeight={420}>
        <HomeProjects data={projectsData} />
      </ViewportLazySection>

      <Divider />

      <ViewportLazySection id="home-blogs" placeholderHeight={420}>
        <HomeBlogs blogs={blogsData} />
      </ViewportLazySection>
    </>
  );
}
