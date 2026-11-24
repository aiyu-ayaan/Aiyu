// /ai (port of src/app/(site)/ai/page.js).
import AiHub from '@/app/components/ai/v2/AiHub';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

export default function Page() {
  const { page, status, loading } = usePageData<{ config: unknown; stats: unknown }>();
  if (loading) return <Pending />;
  if (status === 404 || !page) return <NotFound />;
  return <AiHub config={page.config} stats={page.stats} basePath="/ai" />;
}
