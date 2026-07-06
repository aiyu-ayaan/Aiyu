"use client";

import React, { useRef } from 'react';
import useDevicePerformance from '@/app/hooks/useDevicePerformance';
import { useV2Fx } from '@/app/components/landing/v2/gsap3d';
import V2ChapterHead from '@/app/components/landing/v2/V2ChapterHead';

/**
 * Common wrapper for every AI Hub chapter: owns the GSAP FX scope + the shared
 * editorial chapter header, then renders section-specific content as children.
 * Keeping the scope here means each lazily-mounted section animates on its own
 * without a page-wide controller.
 */
export default function AiSectionShell({ index, section, children }) {
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();
    useV2Fx(scopeRef, { reducedMotion: prefersReducedMotion });

    return (
        <section
            ref={scopeRef}
            className="relative overflow-hidden py-20 sm:py-28"
            style={{ borderTop: '1px solid var(--hairline)' }}
        >
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10" style={{ perspective: '1400px' }}>
                <V2ChapterHead
                    index={index}
                    eyebrow={section.eyebrow || 'AI'}
                    title={section.title}
                    kicker={section.subtitle}
                    accent={section.accent || 'var(--accent-cyan)'}
                />
                {children}
            </div>
        </section>
    );
}
