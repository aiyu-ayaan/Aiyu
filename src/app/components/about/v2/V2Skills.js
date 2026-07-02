"use client";

import React, { useMemo, useRef, useState } from 'react';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';
import V2ChapterHead from '../../landing/v2/V2ChapterHead';

const BAND_ACCENTS = {
    Expert: 'var(--accent-cyan)',
    Advanced: 'var(--accent-purple)',
    Intermediate: 'var(--accent-orange)',
    Fundamentals: 'var(--accent-pink)',
};

const getSkillBand = (level = 0) => {
    if (level >= 85) return 'Expert';
    if (level >= 70) return 'Advanced';
    if (level >= 55) return 'Intermediate';
    return 'Fundamentals';
};

/**
 * Skills chapter: fluency as an instrument panel. Each skill is a hairline
 * ledger row whose meter fills on entry (staggered scaleX), with the band
 * annotated in mono. Rows hinge in from alternating edges; the full list
 * expands behind a mono toggle.
 */
const V2Skills = ({ skills = [] }) => {
    const sectionRef = useRef(null);
    const [expanded, setExpanded] = useState(false);
    const { prefersReducedMotion } = useDevicePerformance();

    const sortedSkills = useMemo(
        () => [...skills].filter((skill) => skill?.name).sort((a, b) => (Number(b?.level) || 0) - (Number(a?.level) || 0)),
        [skills]
    );
    const visibleSkills = expanded ? sortedSkills : sortedSkills.slice(0, 10);

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        dependencies: [visibleSkills.length],
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const meters = scope.querySelectorAll('.v2-skill-meter');
            if (!meters.length) return;

            gsap.fromTo(
                meters,
                { scaleX: 0, transformOrigin: 'left center' },
                {
                    scaleX: 1,
                    duration: 1,
                    ease: 'power3.out',
                    stagger: 0.06,
                    scrollTrigger: {
                        trigger: scope.querySelector('.v2-skill-list'),
                        start: 'top 82%',
                        toggleActions: 'play none none reverse',
                    },
                }
            );
        },
    });

    if (sortedSkills.length === 0) return null;

    return (
        <section
            ref={sectionRef}
            id="v2a-skills"
            className="relative overflow-hidden py-20 sm:py-28"
            style={{ borderTop: '1px solid var(--hairline)' }}
        >
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
                <V2ChapterHead
                    index="04"
                    eyebrow="Skills"
                    title="Fluency, measured."
                    kicker={`${sortedSkills.length} technical skills, ranked and banded by depth of use.`}
                    accent="var(--accent-orange)"
                />

                <div className="v2-skill-list" style={{ borderTop: '1px solid var(--hairline)', perspective: '1600px' }}>
                    {visibleSkills.map((skill, index) => {
                        const level = Math.max(0, Math.min(100, Number(skill.level) || 0));
                        const band = getSkillBand(level);
                        const accent = BAND_ACCENTS[band];
                        return (
                            <div
                                key={skill.name}
                                data-v2={index % 2 === 0 ? 'door-left' : 'door-right'}
                                className="grid grid-cols-12 items-center gap-3 py-5 sm:gap-4 sm:py-6"
                                style={{ borderBottom: '1px solid var(--hairline)' }}
                            >
                                <span className="col-span-2 font-mono text-xs sm:col-span-1" style={{ color: 'var(--text-muted)' }}>
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="col-span-10 text-lg font-semibold tracking-tight sm:col-span-4 sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
                                    {skill.name}
                                </span>
                                <div className="col-span-10 col-start-3 sm:col-span-5 sm:col-start-6">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--text-muted) 14%, transparent)' }}>
                                        <div
                                            className="v2-skill-meter h-full rounded-full"
                                            style={{ width: `${level}%`, backgroundColor: accent }}
                                        />
                                    </div>
                                </div>
                                <span className="col-span-10 col-start-3 font-mono text-xs uppercase tracking-[0.15em] sm:col-span-2 sm:col-start-11 sm:text-right" style={{ color: accent }}>
                                    {band} · {level}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {sortedSkills.length > 10 && (
                    <button
                        type="button"
                        onClick={() => setExpanded((prev) => !prev)}
                        className="mt-10 cursor-pointer font-mono text-sm underline-offset-4 hover:underline"
                        style={{ color: 'var(--accent-orange)' }}
                    >
                        {expanded ? '→ collapse list' : `→ show all ${sortedSkills.length} skills`}
                    </button>
                )}
            </div>
        </section>
    );
};

export default V2Skills;
