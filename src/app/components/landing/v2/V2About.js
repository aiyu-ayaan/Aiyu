"use client";

import React, { useMemo, useRef } from 'react';
import Link from 'next/link';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import V2ChapterHead from './V2ChapterHead';

const highlightRows = [
    {
        title: 'Product Mindset',
        description: 'Building features that solve real user friction, not just technical tasks.',
        accent: 'var(--accent-cyan)',
    },
    {
        title: 'Clean Execution',
        description: 'Architecture and delivery balanced for readability, speed, and maintainability.',
        accent: 'var(--accent-purple)',
    },
    {
        title: 'Growth Velocity',
        description: 'Continuous learning loops to ship better outcomes with each iteration.',
        accent: 'var(--accent-orange)',
    },
];

/**
 * Chapter 04 — About as an editorial spread. The professional summary reads
 * as an oversized pull-quote whose words ink in one-by-one under a scrub;
 * the highlights are ledger rows (index / title / description) that hinge in
 * along their hairlines instead of floating cards.
 */
const V2About = ({ data }) => {
    const { professionalSummary } = data || {};
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    const summary = professionalSummary || 'I create user-first software experiences, pairing strong technical decisions with thoughtful product execution.';
    const words = useMemo(() => summary.split(/\s+/).filter(Boolean), [summary]);

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        dependencies: [words.length],
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const quote = scope.querySelector('.v2-about-quote');
            const wordEls = scope.querySelectorAll('.v2-about-word');
            if (!quote || !wordEls.length) return;

            gsap.fromTo(
                wordEls,
                { opacity: 0.12 },
                {
                    opacity: 1,
                    ease: 'none',
                    stagger: 0.6,
                    scrollTrigger: {
                        trigger: quote,
                        start: 'top 82%',
                        end: 'bottom 45%',
                        scrub: 0.5,
                    },
                }
            );
        },
    });

    return (
        <section ref={sectionRef} className="relative overflow-hidden py-20 sm:py-28" style={{ borderTop: '1px solid var(--hairline)' }}>
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
                <V2ChapterHead
                    index="04"
                    eyebrow="About"
                    title="Intentional engineering, creative energy."
                    accent="var(--accent-pink)"
                />

                <blockquote
                    className="v2-about-quote mb-20 max-w-5xl text-2xl font-medium leading-snug tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.2]"
                    style={{ color: 'var(--text-bright)' }}
                >
                    {words.map((word, index) => (
                        <span key={`${word}-${index}`} className="v2-about-word">
                            {word}{' '}
                        </span>
                    ))}
                </blockquote>

                <div style={{ borderTop: '1px solid var(--hairline)' }}>
                    {highlightRows.map((row, index) => (
                        <div
                            key={row.title}
                            data-v2={index % 2 === 0 ? 'door-left' : 'door-right'}
                            className="grid grid-cols-12 items-baseline gap-4 py-8 sm:py-10"
                            style={{ borderBottom: '1px solid var(--hairline)' }}
                        >
                            <span className="col-span-2 font-mono text-sm sm:col-span-1" style={{ color: row.accent }}>
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <h3 className="col-span-10 text-2xl font-semibold tracking-tight sm:col-span-4 sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
                                {row.title}
                            </h3>
                            <p className="col-span-10 col-start-3 text-base leading-relaxed sm:col-span-7 sm:col-start-6 sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                                {row.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div data-v2-group data-v2-stagger="0.08" className="mt-12 flex flex-wrap gap-x-10 gap-y-4 font-mono text-sm">
                    <Link href="/v2/about-me" data-v2="rise" className="underline-offset-4 hover:underline" style={{ color: 'var(--accent-cyan)' }}>
                        → the full story
                    </Link>
                    <Link href="/projects" data-v2="rise" className="underline-offset-4 hover:underline" style={{ color: 'var(--accent-purple)' }}>
                        → view projects
                    </Link>
                    <Link href="/contact-us" data-v2="rise" className="underline-offset-4 hover:underline" style={{ color: 'var(--accent-pink)' }}>
                        → start a conversation
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default V2About;
