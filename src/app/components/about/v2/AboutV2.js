"use client";

import React, { useMemo, useRef } from 'react';
import V2AboutHero from './V2AboutHero';
import V2CharacterSheet from './V2CharacterSheet';
import V2Skills from './V2Skills';
import V2Timeline from './V2Timeline';
import V2ScrollProgress from '../../landing/v2/V2ScrollProgress';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';
import V2ChapterHead from '../../landing/v2/V2ChapterHead';

/**
 * /v2/about-me — the v1 about page's sections (summary, stats, profile,
 * experience, skills, education, certifications) recast in the v2
 * editorial-depth language: numbered full-bleed chapters, hairline rules,
 * mono annotations, and scroll-scrubbed 3D set pieces.
 */

const STAT_ACCENTS = ['var(--accent-orange)', 'var(--accent-cyan)', 'var(--accent-purple)', 'var(--accent-pink)'];

const V2AboutStats = ({ stats }) => {
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();
    useV2Fx(scopeRef, { reducedMotion: prefersReducedMotion });

    return (
        <section
            ref={scopeRef}
            id="v2a-stats"
            className="relative overflow-hidden py-20 sm:py-28"
            style={{ borderTop: '1px solid var(--hairline)' }}
        >
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10" style={{ perspective: '1400px' }}>
                <V2ChapterHead index="01" eyebrow="Telemetry" title="The record so far." accent="var(--accent-cyan)" />

                <div data-v2-group data-v2-stagger="0.1" className="grid grid-cols-2 lg:grid-cols-4" style={{ borderTop: '1px solid var(--hairline)' }}>
                    {stats.map((item, index) => (
                        <div
                            key={item.label}
                            data-v2="flip-x"
                            className="relative px-2 py-10 sm:px-6 sm:py-14"
                            style={{
                                borderRight: index % 2 === 0 ? '1px solid var(--hairline)' : undefined,
                                borderBottom: '1px solid var(--hairline)',
                            }}
                        >
                            <p className="text-6xl font-black leading-none tracking-tighter tabular-nums sm:text-8xl" style={{ color: 'var(--text-bright)' }}>
                                <span data-counter={item.value}>{item.value}</span>
                            </p>
                            <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.25em]" style={{ color: STAT_ACCENTS[index % STAT_ACCENTS.length] }}>
                                {item.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const AboutV2 = ({ data }) => {
    const {
        name = 'Developer',
        roles = [],
        professionalSummary = 'I build software with focus, curiosity, and care for the user experience.',
        skills = [],
        experiences = [],
        education = [],
        certifications = [],
    } = data || {};

    const stats = [
        { label: 'Professional Roles', value: experiences.length },
        { label: 'Technical Skills', value: skills.length },
        { label: 'Education Milestones', value: education.length },
        { label: 'Certifications', value: certifications.length },
    ];

    const experienceItems = useMemo(
        () => experiences.map((exp) => ({
            heading: exp?.role || 'Role',
            subheading: exp?.company,
            meta: exp?.duration || '',
            body: exp?.description,
        })),
        [experiences]
    );

    const educationItems = useMemo(
        () => education.map((edu) => ({
            heading: edu?.degree || 'Degree',
            subheading: edu?.institution,
            meta: edu?.duration || '',
            metaSub: edu?.cgpa ? `CGPA ${edu.cgpa}` : undefined,
        })),
        [education]
    );

    const certificationItems = useMemo(
        () => certifications.map((cert) => ({
            heading: cert?.name || 'Certification',
            subheading: cert?.issuer,
            meta: cert?.date || '',
        })),
        [certifications]
    );

    return (
        <div className="relative overflow-hidden" style={{ color: 'var(--text-primary)' }}>
            <V2ScrollProgress />

            <V2AboutHero name={name} roles={roles} summary={professionalSummary} />

            <V2AboutStats stats={stats} />

            <div id="v2a-profile">
                <V2CharacterSheet data={data} />
            </div>

            <V2Timeline
                id="v2a-experience"
                index="03"
                eyebrow="Experience"
                title="Roles that shaped the work."
                accent="var(--accent-cyan)"
                items={experienceItems}
                emptyLabel="first quest loading…"
            />

            <V2Skills skills={skills} />

            <V2Timeline
                id="v2a-education"
                index="05"
                eyebrow="Education"
                title="The formal foundation."
                accent="var(--accent-purple)"
                items={educationItems}
                emptyLabel="records sealed…"
            />

            <V2Timeline
                id="v2a-certifications"
                index="06"
                eyebrow="Certifications"
                title="Stamped and verified."
                accent="var(--accent-pink)"
                items={certificationItems}
                emptyLabel="badges pending…"
            />
        </div>
    );
};

export default AboutV2;
