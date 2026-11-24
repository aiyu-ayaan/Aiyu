// /projects (port of src/app/(site)/projects/page.js).
import View from '@/app/components/projects/v2/ProjectsV2';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

export default function Page() {
  const { page, status, loading } = usePageData<Record<string, any>>();
  if (loading) return <Pending />;
  if (status === 404 || !page) return <NotFound />;
  return <View data={page.projects} config={page.config} basePath="/projects" />;
}
