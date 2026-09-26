"use client";

import React, { useRef } from 'react';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import TermHead from './TermHead';

const quickLinks = [
    { href: '#v2-status', label: 'status' },
    { href: '#v2-tech', label: 'stack' },
    { href: '#v2-about', label: 'about' },
    { href: '#v2-showcase', label: 'workspaces' },
    { href: '#v2-projects', label: 'projects' },
    { href: '#v2-blogs', label: 'notes' },
];

// Block-letter mark in the spirit of neofetch's distro logo.
const LOGO = [
    '    ___    ',
    '   /   \\   ',
    '  / /_\\ \\  ',
    ' /  ___  \\ ',
    '/__/   \\__\\',
];

const PALETTE = ['var(--accent-cyan)', 'var(--accent-purple)', 'var(--accent-pink)', 'var(--accent-orange)', 'var(--status-success)', 'var(--text-bright)'];

/**
 * Chapter 01 — "neofetch". The landing film ends; the first thing the
 * visitor sees is the machine reporting in: an ASCII mark beside key/value
 * system info whose values are the live site counters, then quick links
 * as shell aliases and the latest work printed as log lines.
 */
const V2Snapshot = ({ stats = [], recentProjectNames = [], recentBlogTitles = [] }) => {
    const scopeRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(scopeRef, {
        reducedMotion: prefersReducedMotion,
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const rows = scope.querySelectorAll('.nf-row');
            const logo = scope.querySelectorAll('.nf-logo span');
            const swatches = scope.querySelectorAll('.nf-swatch');
            const tl = gsap.timeline({
                scrollTrigger: { trigger: scope.querySelector('.nf-panel'), start: 'top 78%', toggleActions: 'play none none none' },
            });
            tl.fromTo(logo, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' })
                .fromTo(rows, { autoAlpha: 0, x: 16 }, { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.07, ease: 'power2.out' }, 0.1)
                .fromTo(swatches, { scaleY: 0 }, { scaleY: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(2)', transformOrigin: '50% 100%' }, '-=0.2');
        },
    });

    const info = [
        { key: 'user', value: 'guest@portfolio' },
        ...stats.map((item) => ({ key: item.label.toLowerCase(), value: item.value, accent: item.accent, counter: true })),
        { key: 'code os', value: 'linux' },
        { key: 'play os', value: 'windows' },
        { key: 'shell', value: 'zsh' },
    ];

    return (
        <section ref={scopeRef} className="relative overflow-hidden py-20 sm:py-28" style={{ borderTop: '1px solid var(--hairline)' }}>
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
                <TermHead path="~" command="neofetch" title="System check: all green." accent="var(--status-success)" />

                <div
                    className="nf-panel grid grid-cols-1 gap-10 rounded-2xl border p-6 font-mono sm:p-10 md:grid-cols-[auto_1fr] md:gap-16"
                    style={{ borderColor: 'var(--hairline)', backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 70%, transparent)' }}
                >
                    <pre
                        aria-hidden="true"
                        className="nf-logo text-base leading-snug sm:text-xl"
                        style={{ color: 'var(--accent-cyan)' }}
                    >
                        {LOGO.map((line, index) => (
                            <span key={index} className="block">{line}</span>
                        ))}
                    </pre>

                    <div>
                        <dl className="grid grid-cols-1 gap-y-2.5 text-sm sm:text-base">
                            {info.map((row) => (
                                <div key={row.key} className="nf-row flex gap-3">
                                    <dt className="w-32 shrink-0 font-semibold sm:w-44" style={{ color: row.accent || 'var(--accent-purple)' }}>
                                        {row.key}
                                    </dt>
                                    <dd className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                        {row.counter ? <span data-counter={row.value}>{row.value}</span> : row.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <div className="mt-6 flex gap-1.5" aria-hidden="true">
                            {PALETTE.map((color) => (
                                <span key={color} className="nf-swatch h-5 w-8 rounded-sm sm:w-10" style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>alias →</span>
                    {quickLinks.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            className="v2-link-draw cursor-pointer transition-colors duration-200"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <span style={{ color: 'var(--status-success)' }}>cd </span>
                            {item.label}
                        </a>
                    ))}
                </div>

                {(recentProjectNames.length > 0 || recentBlogTitles.length > 0) && (
                    <div className="mt-12 grid grid-cols-1 gap-10 font-mono text-sm md:grid-cols-2">
                        {[
                            { cmd: 'git log -3 --format=%s projects', items: recentProjectNames, empty: 'shipping soon…', accent: 'var(--accent-cyan)' },
                            { cmd: 'ls -t ~/notes | head -2', items: recentBlogTitles, empty: 'drafts in progress…', accent: 'var(--accent-pink)' },
                        ].map((block) => (
                            <div key={block.cmd} data-v2="rise">
                                <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                    <span style={{ color: 'var(--status-success)' }}>$</span> {block.cmd}
                                </p>
                                {(block.items.length ? block.items : [block.empty]).map((item) => (
                                    <p key={item} className="mb-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                        <span style={{ color: block.accent }}>▸ </span>
                                        {item}
                                    </p>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default V2Snapshot;
