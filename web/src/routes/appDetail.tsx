// /apps/:id (port of src/app/(site)/apps/[id]/page.js).
import type { ComponentType } from 'react';
import AppDetailJs from '@/app/components/deployments/v2/AppDetailV2';
import TrackView from '@/app/components/shared/TrackView';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

type App = { _id: string; slug?: string };
type Data = { deployment: App; relatedProject: unknown; legal: unknown; productHref: string | null };
// memo()-wrapped JS component: TypeScript cannot infer its props.
const AppDetailV2 = AppDetailJs as ComponentType<Data & { backHref: string }>;

export default function AppDetail() {
  const { page, status, loading } = usePageData<Data>();
  if (loading) return <Pending />;
  if (status === 404 || !page?.deployment) return <NotFound />;
  return (
    <>
      <TrackView entityType="app" entityId={page.deployment._id} entitySlug={page.deployment.slug} />
      <AppDetailV2 {...page} backHref="/apps" />
    </>
  );
}
