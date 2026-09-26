"use client";

import React, { useMemo, useRef } from 'react';
import Link from 'next/link';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import SceneBackdrop from './SceneBackdrop';
import { Marquee } from './motion';
import TermHead from './TermHead';

const ACCENTS = ['var(--accent-cyan)', 'var(--accent-purple)', 'var(--accent-orange)', 'var(--accent-pink)'];
const TOP = 6;

const slug = (name) => String(name).toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim().replace(/[^a-z0-9.+#]+/g, '-');

/**
 * Chapter 03 — the stack as `pacman -Qe`. Every skill rides two marquees
 * that surge with scroll velocity; the strongest ones are listed as
 * installed packages whose fluency bars fill as they scroll in. Data is the
 * About skills list, sorted by level.
 */
const V2TechStack = ({ data }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    const skills = useMemo(() => {
        const list = Array.isArray(data?.skills) ? data.skills : [];
        return [...list]
            .filter((skill) => skill?.name)
            .sort((a, b) => (Number(b?.level) || 0) - (Number(a?.level) || 0));
    }, [data]);

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        dependencies: [skills.length],
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            scope.querySelectorAll('.pkg-row').forEach((row) => {
                const bar = row.querySelector('.pkg-bar');
                const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%', toggleActions: 'play none none none' } });
                tl.fromTo(row, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' });
                if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.out', transformOrigin: 'left center' }, 0.1);
            });
        },
    });

    if (skills.length === 0) return null;

    const half = Math.ceil(skills.length / 2);
    const rows = [skills.slice(0, half), skills.slice(half)].filter((row) => row.length);

    return (
        <section ref={sectionRef} className="relative isolate overflow-hidden py-20 sm:py-28" style={{ borderTop: '1px solid var(--hairline)' }}>
            <SceneBackdrop accent="var(--accent-orange)" side="right" />
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
                <TermHead
                    path="~"
                    command="pacman -Qe"
                    title="A toolbox with real depth."
                    kicker={`${skills.length} packages installed, sorted by how often they get used.`}
                    accent="var(--accent-orange)"
                />
            </div>

            <div className="space-y-4 py-4">
                {rows.map((row, rowIndex) => (
                    <Marquee key={rowIndex} speed={rowIndex ? 48 : 40} reverse={rowIndex === 1} itemClassName="gap-4 pr-4">
                        {row.map((skill, index) => {
                            const accent = ACCENTS[(index + rowIndex) % ACCENTS.length];
                            return (
                                <span
                                    key={`${skill.name}-${index}`}
                                    className="inline-flex shrink-0 items-center gap-3 whitespace-nowrap rounded-full border px-5 py-2.5 font-mono text-sm sm:text-base"
                                    style={{
                                        color: 'var(--text-primary)',
                                        borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
                                        backgroundColor: `color-mix(in srgb, ${accent} 7%, var(--bg-secondary))`,
                                    }}
                                >
                                    <span style={{ color: accent }}>●</span>
                                    {skill.name}
                                </span>
                            );
                        })}
                    </Marquee>
                ))}
            </div>

            <div className="mx-auto mt-12 w-full max-w-7xl px-6 lg:px-10">
                <div className="rounded-2xl border p-5 font-mono text-sm sm:p-8" style={{ borderColor: 'var(--hairline)', backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 70%, transparent)' }}>
                    <p className="mb-5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--status-success)' }}>$</span> pacman -Qi $(pacman -Qeq | head -{TOP})
                    </p>
                    <ul className="space-y-4">
                        {skills.slice(0, TOP).map((skill, index) => {
                            const level = Math.max(0, Math.min(100, Number(skill.level) || 0));
                            const accent = ACCENTS[index % ACCENTS.length];
                            return (
                                <li key={skill.name} className="pkg-row grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,16rem)_1fr_3rem] sm:gap-6">
                                    <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                                        <span style={{ color: accent }}>local/</span>
                                        {slug(skill.name)}
                                    </span>
                                    <span className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--hairline)' }}>
                                        <span className="pkg-bar block h-full rounded-full" style={{ width: `${level}%`, backgroundColor: accent }} />
                                    </span>
                                    <span className="tabular-nums sm:text-right" style={{ color: 'var(--text-tertiary)' }}>
                                        {level > 0 ? `${level}%` : '—'}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <p data-v2="rise" className="mt-10 font-mono text-sm">
                    <Link href="/about-me" className="v2-link-draw" style={{ color: 'var(--text-secondary)' }}>
                        → full skill breakdown
                    </Link>
                </p>
            </div>
        </section>
    );
};

export default V2TechStack;
