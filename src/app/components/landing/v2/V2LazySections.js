"use client";

import dynamic from 'next/dynamic';
import ViewportLazySection from '../../shared/ViewportLazySection';

const V2TechStack = dynamic(() => import('./V2TechStack'), { loading: () => <div className="h-[720px]" /> });
const V2About = dynamic(() => import('./V2About'), { loading: () => <div className="h-[720px]" /> });
const V2Showcase = dynamic(() => import('./V2Showcase'), { loading: () => <div className="h-[720px]" /> });
const V2Projects = dynamic(() => import('./V2Projects'), { loading: () => <div className="h-[760px]" /> });
const V2Blogs = dynamic(() => import('./V2Blogs'), { loading: () => <div className="h-[720px]" /> });

// The v2 chapters are full-bleed and draw their own hairline separators,
// so no Divider elements between them.
export default function V2LazySections({ aboutData, projectsData, blogsData, homeData, config }) {
  return (
    <>
      <ViewportLazySection id="v2-tech" placeholderHeight={720} rootMargin="420px 0px">
        <V2TechStack data={aboutData} />
      </ViewportLazySection>

      <ViewportLazySection id="v2-about" placeholderHeight={720} rootMargin="420px 0px">
        <V2About data={aboutData} />
      </ViewportLazySection>

      <ViewportLazySection id="v2-showcase" placeholderHeight={900} rootMargin="420px 0px">
        <V2Showcase data={homeData?.showcaseSection} />
      </ViewportLazySection>

      <ViewportLazySection id="v2-projects" placeholderHeight={760} rootMargin="420px 0px">
        <V2Projects data={projectsData} config={config} />
      </ViewportLazySection>

      <ViewportLazySection id="v2-blogs" placeholderHeight={720} rootMargin="420px 0px">
        <V2Blogs blogs={blogsData} config={config} />
      </ViewportLazySection>
    </>
  );
}
