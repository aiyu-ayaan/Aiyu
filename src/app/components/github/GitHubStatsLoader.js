'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GitHubStatsClient from './GitHubStatsClient';

function GitHubLoadingState() {
    return (
        <div className="min-h-screen flex items-center justify-center px-6">
            <div className="w-full max-w-md text-center">
                <h2 className="text-lg font-semibold mb-4">Loading GitHub Stats...</h2>
                <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--border-secondary)' }}
                >
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
                    Fetching latest repositories and contributions
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
