"use client";

import React, { useRef } from 'react';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import V2ChapterHead from './V2ChapterHead';

const quickLinks = [
    { href: '#v2-status', label: 'mission-control' },
    { href: '#v2-tech', label: 'tech-stack' },
    { href: '#v2-about', label: 'about' },
    { href: '#v2-showcase', label: 'focus-areas' },
    { href: '#v2-projects', label: 'projects' },
    { href: '#v2-blogs', label: 'writing' },
];

/**
 * Chapter 01 — Telemetry. A full-bleed instrument strip: four oversized
 * counters separated by hairlines pivot up line-by-line, quick links read as
 * a mono command row, and the latest picks print like log output. No panels —
 * the layout is rules, type, and air.
 */
const V2Snapshot = ({ stats = [], recentProjectNames = [], recentBlogTitles = [] }) => {
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(scopeRef, { reducedMotion: prefersReducedMotion });

    return (
        <section ref={scopeRef} className="relative overflow-hidden py-20 sm:py-28" style={{ borderTop: '1px solid var(--hairline)' }}>
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10" style={{ perspective: '1400px' }}>
                <V2ChapterHead
                    index="01"
                    eyebrow="Telemetry"
                    title="The numbers, live."
                    accent="var(--accent-cyan)"
                />

                <div
                    data-v2-group
                    data-v2-stagger="0.1"
                    className="grid grid-cols-2 lg:grid-cols-4"
                    style={{ borderTop: '1px solid var(--hairline)' }}
                >
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
                            <p
                                className="text-6xl font-black leading-none tracking-tighter tabular-nums sm:text-8xl"
                                style={{ color: 'var(--text-bright)' }}
                            >
                                <span data-counter={item.value}>{item.value}</span>
                            </p>
                            <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.25em]" style={{ color: item.accent }}>
                                {item.label}
                            </p>
                        </div>
                    ))}
                </div>

                <div data-v2-group data-v2-stagger="0.05" className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-sm">
                    <span data-v2="rise" style={{ color: 'var(--text-muted)' }}>jump to →</span>
                    {quickLinks.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            data-v2="rise"
                            className="group cursor-pointer transition-colors duration-200"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <span style={{ color: 'var(--accent-cyan)' }}>[</span>
                            <span className="mx-1 group-hover:underline underline-offset-4">{item.label}</span>
                            <span style={{ color: 'var(--accent-cyan)' }}>]</span>
                        </a>
                    ))}
                </div>

                {(recentProjectNames.length > 0 || recentBlogTitles.length > 0) && (
                    <div className="mt-14 grid grid-cols-1 gap-10 font-mono text-sm md:grid-cols-2">
                        <div data-v2="door-left">
                            <p className="mb-3 text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                                $ latest --projects
                            </p>
                            {recentProjectNames.length ? recentProjectNames.map((name) => (
                                <p key={name} className="mb-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    <span style={{ color: 'var(--accent-purple)' }}>▸ </span>{name}
                                </p>
                            )) : (
                                <p style={{ color: 'var(--text-tertiary)' }}>▸ shipping soon…</p>
                            )}
                        </div>
                        <div data-v2="door-right">
                            <p className="mb-3 text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                                $ latest --writing
                            </p>
                            {recentBlogTitles.length ? recentBlogTitles.map((title) => (
                                <p key={title} className="mb-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    <span style={{ color: 'var(--accent-pink)' }}>▸ </span>{title}
                                </p>
                            )) : (
                                <p style={{ color: 'var(--text-tertiary)' }}>▸ drafts in progress…</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default V2Snapshot;
