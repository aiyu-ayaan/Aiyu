"use client";

import { useEffect } from 'react';
import { HomePageSkeleton } from '../components/shared/skeletons/PublicPageSkeletons';

export default function SiteLoading() {
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    return <HomePageSkeleton />;
}
