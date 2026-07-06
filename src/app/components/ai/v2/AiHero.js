"use client";

import React, { useRef } from 'react';
import useDevicePerformance from '@/app/hooks/useDevicePerformance';
import { useV2Fx } from '@/app/components/landing/v2/gsap3d';

/**
 * AI Hub opening chapter. Full-bleed editorial hero — a mono eyebrow, an
 * oversized headline that pivots up line-by-line, a lede, and a mono row of
 * capability tags reading like a command manifest.
 */
export default function AiHero({ section }) {
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();
    useV2Fx(scopeRef, { reducedMotion: prefersReducedMotion });

    const accent = section.accent || 'var(--accent-cyan)';
    const tags = Array.isArray(section.data?.tags) ? section.data.tags : [];

    return (
        <section ref={scopeRef} className="relative overflow-hidden pb-16 pt-24 sm:pb-24 sm:pt-36">
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10" style={{ perspective: '1400px' }}>
                <p
                    data-v2="line"
                    className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.4em]"
                    style={{ color: accent }}
                >
                    ● {section.eyebrow || 'AI Hub'}
                </p>

                <h1
                    data-v2="line"
                    className="max-w-5xl text-5xl font-black leading-[0.98] tracking-tighter sm:text-7xl lg:text-8xl"
                    style={{ color: 'var(--text-bright)' }}
                >
                    {section.title}
                </h1>

                {section.subtitle && (
                    <p
                        data-v2="rise"
                        className="mt-8 max-w-2xl text-lg leading-relaxed sm:text-xl"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        {section.subtitle}
                    </p>
                )}

                {tags.length > 0 && (
                    <div
                        data-v2-group
                        data-v2-stagger="0.06"
                        className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-3 font-mono text-sm"
                    >
                        <span data-v2="rise" style={{ color: 'var(--text-muted)' }}>
                            capabilities →
                        </span>
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                data-v2="rise"
                                className="rounded-full px-3 py-1.5 text-[0.8rem]"
                                style={{
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--hairline-strong)',
                                    background: 'var(--surface-glass)',
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
