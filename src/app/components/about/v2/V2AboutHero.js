"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { FaArrowDown } from 'react-icons/fa6';
import TypewriterEffect from '../../shared/TypewriterEffect';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';

const jumpLinks = [
    { href: '#v2a-stats', label: 'telemetry' },
    { href: '#v2a-profile', label: 'character' },
    { href: '#v2a-experience', label: 'experience' },
    { href: '#v2a-skills', label: 'skills' },
    { href: '#v2a-education', label: 'education' },
    { href: '#v2a-certifications', label: 'certifications' },
];

/**
 * Identity chapter for /v2/about-me. A compact 3D title plate: the name's
 * lines pivot up from the baseline, the summary surfaces from camera depth,
 * and mono jump links route the chapters below. No pin — the about page
 * reads more like a dossier than a fly-through.
 */
const V2AboutHero = ({ name, roles = [], summary }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

    return (
        <section ref={sectionRef} className="relative overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-36">
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10" style={{ perspective: '1200px' }}>
                <p data-v2="line" className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-cyan)' }}>
                    /00 — Dossier
                </p>

                <h1
                    className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl lg:text-8xl"
                    style={{ color: 'var(--text-bright)' }}
                >
                    <span data-v2="line" className="block">{name || 'Developer'}<span style={{ color: 'var(--accent-cyan)' }}>.</span></span>
                </h1>

                <div data-v2="rise" className="mt-5 text-lg font-medium sm:text-2xl" style={{ color: 'var(--text-secondary)' }}>
                    <TypewriterEffect roles={roles} />
                </div>

                <p data-v2="deep" className="mt-8 max-w-3xl text-lg leading-relaxed sm:text-xl" style={{ color: 'var(--text-tertiary)' }}>
                    {summary}
                </p>

                <div data-v2-group data-v2-stagger="0.05" className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-sm">
                    <span data-v2="rise" className="inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <FaArrowDown size={10} aria-hidden="true" /> jump to
                    </span>
                    {jumpLinks.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            data-v2="rise"
                            className="group cursor-pointer transition-colors duration-200"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <span style={{ color: 'var(--accent-cyan)' }}>[</span>
                            <span className="mx-1 underline-offset-4 group-hover:underline">{item.label}</span>
                            <span style={{ color: 'var(--accent-cyan)' }}>]</span>
                        </a>
                    ))}
                </div>

                <div data-v2-group data-v2-stagger="0.08" className="mt-10 flex flex-wrap gap-3">
                    <Link href="/contact-us" data-v2="door-left" className="pill-solid">
                        Let&apos;s Connect
                    </Link>
                    <Link href="/v2" data-v2="door-right" className="pill-ghost">
                        V2 Home
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default V2AboutHero;
