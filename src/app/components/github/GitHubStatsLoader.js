'use client';

import { useEffect, useState } from 'react';
import GitHubStatsClient from './GitHubStatsClient';
import { GitHubPageSkeleton } from '../shared/skeletons/PublicPageSkeletons';

export default function GitHubStatsLoader() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/github/stats', { signal: controller.signal });

                const result = await res.json();
                if (!res.ok) {
                    setData({
                        success: false,
                        error: result?.error || `API Error: ${res.status}`,
                    });
                    return;
                }

                setData(result);
            } catch (error) {
                if (error.name === 'AbortError') return;
                setData({
                    success: false,
                    error: 'Failed to load stats',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        return () => controller.abort();
    }, []);

    if (loading) {
        return <GitHubPageSkeleton />;
    }

    return <GitHubStatsClient data={data || { success: false, error: 'No data received' }} />;
}
