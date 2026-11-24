// / (port of src/app/(site)/page.js).
import V2Hero from '@/app/components/landing/v2/V2Hero';
import V2LifeStory from '@/app/components/landing/v2/V2LifeStory';
import StoryPlayer from '@/app/components/landing/v2/StoryPlayer';
import type { ComponentType } from 'react';
import V2SnapshotJs from '@/app/components/landing/v2/V2Snapshot';
import V2MissionControl from '@/app/components/landing/v2/V2MissionControl';
import V2LazySections from '@/app/components/landing/v2/V2LazySections';
import V2ScrollProgress from '@/app/components/landing/v2/V2ScrollProgress';
import SceneHud from '@/app/components/landing/v2/SceneHud';
import ViewportLazySection from '@/app/components/shared/ViewportLazySection';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

// JS component with default-[] props: TypeScript infers never[].
const V2Snapshot = V2SnapshotJs as ComponentType<{ stats: unknown[]; recentProjectNames: unknown[]; recentBlogTitles: unknown[] }>;

type Named = { name?: string; title?: string; createdAt?: string; date?: string };
type Home = { name?: string; statusSection?: { enabled?: boolean } } | null;
type Data = { home: Home; about: { skills?: unknown[]; experiences?: unknown[] } | null; projects: Named[]; blogs: Named[]; config: unknown };

export default function HomePage() {
  const { page, status, loading } = usePageData<Data>();
  if (loading) return <Pending />;
  if (status === 404 || !page) return <NotFound />;
  const { home, about, config } = page;
  const projects = Array.isArray(page.projects) ? page.projects : [];
  const blogs = Array.isArray(page.blogs) ? page.blogs : [];
  const skills = Array.isArray(about?.skills) ? about.skills : [];
  const experiences = Array.isArray(about?.experiences) ? about.experiences : [];
  const stats = [
    { label: 'Projects Built', value: projects.length, accent: 'var(--accent-cyan)' },
    { label: 'Core Skills', value: skills.length, accent: 'var(--accent-purple)' },
    { label: 'Experience Entries', value: experiences.length, accent: 'var(--accent-orange)' },
    { label: 'Published Blogs', value: blogs.length, accent: 'var(--accent-pink)' },
  ];
  const recentProjectNames = projects.slice(0, 3).map((p) => p?.name).filter(Boolean);
  const time = (b: Named) => new Date(b?.createdAt || b?.date || 0).getTime();
  const recentBlogTitles = [...blogs].sort((a, b) => time(b) - time(a)).slice(0, 2).map((b) => b?.title).filter(Boolean);

  return (
    <div className="relative overflow-x-clip">
      <V2ScrollProgress />
      <SceneHud />
      <V2Hero data={home} counts={{ projects: projects.length, skills: skills.length, blogs: blogs.length }} />
      <V2LifeStory name={home?.name || 'Ayaan'} />
      <StoryPlayer skipTo="v2-snapshot" />
      <ViewportLazySection id="v2-snapshot" className="relative z-20" placeholderHeight={720} rootMargin="420px 0px" initialDelayMs={220}>
        <V2Snapshot stats={stats} recentProjectNames={recentProjectNames} recentBlogTitles={recentBlogTitles} />
      </ViewportLazySection>
      {home?.statusSection?.enabled !== false && (
        <ViewportLazySection id="v2-status" className="relative z-20" placeholderHeight={720} rootMargin="420px 0px">
          <V2MissionControl data={home?.statusSection} />
        </ViewportLazySection>
      )}
      <V2LazySections aboutData={about} projectsData={page.projects} blogsData={page.blogs} homeData={home} config={config} />
    </div>
  );
}
