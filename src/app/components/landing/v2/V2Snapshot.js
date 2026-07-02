"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';

const quickLinks = [
    { href: '#v2-status', label: 'Mission Control' },
    { href: '#v2-tech', label: 'Tech Stack' },
    { href: '#v2-about', label: 'About Highlights' },
    { href: '#v2-showcase', label: 'Focus Areas' },
    { href: '#v2-projects', label: 'Featured Projects' },
    { href: '#v2-blogs', label: 'Recent Blogs' },
];

/**
 * Snapshot chapter, v2: the stat tiles lie flat like cards on a table and flip
 * up to face the camera as the panel enters; quick links swing in as hinged
 * doors from alternating edges. Content mirrors the v1 HomeSnapshot section.
 */
const V2Snapshot = ({ stats = [], recentProjectNames = [], recentBlogTitles = [] }) => {
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(scopeRef, { reducedMotion: prefersReducedMotion });

    return (
        <div ref={scopeRef} style={{ perspective: '1400px' }}>
            <div
                data-v2="float"
                data-v2-tilt
                className="chapter-panel glass-panel mx-auto flex w-full max-w-[95%] flex-col justify-center p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
                style={{ transformStyle: 'preserve-3d' }}
            >
                <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div data-v2="door-left" className="max-w-2xl">
                        <p className="eyebrow mb-3">Portfolio Snapshot</p>
                        <h2 className="headline-section">
                            Highlights across home, projects, and writing.
                        </h2>
                    </div>
                    <Link href="/projects" data-v2="door-right" className="pill-ghost self-start lg:self-auto">
                        Browse Full Projects
                    </Link>
                </div>

                <div data-v2-group data-v2-stagger="0.08" className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-5" style={{ perspective: '1100px' }}>
                    {stats.map((item) => (
                        <div key={item.label} data-v2="flip-x" className="glass-tile p-5 sm:p-6">
                            <p className="text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: 'var(--text-bright)' }}>
                                <span data-counter={item.value}>{item.value}</span>
                            </p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                        </div>
                    ))}
                </div>

                <div data-v2-group data-v2-stagger="0.05" className="mt-10 flex flex-wrap gap-2.5">
                    {quickLinks.map((item, index) => (
                        <a
                            key={item.href}
                            href={item.href}
                            data-v2={index % 2 === 0 ? 'door-left' : 'door-right'}
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
                    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" style={{ perspective: '1100px' }}>
                        <div data-v2="door-left" className="glass-tile p-6 sm:p-7">
                            <p className="eyebrow mb-2 !text-xs">Project Picks</p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {recentProjectNames.length ? recentProjectNames.join(' · ') : 'Projects will appear here soon.'}
                            </p>
                        </div>
                        <div data-v2="door-right" className="glass-tile p-6 sm:p-7">
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

export default V2Snapshot;
