// /ai/:section (port of src/app/(site)/ai/[section]/page.js).
import type { ComponentType } from 'react';
import Link from 'next/link';
import { AI_SECTION_COMPONENTS } from '@/app/components/ai/v2/registry';
import TrackView from '@/app/components/shared/TrackView';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

type Section = { type: string };
type Data = { section: Section; stats: unknown; slug: string; hubLabel: string };
const COMPONENTS = AI_SECTION_COMPONENTS as Record<string, ComponentType<{ index: string; section: Section; stats?: unknown }>>;

export default function Page() {
  const { page, status, loading } = usePageData<Data>();
  if (loading) return <Pending />;
  const Component = page?.section ? COMPONENTS[page.section.type] : null;
  if (status === 404 || !page || !Component) return <NotFound />;
  const extra = page.section.type === 'stats' ? { stats: page.stats } : {};
  return (
    <main className="relative overflow-hidden">
      <TrackView entityType="ai-section" entityId={page.slug} entitySlug={page.slug} />
      <div className="mx-auto w-full max-w-7xl px-6 pt-28 sm:pt-32 lg:px-10">
        <Link
          href="/ai"
          className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors duration-200"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
          {page.hubLabel}
        </Link>
      </div>
      <Component index="01" section={page.section} {...extra} />
    </main>
  );
}
