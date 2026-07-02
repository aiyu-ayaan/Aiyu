"use client";

import React, { useMemo, useRef } from 'react';
import Link from 'next/link';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';

const BAND_ACCENTS = [
    'var(--accent-cyan)',
    'var(--accent-purple)',
    'var(--accent-orange)',
    'var(--accent-pink)',
];

/**
 * Tech stack chapter, v2: the skill chips hang as a 3D cloud. Each chip hinges
 * up from flat with a random-order cascade and carries its own resting depth
 * (translateZ), then the whole cloud sways gently around Y with scroll so the
 * depth separation stays visible. Static wrap-grid on lite / reduced-motion.
 */
const V2TechStack = ({ data }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    const skills = useMemo(() => {
        const list = Array.isArray(data?.skills) ? data.skills : [];
        return [...list]
            .filter((skill) => skill?.name)
            .sort((a, b) => (Number(b?.level) || 0) - (Number(a?.level) || 0))
            .slice(0, 28);
    }, [data]);

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        dependencies: [skills.length],
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const cloud = scope.querySelector('.v2-tech-cloud');
            const chips = scope.querySelectorAll('.v2-tech-chip');
            if (!cloud || !chips.length) return;

            // Cascade in from flat, landing on a per-chip resting depth so the
            // cloud isn't a single plane.
            gsap.fromTo(
                chips,
                {
                    autoAlpha: 0,
                    y: 52,
                    rotationX: -65,
                    z: -180,
                    transformOrigin: '50% 100%',
                    transformPerspective: 1000,
                },
                {
                    autoAlpha: 1,
                    y: 0,
                    rotationX: 0,
                    z: (i) => ((i % 5) - 2) * 34,
                    duration: 0.85,
                    ease: 'power3.out',
                    stagger: { each: 0.04, from: 'random' },
                    scrollTrigger: {
                        trigger: cloud,
                        start: 'top 88%',
                        toggleActions: 'play none none reverse',
                    },
                }
            );

            // Scrubbed sway: the cloud yaws slightly as it crosses the viewport,
            // letting the chip depths parallax against each other.
            gsap.fromTo(
                cloud,
                { rotationY: -7, rotationX: 3, transformPerspective: 1400 },
                {
                    rotationY: 7,
                    rotationX: -3,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: cloud,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 1,
                    },
                }
            );
        },
    });

    if (skills.length === 0) return null;

    return (
        <section ref={sectionRef} className="chapter-section" style={{ backgroundColor: 'transparent' }}>
            <div
                data-v2-depth="-0.35"
                className="pointer-events-none absolute right-8 top-8 h-48 w-48 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 12%, transparent), transparent 70%)' }}
            />

            <div
                data-v2="float"
                className="chapter-panel glass-panel relative mx-auto flex w-full max-w-[95%] flex-col justify-center p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
            >
                <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div data-v2="door-left" className="max-w-2xl">
                        <p className="eyebrow mb-3">Tech Stack</p>
                        <h2 className="headline-section">A toolbox with real depth.</h2>
                        <p className="subcopy mt-4">
                            {skills.length} skills, ranked by fluency — hanging in 3D and drifting as you scroll.
                        </p>
                    </div>
                    <Link href="/about-me" data-v2="door-right" className="pill-ghost self-start lg:self-auto">
                        Full Skill Breakdown
                    </Link>
                </div>

                <div style={{ perspective: '1400px' }}>
                    <div
                        className="v2-tech-cloud flex flex-wrap items-center justify-center gap-3 sm:gap-4"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {skills.map((skill, index) => {
                            const accent = BAND_ACCENTS[index % BAND_ACCENTS.length];
                            const level = Math.max(0, Math.min(100, Number(skill.level) || 0));
                            return (
                                <span
                                    key={`${skill.name}-${index}`}
                                    className="v2-tech-chip glass-tile inline-flex cursor-default items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors duration-200"
                                    style={{
                                        color: 'var(--text-primary)',
                                        borderColor: `color-mix(in srgb, ${accent} 28%, transparent)`,
                                        fontSize: index < 6 ? '1rem' : undefined,
                                    }}
                                >
                                    {skill.name}
                                    {level > 0 && (
                                        <span
                                            className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold tabular-nums"
                                            style={{
                                                color: accent,
                                                backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                                            }}
                                        >
                                            {level}%
                                        </span>
                                    )}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default V2TechStack;
