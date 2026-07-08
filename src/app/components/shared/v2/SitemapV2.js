"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';

/**
 * /v2/sitemap body — the index columns with the shared v2 reveal
 * choreography. The server page (src/app/v2/sitemap/page.js) does the data
 * fetching and passes plain, serializable columns; this client shell wires
 * up useV2Fx so the head lines pivot in and each column staggers its links.
 */
const SitemapV2 = ({ columns = [], totalEntries = 0 }) => {
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
                            WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-cyan) 20%, transparent)',
                            opacity: 0.8,
                        }}
                    >
                        ≡
                    </span>

                    <p data-v2="line" className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-cyan)' }}>
                        ~/sitemap — the index
                    </p>
                    <h1 data-v2="line" className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl" style={{ color: 'var(--text-bright)' }}>
                        Everything, in one place.
                    </h1>
                    <p data-v2="rise" className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        A complete overview of every public page on this site.
                    </p>
                    <p data-v2="rise" className="mt-8 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        {totalEntries} entries · {columns.length} sections
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-2">
                    {columns.map((column, index) => (
                        <section key={column.label} data-v2={index % 2 === 0 ? 'door-left' : 'door-right'}>
                            <h2 className="mb-4 flex items-baseline gap-3 pb-3 font-mono text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--text-bright)', borderBottom: '1px solid var(--hairline)' }}>
                                <span style={{ color: column.accent }}>{column.label}</span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {column.items.length} {column.items.length === 1 ? 'entry' : 'entries'}
                                </span>
                            </h2>
                            {column.items.length ? (
                                <ul className="space-y-2 font-mono text-sm" data-v2-group data-v2-stagger="0.04">
                                    {column.items.map((item) => (
                                        <li key={item.href} data-v2="rise">
                                            <Link
                                                href={item.href}
                                                className="inline-flex items-baseline gap-2 break-words underline-offset-4 transition-colors duration-200 hover:underline"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                <span style={{ color: column.accent }}>→</span>
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>▸ nothing here yet…</p>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SitemapV2;
