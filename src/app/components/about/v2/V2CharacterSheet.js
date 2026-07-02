"use client";

import React, { useRef } from 'react';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';
import V2ChapterHead from '../../landing/v2/V2ChapterHead';

/**
 * Character chapter: the v1 RPG quest profile reborn as a HUD character
 * sheet. The plate stands up from a 30° tilt (scrubbed), the XP beam fills
 * under the scroll, and the four attribute gauges count up with bar fills.
 * Same derived metrics as the v1 QuestProfile.
 */
const V2CharacterSheet = ({ data }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    const {
        name = 'Developer',
        roles = [],
        skills = [],
        experiences = [],
        education = [],
        certifications = [],
    } = data || {};

    const totalCompletedQuests = experiences.length + education.length + certifications.length;
    const level = 10 + totalCompletedQuests * 3;
    const xpProgress = Math.min(100, Math.max(15, (totalCompletedQuests % 5) * 20 + 20));

    const attributes = [
        { label: 'INT · tech', value: 20 + skills.length * 2, accent: 'var(--accent-cyan)' },
        { label: 'VIT · exp', value: 30 + experiences.length * 12, accent: 'var(--accent-orange)' },
        { label: 'WIS · edu', value: 25 + education.length * 15, accent: 'var(--accent-purple)' },
        { label: 'DEX · cert', value: 15 + certifications.length * 10, accent: 'var(--accent-pink)' },
    ];
    const maxAttribute = Math.max(...attributes.map((attr) => attr.value), 1);

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const wrap = scope.querySelector('.v2-sheet-wrap');
            const sheet = scope.querySelector('.v2-sheet');
            const xpBeam = scope.querySelector('.v2-sheet-xp');
            const gauges = scope.querySelectorAll('.v2-sheet-gauge');
            if (!wrap || !sheet) return;

            // Trigger off the untransformed wrapper, not the rotating sheet.
            gsap.fromTo(
                sheet,
                { rotationX: 30, z: -180, autoAlpha: 0.35, transformOrigin: '50% 100%', transformPerspective: 1300 },
                {
                    rotationX: 0,
                    z: 0,
                    autoAlpha: 1,
                    ease: 'power1.out',
                    scrollTrigger: { trigger: wrap, start: 'top 95%', end: 'top 50%', scrub: 0.7 },
                }
            );

            if (xpBeam) {
                gsap.fromTo(
                    xpBeam,
                    { scaleX: 0, transformOrigin: 'left center' },
                    {
                        scaleX: 1,
                        ease: 'power2.out',
                        duration: 1.2,
                        scrollTrigger: { trigger: wrap, start: 'top 70%', toggleActions: 'play none none reverse' },
                    }
                );
            }

            if (gauges.length) {
                gsap.fromTo(
                    gauges,
                    { scaleX: 0, transformOrigin: 'left center' },
                    {
                        scaleX: 1,
                        ease: 'power3.out',
                        duration: 1,
                        stagger: 0.12,
                        scrollTrigger: { trigger: wrap, start: 'top 65%', toggleActions: 'play none none reverse' },
                    }
                );
            }
        },
    });

    return (
        <section
            ref={sectionRef}
            className="relative overflow-hidden py-20 sm:py-28"
            style={{ borderTop: '1px solid var(--hairline)' }}
        >
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
                <V2ChapterHead
                    index="02"
                    eyebrow="Character"
                    title="The player behind the commits."
                    accent="var(--accent-purple)"
                />

                <div className="v2-sheet-wrap" style={{ perspective: '1300px' }}>
                    <div
                        className="v2-sheet overflow-hidden rounded-2xl border"
                        style={{
                            borderColor: 'var(--hairline)',
                            backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
                            boxShadow: '0 40px 90px -50px color-mix(in srgb, var(--accent-purple) 35%, transparent)',
                        }}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 font-mono text-xs sm:px-8" style={{ borderColor: 'var(--hairline)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>
                                player: <span style={{ color: 'var(--text-primary)' }}>{name}</span>
                                {roles[0] && <span className="ml-3 hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>class: {roles[0]}</span>}
                            </span>
                            <span
                                className="rounded-full border px-3 py-1 font-bold uppercase tracking-[0.2em]"
                                style={{
                                    color: 'var(--accent-purple)',
                                    borderColor: 'color-mix(in srgb, var(--accent-purple) 40%, transparent)',
                                    backgroundColor: 'color-mix(in srgb, var(--accent-purple) 10%, transparent)',
                                }}
                            >
                                LVL {level}
                            </span>
                        </div>

                        <div className="px-5 py-7 sm:px-8 sm:py-9">
                            <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
                                <span style={{ color: 'var(--text-muted)' }}>experience points</span>
                                <span style={{ color: 'var(--accent-purple)' }}>{xpProgress}% to level up</span>
                            </div>
                            <div className="mb-9 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--text-muted) 14%, transparent)' }}>
                                <div
                                    className="v2-sheet-xp h-full rounded-full"
                                    style={{
                                        width: `${xpProgress}%`,
                                        background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
                                {attributes.map((attr) => (
                                    <div key={attr.label}>
                                        <div className="mb-2 flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.2em]">
                                            <span style={{ color: 'var(--text-muted)' }}>{attr.label}</span>
                                            <span className="text-base font-bold tabular-nums" style={{ color: attr.accent }}>
                                                <span data-counter={attr.value}>{attr.value}</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--text-muted) 14%, transparent)' }}>
                                            <div
                                                className="v2-sheet-gauge h-full rounded-full"
                                                style={{
                                                    width: `${Math.round((attr.value / maxAttribute) * 100)}%`,
                                                    backgroundColor: attr.accent,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="mt-9 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                <span style={{ color: 'var(--status-success)' }}>●</span> active status: open to quests
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default V2CharacterSheet;
