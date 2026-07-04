"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getVersionedPath } from '@/lib/siteVersion';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { useSectionFx } from '../shared/gsapScroll';

const quickLinks = [
    { href: '#home-status', label: 'Mission Control' },
    { href: '#home-tech', label: 'Tech Stack' },
    { href: '#home-about', label: 'About Highlights' },
    { href: '#home-showcase', label: 'Focus Areas' },
    { href: '#home-projects', label: 'Featured Projects' },
    { href: '#home-blogs', label: 'Recent Blogs' },
];

const HomeSnapshot = ({ stats = [], recentProjectNames = [], recentBlogTitles = [] }) => {
    const pathname = usePathname();
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useSectionFx(scopeRef, { reducedMotion: prefersReducedMotion });

    return (
        <div ref={scopeRef} style={{ perspective: '1400px' }}>
            <div
                data-reveal="tilt"
                className="chapter-panel glass-panel mx-auto flex w-full max-w-[95%] flex-col justify-center p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
                style={{ transformStyle: 'preserve-3d' }}
            >
                <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div data-reveal="left" className="max-w-2xl">
                        <p className="eyebrow mb-3">Portfolio Snapshot</p>
                        <h2 className="headline-section">
                            Highlights across home, projects, and writing.
                        </h2>
                    </div>
                    <Link href={getVersionedPath(pathname, "/projects")} data-reveal="right" className="pill-ghost self-start lg:self-auto">
                        Browse Full Projects
                    </Link>
                </div>

                <div data-reveal-auto data-reveal-stagger="0.07" className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-5">
                    {stats.map((item) => (
                        <div
                            key={item.label}
                            className="glass-tile p-5 sm:p-6"
                        >
                            <p className="text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: 'var(--text-bright)' }}>
                                <span data-counter={item.value}>{item.value}</span>
                            </p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                        </div>
                    ))}
                </div>

                <div data-reveal-group data-reveal-stagger="0.05" className="mt-10 flex flex-wrap gap-2.5">
                    {quickLinks.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            data-reveal="rise"
                            className="rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-300"
                            style={{
                                borderColor: 'var(--hairline)',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'var(--surface-tile)',
                            }}
                        >
                            {item.label}
                        </a>
                    ))}
                </div>

                {(recentProjectNames.length > 0 || recentBlogTitles.length > 0) && (
                    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div data-reveal="swing" className="glass-tile p-6 sm:p-7">
                            <p className="eyebrow mb-2 !text-xs">Project Picks</p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {recentProjectNames.length ? recentProjectNames.join(' · ') : 'Projects will appear here soon.'}
                            </p>
                        </div>
                        <div data-reveal="swing-right" className="glass-tile p-6 sm:p-7">
                            <p className="eyebrow mb-2 !text-xs">Latest Writing</p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {recentBlogTitles.length ? recentBlogTitles.join(' · ') : 'Blog updates coming soon.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeSnapshot;
