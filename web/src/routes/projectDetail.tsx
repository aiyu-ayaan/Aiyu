// /projects/:id (port of src/app/(site)/projects/[id]/page.js).
import type { ComponentType } from 'react';
import ProjectDetailJs from '@/app/components/projects/v2/ProjectDetailV2';
import TrackView from '@/app/components/shared/TrackView';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';
import { Pending } from './site';

type Project = { _id: string; slug?: string };
type Data = { project: Project; relatedApps: unknown[]; legal: unknown[] };
// memo()-wrapped JS component: TypeScript cannot infer its props.
const ProjectDetailV2 = ProjectDetailJs as ComponentType<Data & { backHref: string }>;

export default function ProjectDetail() {
  const { page, status, loading } = usePageData<Data>();
  if (loading) return <Pending />;
  if (status === 404 || !page?.project) return <NotFound />;
  return (
    <>
      <TrackView entityType="project" entityId={page.project._id} entitySlug={page.project.slug} />
      <ProjectDetailV2 {...page} backHref="/projects" />
    </>
  );
}
