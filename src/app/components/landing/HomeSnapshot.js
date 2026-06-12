"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { useSectionFx } from '../shared/gsapScroll';

const quickLinks = [
    { href: '#home-status', label: 'Mission Control' },
    { href: '#home-tech', label: 'Tech Stack' },
    { href: '#home-about', label: 'About Highlights' },
    { href: '#home-projects', label: 'Featured Projects' },
    { href: '#home-blogs', label: 'Recent Blogs' },
];

const HomeSnapshot = ({ stats = [], recentProjectNames = [], recentBlogTitles = [] }) => {
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useSectionFx(scopeRef, { reducedMotion: prefersReducedMotion });

    return (
        <div ref={scopeRef} style={{ perspective: '1400px' }}>
            <div
                data-reveal="tilt"
                className="mx-auto w-full max-w-[95%] lg:max-w-[80%] rounded-3xl border p-5 sm:p-7"
                style={{
                    background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                    boxShadow: '0 16px 36px var(--shadow-sm)',
                    transformStyle: 'preserve-3d',
                }}
            >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="mb-2 inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--accent-cyan) 42%, var(--border-secondary))',
                                color: 'var(--accent-cyan)',
                            }}
                        >
                            Portfolio Snapshot
                        </p>
                        <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
                            Explore Highlights Across Home, Projects, and Writing
                        </h2>
                    </div>
                    <Link
                        href="/projects"
                        className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors duration-200"
                        style={{
                            borderColor: 'var(--accent-cyan)',
                            color: 'var(--accent-cyan)',
                            backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 9%, transparent)',
                        }}
                    >
                        Browse Full Projects
                    </Link>
                </div>

                <div data-reveal-group className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {stats.map((item) => (
                        <div
                            key={item.label}
                            data-reveal="flip"
                            className="rounded-xl border p-3"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
                            }}
                        >
                            <p className="text-2xl font-bold" style={{ color: item.accent }}>
                                <span data-counter={item.value}>{item.value}</span>
                            </p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                        </div>
                    ))}
                </div>

                <div data-reveal-group data-reveal-stagger="0.05" className="mt-5 flex flex-wrap gap-2">
                    {quickLinks.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            data-reveal="rise"
                            className="rounded-lg border px-3 py-2 text-sm font-medium"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)',
                            }}
                        >
                            {item.label}
                        </a>
                    ))}
                </div>

                {(recentProjectNames.length > 0 || recentBlogTitles.length > 0) && (
                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div data-reveal="swing" className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)' }}>
                            <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Project Picks</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {recentProjectNames.length ? recentProjectNames.join(' • ') : 'Projects will appear here soon.'}
                            </p>
                        </div>
                        <div data-reveal="swing-right" className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)' }}>
                            <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Latest Writing</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {recentBlogTitles.length ? recentBlogTitles.join(' • ') : 'Blog updates coming soon.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeSnapshot;
