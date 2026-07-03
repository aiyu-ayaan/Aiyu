"use client";

import React, { useEffect, useRef, useState } from 'react';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import V2ChapterHead from './V2ChapterHead';

const STATUS_ROWS = [
    { key: 'focus', flag: '--focus', accent: 'var(--accent-cyan)', fallback: 'Building delightful web experiences' },
    { key: 'learning', flag: '--learning', accent: 'var(--accent-purple)', fallback: 'Exploring new tools and patterns' },
    { key: 'availability', flag: '--availability', accent: 'var(--accent-orange)', fallback: 'Open to collaborations' },
];

/**
 * Chapter 02 — Mission Control as a HUD console. One wide terminal lies almost
 * flat like a launch desk and stands upright as it scrolls in (scrubbed
 * rotationX); the status rows then print in sequence with a blinking cursor.
 * Same /admin/home statusSection contract as v1.
 */
const V2MissionControl = ({ data }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();
    const [clock, setClock] = useState('');

    useEffect(() => {
        const updateClock = () => {
            setClock(new Date().toLocaleTimeString('en-US', { hour12: false }));
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const wrap = scope.querySelector('.v2-console-wrap');
            const console3d = scope.querySelector('.v2-console');
            const rows = scope.querySelectorAll('.v2-console-row');
            if (!wrap || !console3d) return;

            // Trigger everything off the untransformed wrapper — using the
            // rotating console itself would skew ScrollTrigger's measurements.
            // The desk stands up: from lying back at 38° to facing the camera.
            gsap.fromTo(
                console3d,
                { rotationX: 38, z: -220, autoAlpha: 0.3, transformOrigin: '50% 100%', transformPerspective: 1300 },
                {
                    rotationX: 0,
                    z: 0,
                    autoAlpha: 1,
                    ease: 'power1.out',
                    scrollTrigger: {
                        trigger: wrap,
                        start: 'top 95%',
                        end: 'top 45%',
                        scrub: 0.7,
                    },
                }
            );

            // Rows print once the console is mostly upright.
            gsap.fromTo(
                rows,
                { autoAlpha: 0, x: -18 },
                {
                    autoAlpha: 1,
                    x: 0,
                    duration: 0.5,
                    ease: 'power2.out',
                    stagger: 0.16,
                    scrollTrigger: {
                        trigger: wrap,
                        start: 'top 72%',
                        toggleActions: 'play none none reverse',
                    },
                }
            );
        },
    });

    if (data?.enabled === false) return null;

    return (
        <section ref={sectionRef} className="relative overflow-hidden py-20 sm:py-28">
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
                <V2ChapterHead
                    index="02"
                    eyebrow="Live Status"
                    title={data?.headline || 'Mission Control.'}
                    accent="var(--accent-purple)"
                />

                <div className="v2-console-wrap" style={{ perspective: '1300px' }}>
                    <div
                        className="v2-console overflow-hidden rounded-2xl border font-mono text-sm sm:text-base"
                        style={{
                            borderColor: 'var(--hairline)',
                            backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
                            boxShadow: '0 40px 90px -50px color-mix(in srgb, var(--accent-purple) 35%, transparent)',
                        }}
                    >
                        <div
                            className="flex items-center justify-between border-b px-5 py-3.5"
                            style={{ borderColor: 'var(--hairline)' }}
                        >
                            <div className="flex items-center gap-2" aria-hidden="true">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--status-error, #f87171)', opacity: 0.8 }} />
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--accent-orange)', opacity: 0.8 }} />
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--status-success)', opacity: 0.8 }} />
                                <span className="ml-3 text-xs" style={{ color: 'var(--text-muted)' }}>aiyu@v2 — status</span>
                            </div>
                            <p className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }} suppressHydrationWarning>
                                <span className="relative mr-2 inline-flex h-1.5 w-1.5 align-middle">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: 'var(--status-success)' }} />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--status-success)' }} />
                                </span>
                                {clock || '--:--:--'} local
                            </p>
                        </div>

                        <div className="px-5 py-6 sm:px-8 sm:py-8">
                            <p className="v2-console-row mb-5" style={{ color: 'var(--text-muted)' }}>
                                <span style={{ color: 'var(--status-success)' }}>$</span> status --live
                            </p>
                            {STATUS_ROWS.map((row) => (
                                <div key={row.key} className="v2-console-row mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                                    <span className="w-40 shrink-0 text-xs uppercase tracking-[0.2em] sm:text-sm" style={{ color: row.accent }}>
                                        {row.flag}
                                    </span>
                                    <span className="text-base font-medium sm:text-xl" style={{ color: 'var(--text-primary)' }}>
                                        {data?.[row.key] || row.fallback}
                                    </span>
                                </div>
                            ))}
                            <p className="v2-console-row mt-6" style={{ color: 'var(--text-muted)' }}>
                                <span style={{ color: 'var(--status-success)' }}>$</span>{' '}
                                <span className="inline-block h-4 w-2.5 translate-y-0.5 animate-pulse" style={{ backgroundColor: 'var(--text-secondary)' }} />
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default V2MissionControl;
