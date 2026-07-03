import WorkInProgressShell from './WorkInProgressShell';
import { getSiteUrl } from '@/lib/siteUrl';
import { getConfigData } from '@/lib/dataFetchers';

export async function generateMetadata() {
  const config = await getConfigData();
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';

  return {
    title: `${baseName} | Work In Progress`,
    description: 'This page is currently under development.',
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${getSiteUrl()}/work-in-progress`,
    },
  };
}

export default function WorkInProgressPage() {
  return <WorkInProgressShell />;
}