'use client';

import dynamic from 'next/dynamic';

const WorkInProgressComponent = dynamic(() => import('../../components/shared/WorkInProgressComponent'), {
  ssr: false,
});

export default function WorkInProgressShell() {
  return <WorkInProgressComponent />;
}
