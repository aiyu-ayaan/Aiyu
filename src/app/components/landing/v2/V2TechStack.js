"use client";

import React, { useMemo, useRef } from 'react';
import Link from 'next/link';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import V2ChapterHead from './V2ChapterHead';

const BAND_ACCENTS = [
    'var(--accent-cyan)',
    'var(--accent-purple)',
    'var(--accent-orange)',
    'var(--accent-pink)',
];

/**
 * Chapter 03 — Stack. Full-bleed 3D chip cloud floating over the open page:
 * chips cascade in from flat in random order, each landing on its own resting
 * depth, then the whole cloud yaws with scroll so the depths parallax. The
 * top skills render bigger so hierarchy survives the drift.
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

            gsap.fromTo(
                cloud,
                { rotationY: -8, rotationX: 4, transformPerspective: 1400 },
                {
                    rotationY: 8,
                    rotationX: -4,
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
        <section ref={sectionRef} className="relative overflow-hidden py-20 sm:py-28" style={{ borderTop: '1px solid var(--hairline)' }}>
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
                <V2ChapterHead
                    index="03"
                    eyebrow="Tech Stack"
                    title="A toolbox with real depth."
                    kicker={`${skills.length} skills ranked by fluency — floating in 3D, drifting as you scroll.`}
                    accent="var(--accent-orange)"
                />

                <div style={{ perspective: '1400px' }}>
                    <div
                        className="v2-tech-cloud flex flex-wrap items-center justify-center gap-3 py-6 sm:gap-4"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {skills.map((skill, index) => {
                            const accent = BAND_ACCENTS[index % BAND_ACCENTS.length];
                            const level = Math.max(0, Math.min(100, Number(skill.level) || 0));
                            const isTop = index < 6;
                            return (
                                <span
                                    key={`${skill.name}-${index}`}
                                    className="v2-tech-chip inline-flex cursor-default items-center gap-2.5 rounded-full border font-mono font-semibold transition-colors duration-200"
                                    style={{
                                        padding: isTop ? '0.8rem 1.4rem' : '0.55rem 1.05rem',
                                        fontSize: isTop ? '1.05rem' : '0.82rem',
                                        color: 'var(--text-primary)',
                                        borderColor: `color-mix(in srgb, ${accent} ${isTop ? 55 : 30}%, transparent)`,
                                        backgroundColor: `color-mix(in srgb, ${accent} ${isTop ? 10 : 5}%, var(--bg-secondary))`,
                                        boxShadow: isTop ? `0 16px 40px -22px color-mix(in srgb, ${accent} 60%, transparent)` : undefined,
                                    }}
                                >
                                    {skill.name}
                                    {level > 0 && (
                                        <span className="text-[0.65rem] font-bold tabular-nums" style={{ color: accent }}>
                                            {level}
                                        </span>
                                    )}
                                </span>
                            );
                        })}
                    </div>
                </div>

                <p data-v2="rise" className="mt-10 text-center font-mono text-sm">
                    <Link href="/about-me" className="underline-offset-4 hover:underline" style={{ color: 'var(--text-secondary)' }}>
                        → full skill breakdown
                    </Link>
                </p>
            </div>
        </section>
    );
};

export default V2TechStack;
