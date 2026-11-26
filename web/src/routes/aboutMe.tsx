// /about-me (port of src/app/(site)/about-me/page.js).
import AboutV2 from '@/app/components/about/v2/AboutV2';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

export default function AboutMe() {
  const { page, status, loading } = usePageData<{ about: unknown }>();
  if (loading) return <Pending />;
  if (status === 404 || !page) return <NotFound />;
  return <AboutV2 data={page.about} />;
}
