"use client";

import React, { useRef } from 'react';
import { FaArrowUpRightFromSquare, FaEnvelope, FaFileArrowDown } from 'react-icons/fa6';
import ContactForm from '../ContactForm';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';

/**
 * /v2/contact-us — the contact command center in the editorial-depth voice.
 * Same shared ContactForm and data as the classic page, but no glass panels:
 * a chapter-style head, a mono status line, the form on a hairline rule, and
 * direct channels (email, resume) as ledger rows.
 */
const ContactV2 = ({ location, status, email, hasResume, resumeHref }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

    return (
        <div ref={sectionRef} className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                <div className="relative mb-14 sm:mb-20">
                    <span
                        data-v2-depth="-0.4"
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none text-[7rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[13rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-orange) 20%, transparent)',
                            opacity: 0.8,
                        }}
                    >
                        @
                    </span>

                    <p data-v2="line" className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-orange)' }}>
                        ~/contact — open channel
                    </p>
                    <h1
                        data-v2="line"
                        className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        Let&apos;s talk.
                    </h1>
                    <p data-v2="rise" className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        Have an idea, collaboration, or product challenge? Share the context and goals, and I&apos;ll reply with a focused plan.
                    </p>

                    <p data-v2="rise" className="mt-8 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--status-success)' }}>● {status}</span>
                        {' '}· {location} · replies within 24h
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
                    <div data-v2="rise" className="lg:col-span-7" style={{ borderTop: '1px solid var(--hairline)' }}>
                        <p className="mb-6 pt-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-cyan)' }}>
                            $ send --message
                        </p>
                        <ContactForm />
                    </div>

                    <div className="lg:col-span-5" style={{ borderTop: '1px solid var(--hairline)' }}>
                        <p data-v2="rise" className="mb-2 pt-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-purple)' }}>
                            $ channels --direct
                        </p>

                        <div style={{ perspective: '1600px' }}>
                            {email && (
                                <a
                                    href={`mailto:${email}`}
                                    data-v2="door-left"
                                    className="group flex items-center justify-between gap-4 py-6"
                                    style={{ borderBottom: '1px solid var(--hairline)' }}
                                >
                                    <span className="min-w-0">
                                        <span className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                                            <FaEnvelope className="h-3.5 w-3.5" style={{ color: 'var(--accent-purple)' }} aria-hidden="true" />
                                            email
                                        </span>
                                        <span
                                            className="mt-2 block truncate text-xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-2xl"
                                            style={{ color: 'var(--text-bright)' }}
                                        >
                                            {email}
                                        </span>
                                    </span>
                                    <FaArrowUpRightFromSquare
                                        className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                                        style={{ color: 'var(--accent-purple)' }}
                                        aria-hidden="true"
                                    />
                                </a>
                            )}

                            {hasResume && (
                                <a
                                    href={resumeHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-v2="door-right"
                                    className="group flex items-center justify-between gap-4 py-6"
                                    style={{ borderBottom: '1px solid var(--hairline)' }}
                                >
                                    <span className="min-w-0">
                                        <span className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                                            <FaFileArrowDown className="h-3.5 w-3.5" style={{ color: 'var(--accent-orange)' }} aria-hidden="true" />
                                            resume
                                        </span>
                                        <span
                                            className="mt-2 block text-xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-2xl"
                                            style={{ color: 'var(--text-bright)' }}
                                        >
                                            Open the latest CV
                                        </span>
                                    </span>
                                    <FaArrowUpRightFromSquare
                                        className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                                        style={{ color: 'var(--accent-orange)' }}
                                        aria-hidden="true"
                                    />
                                </a>
                            )}
                        </div>

                        <p data-v2="rise" className="mt-8 font-mono text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            → include your goals, timeline, and platform requirements for a faster response.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactV2;
