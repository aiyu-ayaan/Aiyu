// /gallery (port of src/app/(site)/gallery/page.js).
import View from '@/app/components/gallery/v2/GalleryV2';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

export default function Page() {
  const { page, status, loading } = usePageData<Record<string, any>>();
  if (loading) return <Pending />;
  if (status === 404 || !page) return <NotFound />;
  return <View initialImages={page.images} initialConfig={page.config} />;
}
