"use client";

import React, { useEffect, useRef, useState } from 'react';
import { FaBullseye, FaGraduationCap, FaSatelliteDish } from 'react-icons/fa';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';

const STATUS_CARDS = [
    {
        key: 'focus',
        label: 'Current Focus',
        icon: FaBullseye,
        accent: 'var(--accent-cyan)',
        fallback: 'Building delightful web experiences',
    },
    {
        key: 'learning',
        label: 'Now Learning',
        icon: FaGraduationCap,
        accent: 'var(--accent-purple)',
        fallback: 'Exploring new tools and patterns',
    },
    {
        key: 'availability',
        label: 'Availability',
        icon: FaSatelliteDish,
        accent: 'var(--accent-orange)',
        fallback: 'Open to collaborations',
    },
];

/**
 * Mission Control, v2: the three status cards start as an orbital carousel —
 * rotated around Y at different depths as if circling the viewer — and dock
 * flat into the grid as the section scrolls through. Same live data contract
 * as the v1 section (/admin/home statusSection).
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
            const cards = scope.querySelectorAll('.v2-mc-card');
            const deck = scope.querySelector('.v2-mc-deck');
            if (!cards.length || !deck) return;

            // Orbit-to-dock: each card arrives from a slice of a Y-axis orbit.
            const orbit = [
                { rotationY: 52, x: -140, z: -260 },
                { rotationY: 0, x: 0, z: -380 },
                { rotationY: -52, x: 140, z: -260 },
            ];
            gsap.fromTo(
                cards,
                {
                    rotationY: (i) => orbit[i % orbit.length].rotationY,
                    x: (i) => orbit[i % orbit.length].x,
                    z: (i) => orbit[i % orbit.length].z,
                    autoAlpha: 0.25,
                    transformPerspective: 1200,
                },
                {
                    rotationY: 0,
                    x: 0,
                    z: 0,
                    autoAlpha: 1,
                    ease: 'power1.out',
                    stagger: 0.06,
                    scrollTrigger: {
                        trigger: deck,
                        start: 'top 92%',
                        end: 'center 58%',
                        scrub: 0.8,
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
                data-v2="float"
                data-v2-tilt
                className="chapter-panel glass-panel relative mx-auto flex w-full max-w-[95%] flex-col justify-center overflow-hidden p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
            >
                <div className="relative mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div data-v2="door-left" className="max-w-2xl">
                        <p className="eyebrow mb-3 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: 'var(--status-success)' }} />
                                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--status-success)' }} />
                            </span>
                            Live Status
                        </p>
                        <h2 className="headline-section">{headline}</h2>
                    </div>

                    <div data-v2="door-right" className="glass-tile self-start px-5 py-3 lg:self-auto">
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Local time</p>
                        <p className="text-base font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }} suppressHydrationWarning>
                            {clock || '--:--:--'}
                        </p>
                    </div>
                </div>

                <div className="v2-mc-deck relative grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6" style={{ perspective: '1200px' }}>
                    {STATUS_CARDS.map((card) => {
                        const Icon = card.icon;
                        const value = data?.[card.key] || card.fallback;

                        return (
                            <div
                                key={card.key}
                                className="v2-mc-card glass-tile p-7 sm:p-8"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                <div className="mb-5 flex items-center justify-between">
                                    <span
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-full"
                                        style={{ backgroundColor: `color-mix(in srgb, ${card.accent} 12%, transparent)` }}
                                    >
                                        <Icon size={15} style={{ color: card.accent }} />
                                    </span>
                                    <span className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                                        {card.label}
                                    </span>
                                </div>
                                <p className="text-xl font-semibold leading-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
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

export default V2MissionControl;
