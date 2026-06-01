import dynamic from 'next/dynamic';
import { getSiteUrl } from '@/lib/siteUrl';
import { getConfigData } from '@/lib/dataFetchers';

const WorkInProgressComponent = dynamic(() => import('../../components/shared/WorkInProgressComponent'), {
  ssr: false,
});

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
  return <WorkInProgressComponent />;
}