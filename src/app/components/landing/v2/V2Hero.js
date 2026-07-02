"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { FaArrowDown, FaGithub, FaSatelliteDish } from 'react-icons/fa6';
import TypewriterEffect from '../../shared/TypewriterEffect';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';

/**
 * V2 hero: a pinned 3D stage. The name, role line, and floating glass shards sit
 * at different camera depths; scrolling flies the camera through the stack —
 * foreground shards sweep past, the headline recedes and tilts, and the scroll
 * cue hands off to the snapshot chapter. Lite / reduced-motion devices get the
 * same layout, static and unpinned.
 */
const DEPTH_SHARDS = [
    { label: 'GSAP · ScrollTrigger', z: 160, x: '8%', y: '18%', accent: 'var(--accent-cyan)', drift: -1.4 },
    { label: 'Next.js · React', z: 90, x: '74%', y: '14%', accent: 'var(--accent-purple)', drift: -0.9 },
    { label: 'Design Systems', z: 220, x: '78%', y: '66%', accent: 'var(--accent-orange)', drift: -1.8 },
    { label: '3D Interfaces', z: 60, x: '6%', y: '70%', accent: 'var(--accent-pink)', drift: -0.6 },
];

const V2Hero = ({ data }) => {
    const { name, homeRoles, githubLink, resumeStatus } = data || {};
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;

            const stage = scope.querySelector('.v2-hero-stage');
            const headline = scope.querySelector('.v2-hero-headline');
            const meta = scope.querySelector('.v2-hero-meta');
            const shards = scope.querySelectorAll('.v2-hero-shard');
            const cue = scope.querySelector('.v2-hero-cue');
            if (!stage || !headline) return;

            // Entrance: headline lines pivot up, shards surface from depth.
            const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
            intro
                .from(scope.querySelectorAll('.v2-hero-line'), {
                    autoAlpha: 0,
                    rotationX: -80,
                    yPercent: 70,
                    transformOrigin: '50% 100%',
                    transformPerspective: 900,
                    duration: 1.1,
                    stagger: 0.12,
                })
                .from(meta, { autoAlpha: 0, y: 26, duration: 0.8 }, '-=0.6')
                .from(shards, {
                    autoAlpha: 0,
                    z: -360,
                    scale: 0.8,
                    duration: 1.2,
                    stagger: 0.08,
                    clearProps: 'opacity,visibility',
                }, '-=0.9')
                .from(cue, { autoAlpha: 0, y: -14, duration: 0.6 }, '-=0.4');

            // Fly-through: pin the stage and dolly the camera as the user scrolls.
            const fly = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                    trigger: scope,
                    start: 'top top',
                    end: '+=130%',
                    pin: stage,
                    scrub: 0.9,
                    anticipatePin: 1,
                },
            });
            fly
                .to(headline, {
                    z: 340,
                    rotationX: 14,
                    autoAlpha: 0,
                    transformOrigin: '50% 20%',
                }, 0)
                .to(meta, { z: 200, autoAlpha: 0 }, 0.05)
                .to(shards, {
                    z: (i) => 520 + DEPTH_SHARDS[i % DEPTH_SHARDS.length].z * 2,
                    autoAlpha: 0,
                    stagger: 0.04,
                }, 0)
                .to(cue, { autoAlpha: 0, y: 30 }, 0);

            // Idle drift so the depth reads even before scrolling.
            shards.forEach((shard, index) => {
                gsap.to(shard, {
                    y: `+=${DEPTH_SHARDS[index % DEPTH_SHARDS.length].drift * 12}`,
                    duration: 3 + index * 0.6,
                    ease: 'sine.inOut',
                    yoyo: true,
                    repeat: -1,
                });
            });
        },
    });

    return (
        <section ref={sectionRef} className="relative" aria-label="Intro">
            <div className="v2-hero-stage relative flex min-h-screen w-full items-center justify-center overflow-hidden">
                <div
                    className="relative mx-auto w-full max-w-6xl px-6 py-24 text-center"
                    style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
                >
                    {DEPTH_SHARDS.map((shard) => (
                        <div
                            key={shard.label}
                            className="v2-hero-shard glass-tile pointer-events-none absolute hidden px-4 py-2.5 text-xs font-semibold tracking-wide sm:block"
                            style={{
                                left: shard.x,
                                top: shard.y,
                                transform: `translateZ(${shard.z}px)`,
                                color: shard.accent,
                                borderColor: `color-mix(in srgb, ${shard.accent} 35%, transparent)`,
                                boxShadow: `0 18px 48px -24px color-mix(in srgb, ${shard.accent} 45%, transparent)`,
                            }}
                            aria-hidden="true"
                        >
                            {shard.label}
                        </div>
                    ))}

                    <div className="v2-hero-headline" style={{ transformStyle: 'preserve-3d' }}>
                        <p className="v2-hero-line eyebrow mb-6 inline-flex items-center gap-2">
                            <FaSatelliteDish size={11} style={{ color: 'var(--status-success)' }} />
                            {resumeStatus || 'ONLINE'} · Portfolio V2
                        </p>
                        <h1
                            className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl lg:text-8xl"
                            style={{ color: 'var(--text-bright)' }}
                        >
                            <span className="v2-hero-line block">{name || 'Developer'}</span>
                            <span
                                className="v2-hero-line mt-3 block bg-clip-text text-transparent"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(120deg, var(--accent-cyan), var(--accent-purple) 55%, var(--accent-pink))',
                                }}
                            >
                                builds in depth.
                            </span>
                        </h1>
                    </div>

                    <div className="v2-hero-meta mt-8 flex flex-col items-center gap-6">
                        <div className="text-lg font-medium sm:text-2xl" style={{ color: 'var(--text-secondary)' }}>
                            <TypewriterEffect roles={homeRoles || []} />
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Link href="/projects" className="pill-solid">
                                Explore Projects
                            </Link>
                            {githubLink && (
                                <a
                                    href={githubLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="pill-ghost inline-flex items-center gap-2"
                                >
                                    <FaGithub size={14} /> GitHub
                                </a>
                            )}
                            <Link href="/" className="pill-ghost">
                                Classic Home
                            </Link>
                        </div>
                    </div>

                    <div
                        className="v2-hero-cue absolute inset-x-0 -bottom-6 mx-auto flex w-max items-center gap-2 text-xs font-medium uppercase tracking-[0.2em]"
                        style={{ color: 'var(--text-muted)' }}
                        aria-hidden="true"
                    >
                        Scroll to fly through <FaArrowDown size={10} />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default V2Hero;
