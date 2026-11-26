// /blogs/:id (port of src/app/(site)/blogs/[id]/page.js). Own chunk: markdown + syntax highlighting are heavy.
import type { ComponentType } from 'react';
import BlogDetailClientJs from '@/app/components/blogs/BlogDetailClient';
import TrackView from '@/app/components/shared/TrackView';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

type Blog = { _id: string; slug?: string };

// memo()-wrapped JS component: TypeScript cannot infer its props.
const BlogDetailClient = BlogDetailClientJs as ComponentType<{ blog: Blog; config: unknown; adsConfig: unknown; viewCount: number | null; backHref: string }>;

export default function BlogDetail() {
  const { page, status, loading } = usePageData<{ blog: Blog; config: unknown; adsConfig: unknown; viewCount: number | null }>();
  if (loading) return <Pending />;
  if (status === 404 || !page?.blog) return <NotFound />;
  const { blog } = page;
  return (
    <div className="pt-16">
      <TrackView entityType="blog" entityId={blog._id} entitySlug={blog.slug} />
      <BlogDetailClient blog={blog} config={page.config} adsConfig={page.adsConfig} viewCount={page.viewCount} backHref="/blogs" />
    </div>
  );
}
