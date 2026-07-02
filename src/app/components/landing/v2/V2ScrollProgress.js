"use client";

import React, { useRef } from 'react';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';

/**
 * Thin scroll-progress beam pinned under the header — the storytelling
 * "you are here" cue for the v2 chapter flow. Hidden on lite / reduced-motion
 * devices (it is scroll-scrubbed and purely decorative).
 */
const V2ScrollProgress = () => {
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(scopeRef, {
        reducedMotion: prefersReducedMotion,
        extra: ({ gsap, scope, reducedMotion }) => {
            const beam = scope.querySelector('.v2-progress-beam');
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
                    },
                }
            );
        },
    });

    return (
        <div ref={scopeRef} className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]" aria-hidden="true">
            <div
                className="v2-progress-beam h-full w-full"
                style={{
                    transform: 'scaleX(0)',
                    background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
                }}
            />
        </div>
    );
};

export default V2ScrollProgress;
