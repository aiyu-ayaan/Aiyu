"use client";

import { useEffect, useState } from 'react';
import GitHubV2 from './GitHubV2';

/**
 * Client fetcher for /v2/github — same /api/github/stats call as the classic
 * GitHubStatsLoader, but with a mono terminal-style loading line instead of
 * the glass skeleton, matching the v2 voice.
 */
export default function GitHubV2Loader() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/github/stats', { signal: controller.signal });
                const result = await res.json();
                if (!res.ok) {
                    setData({ success: false, error: result?.error || `API Error: ${res.status}` });
                    return;
                }
                setData(result);
            } catch (error) {
                if (error.name === 'AbortError') return;
                setData({ success: false, error: 'Failed to load stats' });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        return () => controller.abort();
    }, []);

    if (loading) {
        return (
            <div className="relative overflow-hidden">
                <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                    <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-purple)' }}>
                        ~/github — open source telemetry
                    </p>
                    <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        $ gh stats --fetch
                        <span className="ml-2 inline-block animate-pulse">▋</span>
                    </p>
                </div>
            </div>
        );
    }

    return <GitHubV2 data={data || { success: false, error: 'No data received' }} />;
}
