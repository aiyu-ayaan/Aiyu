"use client";

import { useEffect } from 'react';

export default function SiteLoading() {
    useEffect(() => {
        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;

        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
        };
    }, []);

    return (
        <div className="min-h-[60vh] p-4 lg:p-8">
            <div
                className="mx-auto max-w-6xl overflow-hidden rounded-3xl border"
                style={{
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                    background:
                        'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 90%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
                    boxShadow: '0 18px 40px var(--shadow-sm)',
                }}
            >
                <div
                    className="h-1.5 w-full animate-pulse"
                    style={{
                        background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple), var(--accent-pink), var(--accent-cyan))',
                        backgroundSize: '200% 100%',
                    }}
                />
                <div className="space-y-4 p-6 sm:p-8">
                    <div
                        className="h-8 w-1/3 animate-pulse rounded-lg"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 78%, transparent)' }}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div
                            className="h-36 animate-pulse rounded-2xl border"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--border-secondary) 62%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 74%, transparent)',
                            }}
                        />
                        <div
                            className="h-36 animate-pulse rounded-2xl border"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--border-secondary) 62%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 74%, transparent)',
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
