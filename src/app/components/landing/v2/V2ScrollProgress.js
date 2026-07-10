"use client";

import React, { useRef } from 'react';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';

/**
 * Scroll telemetry pinned under the header: a thin progress beam plus a mono
 * HUD readout (scroll depth as a percentage) in the top-right corner — the
 * "you are here" cue for the v2 chapter flow, styled as instrument output.
 * Hidden on lite / reduced-motion devices (scroll-scrubbed, purely decorative).
 */
const V2ScrollProgress = () => {
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(scopeRef, {
        reducedMotion: prefersReducedMotion,
        extra: ({ gsap, scope, reducedMotion }) => {
            const beam = scope.querySelector('.v2-progress-beam');
            const readout = scope.querySelector('.v2-progress-readout');
            if (!beam) return;
            if (reducedMotion) {
                scope.style.display = 'none';
                return;
            }
            gsap.fromTo(
                beam,
                { scaleX: 0 },
                {
                    scaleX: 1,
                    transformOrigin: 'left center',
                    ease: 'none',
                    scrollTrigger: {
                        trigger: document.documentElement,
                        start: 'top top',
                        end: 'max',
                        scrub: 0.4,
                        onUpdate: (self) => {
                            if (!readout) return;
                            const pct = Math.round(self.progress * 100);
                            const filled = Math.round(self.progress * 8);
                            readout.textContent = `[${'▓'.repeat(filled)}${'░'.repeat(8 - filled)}] ${String(pct).padStart(3, ' ')}%`;
                        },
                    },
                }
            );
        },
    });

    return (
        <div ref={scopeRef} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
            <div className="h-[3px]">
                <div
                    className="v2-progress-beam h-full w-full"
                    style={{
                        transform: 'scaleX(0)',
                        background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
                    }}
                />
            </div>
            {/* Bottom-right: the fixed header owns the top strip. */}
            <p
                className="v2-progress-readout absolute bottom-3 right-4 hidden whitespace-pre font-mono text-[0.65rem] tabular-nums md:block"
                style={{ color: 'var(--text-muted)' }}
            >
                {'[░░░░░░░░]   0%'}
            </p>
        </div>
    );
};

export default V2ScrollProgress;
