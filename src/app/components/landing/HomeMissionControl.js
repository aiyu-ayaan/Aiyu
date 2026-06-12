"use client";

import React, { useEffect, useRef, useState } from 'react';
import { FaBullseye, FaGraduationCap, FaSatelliteDish } from 'react-icons/fa';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { useSectionFx } from '../shared/gsapScroll';

const STATUS_CARDS = [
    {
        key: 'focus',
        label: 'CURRENT_FOCUS',
        icon: FaBullseye,
        accent: 'var(--accent-cyan)',
        fallback: 'Building delightful web experiences',
    },
    {
        key: 'learning',
        label: 'NOW_LEARNING',
        icon: FaGraduationCap,
        accent: 'var(--accent-purple)',
        fallback: 'Exploring new tools and patterns',
    },
    {
        key: 'availability',
        label: 'AVAILABILITY',
        icon: FaSatelliteDish,
        accent: 'var(--accent-orange)',
        fallback: 'Open to collaborations',
    },
];

/**
 * Mission Control: a live status strip configured from /admin/home.
 * The three holo-cards start fanned open in 3D and flatten into place as the
 * section scrolls through the viewport (scrubbed, not just triggered).
 */
const HomeMissionControl = ({ data }) => {
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

    useSectionFx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const cards = scope.querySelectorAll('.mc-card');
            const deck = scope.querySelector('.mc-deck');
            if (!cards.length || !deck) return;

            const fanAngles = [-34, 0, 34];
            gsap.fromTo(
                cards,
                {
                    rotateY: (index) => fanAngles[index % fanAngles.length],
                    z: -140,
                    autoAlpha: 0.35,
                    transformPerspective: 1200,
                },
                {
                    rotateY: 0,
                    z: 0,
                    autoAlpha: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: deck,
                        start: 'top 96%',
                        end: 'center 55%',
                        scrub: true,
                    },
                }
            );
        },
    });

    if (data?.enabled === false) return null;

    const headline = data?.headline || 'Mission Control';

    return (
        <div ref={sectionRef} className="relative" style={{ perspective: '1400px' }}>
            <div
                data-parallax="0.25"
                className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-orange) 22%, transparent), transparent 70%)' }}
            />

            <div
                data-reveal="zoom"
                className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%] overflow-hidden rounded-3xl border p-6 sm:p-8"
                style={{
                    background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 93%, transparent), color-mix(in srgb, var(--bg-secondary) 93%, transparent))',
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                    boxShadow: '0 16px 36px var(--shadow-sm)',
                }}
            >
                {/* Faint command-grid texture */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage: 'linear-gradient(var(--accent-cyan) 1px, transparent 1px), linear-gradient(90deg, var(--accent-cyan) 1px, transparent 1px)',
                        backgroundSize: '44px 44px',
                    }}
                />

                <div className="relative mb-7 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--accent-orange) 45%, var(--border-secondary))',
                                color: 'var(--accent-orange)',
                            }}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: 'var(--accent-orange)' }} />
                                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-orange)' }} />
                            </span>
                            Live Status
                        </p>
                        <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
                            {headline}
                        </h2>
                    </div>

                    <div
                        className="rounded-xl border px-4 py-3 font-mono text-xs tracking-widest"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        LOCAL_TIME: <span className="font-bold" style={{ color: 'var(--accent-cyan)' }} suppressHydrationWarning>{clock || '--:--:--'}</span>
                    </div>
                </div>

                <div className="mc-deck relative grid grid-cols-1 gap-4 md:grid-cols-3" style={{ perspective: '1200px' }}>
                    {STATUS_CARDS.map((card) => {
                        const Icon = card.icon;
                        const value = data?.[card.key] || card.fallback;

                        return (
                            <div
                                key={card.key}
                                className="mc-card rounded-2xl border p-5 transition-transform duration-300 hover:-translate-y-1"
                                style={{
                                    borderColor: `color-mix(in srgb, ${card.accent} 35%, var(--border-secondary))`,
                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 86%, transparent)',
                                    boxShadow: `0 10px 28px color-mix(in srgb, ${card.accent} 8%, transparent)`,
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <span
                                        className="inline-flex rounded-lg p-2.5"
                                        style={{ backgroundColor: `color-mix(in srgb, ${card.accent} 14%, transparent)` }}
                                    >
                                        <Icon size={16} style={{ color: card.accent }} />
                                    </span>
                                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60" style={{ color: card.accent }}>
                                        {card.label}
                                    </span>
                                </div>
                                <p className="text-base font-semibold leading-relaxed sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                                    {value}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HomeMissionControl;
