// /contact-us (port of src/app/(site)/contact-us/page.js).
import View from '@/app/components/contact/v2/ContactV2';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

export default function Page() {
  const { page, status, loading } = usePageData<{ location: string; status: string; email: string | null; hasResume: boolean; resumeHref: string }>();
  if (loading) return <Pending />;
  if (status === 404 || !page) return <NotFound />;
  return <View {...page} />;
}
