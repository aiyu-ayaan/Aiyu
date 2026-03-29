'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GitHubStatsClient from './GitHubStatsClient';

function GitHubLoadingState() {
    return (
        <div className="min-h-screen p-4 lg:p-8">
            <div
                className="mx-auto mt-20 w-full max-w-3xl rounded-2xl border p-8 text-center"
                style={{
                    background:
                        'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                }}
            >
                <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Loading GitHub Dashboard...
                </h2>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-secondary)' }}>
                    <motion.div
                        className="h-full w-1/3 rounded-full"
                        style={{
                            background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                            boxShadow: '0 0 10px var(--accent-cyan)',
                        }}
                        animate={{ x: ['-120%', '340%'] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </div>
                <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Fetching repositories, contributions, and activity
                </p>
            </div>
        </div>
    );
}

export default function GitHubStatsLoader() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/github/stats', {
                    cache: 'no-store',
                    signal: controller.signal,
                });

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
        return <GitHubLoadingState />;
    }

    return <GitHubStatsClient data={data || { success: false, error: 'No data received' }} />;
}
