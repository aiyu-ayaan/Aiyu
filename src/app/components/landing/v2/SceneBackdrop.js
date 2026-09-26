"use client";

import React, { useRef } from 'react';
import { gsap, useGSAP } from './gsap3d';
import { motionDisabled } from './motion';

/**
 * The story film's stage, rebuilt in DOM for every home chapter: a masked
 * grid and an accent glow that drift as the chapter scrolls through, so the
 * page reads as later scenes of the same film. Sits at z-index -1 inside an
 * `isolate` section. Only its own layers move — never the section — so pins
 * inside the chapter keep working.
 */
const SceneBackdrop = ({ accent = 'var(--accent-cyan)', side = 'right' }) => {
    const ref = useRef(null);

    useGSAP(
        () => {
            const root = ref.current;
            if (!root || motionDisabled()) return;
            const section = root.parentElement;
            const glow = root.querySelector('.scene-glow');
            const grid = root.querySelector('.scene-grid');
            const scrollTrigger = { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true };
            gsap.fromTo(glow, { xPercent: side === 'right' ? 12 : -12, yPercent: 10 }, { xPercent: side === 'right' ? -12 : 12, yPercent: -10, ease: 'none', scrollTrigger });
            gsap.fromTo(grid, { y: 0 }, { y: -80, ease: 'none', scrollTrigger: { ...scrollTrigger } });
        },
        { scope: ref, dependencies: [side] }
    );

    const at = side === 'right' ? '78% 30%' : '22% 30%';

    return (
        <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div
                className="scene-grid absolute -inset-x-0 -bottom-24 top-0 will-change-transform"
                style={{
                    backgroundImage:
                        'linear-gradient(color-mix(in srgb, var(--border-secondary) 26%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 26%, transparent) 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                    maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 15%, transparent 75%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 15%, transparent 75%)',
                }}
            />
            <div
                className="scene-glow absolute inset-0 will-change-transform"
                style={{ background: `radial-gradient(45% 55% at ${at}, color-mix(in srgb, ${accent} 14%, transparent), transparent 70%)` }}
            />
        </div>
    );
};

export default SceneBackdrop;
