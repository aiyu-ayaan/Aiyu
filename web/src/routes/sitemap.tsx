// /sitemap (port of src/app/(site)/sitemap/page.js): the columns are built here so the games list comes from the
// registry, not from the server.
import type { ComponentType } from 'react';
import SitemapV2Js from '@/app/components/shared/v2/SitemapV2';
import { GAMES } from '@/app/components/games/registry';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

type Entry = { name: string; slug: string };
type Data = { blogs: string[]; projects: Entry[]; apps: Entry[] };
type Game = { title: string; slug: string; hidden?: boolean };
type Column = { label: string; accent: string; items: { name: string; href: string }[] };
// JS component with a default-[] prop: TypeScript infers never[].
const SitemapV2 = SitemapV2Js as ComponentType<{ columns: Column[]; totalEntries: number }>;

const MAIN = [
  ['Home', ''], ['About', '/about-me'], ['Projects', '/projects'], ['Apps', '/apps'], ['Blogs', '/blogs'],
  ['Arcade', '/games'], ['Gallery', '/gallery'], ['GitHub', '/github'], ['Contact Us', '/contact-us'],
];

export default function Page() {
  const { page, status, loading } = usePageData<Data>();
  if (loading) return <Pending />;
  if (status === 404 || !page) return <NotFound />;
  const columns = [
    { label: '// main', accent: 'var(--accent-cyan)', items: MAIN.map(([name, href]) => ({ name, href })) },
    { label: '// apps', accent: 'var(--status-success)', items: page.apps.map((a) => ({ name: a.name, href: `/apps/${a.slug}` })) },
    { label: '// projects', accent: 'var(--accent-purple)', items: page.projects.map((p) => ({ name: p.name, href: `/projects/${p.slug}` })) },
    {
      label: '// arcade',
      accent: 'var(--accent-pink)',
      items: (GAMES as Game[]).filter((g) => !g.hidden).map((g) => ({ name: g.title, href: `/games/${g.slug}` })),
    },
    { label: '// writing', accent: 'var(--accent-orange)', items: page.blogs.map((slug) => ({ name: slug.replace(/-/g, ' '), href: `/blogs/${slug}` })) },
  ];
  const totalEntries = columns.reduce((sum, c) => sum + c.items.length, 0);
  return <SitemapV2 columns={columns} totalEntries={totalEntries} />;
}
