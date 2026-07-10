"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { FaArrowDown, FaGithub, FaTerminal } from 'react-icons/fa6';
import TypewriterEffect from '../../shared/TypewriterEffect';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import V2MatrixRain from './V2MatrixRain';

/**
 * V2 hero: a pinned 3D terminal stage. Matrix rain and a phosphor grid sit
 * behind a boot log, a scramble-decrypted name, and floating HUD chips at
 * different camera depths; scrolling flies the camera through the stack —
 * foreground chips sweep past, the headline recedes and tilts, and the scroll
 * cue hands off to the telemetry chapter. Lite / reduced-motion devices get
 * the same layout, static and unpinned, with the FX layers hidden by CSS.
 */
const DEPTH_CHIPS = [
    { label: '[gsap@3.15 --scrub]', z: 160, x: '6%', y: '18%', accent: 'var(--accent-cyan)', drift: -1.4 },
    { label: '<NextJS route="/" />', z: 90, x: '72%', y: '14%', accent: 'var(--accent-purple)', drift: -0.9 },
    { label: '{ perf: "60fps" }', z: 220, x: '76%', y: '68%', accent: 'var(--accent-orange)', drift: -1.8 },
    { label: '0xC0FFEE', z: 60, x: '7%', y: '72%', accent: 'var(--accent-pink)', drift: -0.6 },
];

const BOOT_LINES = [
    '[ 0.001s ] mount /portfolio .......... OK',
    '[ 0.042s ] load gsap.scrolltrigger ... OK',
    '[ 0.108s ] spawn matrix_rain ......... OK',
    '[ 0.233s ] render --mode=deep ........ OK',
];

const V2Hero = ({ data }) => {
    const { name, homeRoles, githubLink, resumeStatus } = data || {};
    const sectionRef = useRef(null);
    const { prefersReducedMotion, isLite, ready } = useDevicePerformance();
    const displayName = name || 'Developer';

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;

            const stage = scope.querySelector('.v2-hero-stage');
            const headline = scope.querySelector('.v2-hero-headline');
            const meta = scope.querySelector('.v2-hero-meta');
            const chips = scope.querySelectorAll('.v2-hero-shard');
            const cue = scope.querySelector('.v2-hero-cue');
            const boot = scope.querySelector('.v2-hero-boot');
            const fx = scope.querySelector('.v2-hero-fx');
            if (!stage || !headline) return;

            // Entrance: headline lines pivot up, chips surface from depth.
            // Targets are INNER wrappers (.v2-hero-*-in) — the fly-through
            // below animates the outer elements, and sharing targets between
            // a time-based intro and a scrubbed timeline makes the scrub
            // capture/fight the intro's hidden start values (shards vanished
            // after a scroll round-trip). Disjoint targets can't conflict.
            const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
            intro
                .from(scope.querySelectorAll('.v2-hero-boot-line'), {
                    autoAlpha: 0,
                    x: -14,
                    duration: 0.45,
                    stagger: 0.12,
                })
                .from(scope.querySelectorAll('.v2-hero-line'), {
                    autoAlpha: 0,
                    rotationX: -46,
                    yPercent: 52,
                    transformOrigin: '50% 100%',
                    transformPerspective: 900,
                    duration: 1.1,
                    stagger: 0.1,
                }, '-=0.3')
                .from(scope.querySelector('.v2-hero-meta-in'), { autoAlpha: 0, y: 22, duration: 0.9 }, '-=0.7')
                .from(scope.querySelectorAll('.v2-hero-shard-in'), {
                    autoAlpha: 0,
                    z: -240,
                    scale: 0.92,
                    transformPerspective: 900,
                    duration: 1.2,
                    stagger: 0.08,
                }, '-=0.95')
                .from(scope.querySelector('.v2-hero-cue-in'), { autoAlpha: 0, y: -14, duration: 0.6 }, '-=0.4');

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
            // fromTo (not .to): the scrubbed timeline renders once at creation,
            // while the intro still has these elements at autoAlpha 0 — a .to
            // would capture THAT as its start value and scrub back to invisible
            // when the user returns to the top. Declare the resting state
            // explicitly instead; immediateRender:false keeps the intro intact.
            fly
                .fromTo(headline, { z: 0, rotationX: 0, autoAlpha: 1 }, {
                    z: 340,
                    rotationX: 14,
                    autoAlpha: 0,
                    transformOrigin: '50% 20%',
                    immediateRender: false,
                }, 0)
                .fromTo(meta, { z: 0, y: 0, autoAlpha: 1 }, {
                    z: 200,
                    autoAlpha: 0,
                    immediateRender: false,
                }, 0.05)
                .fromTo(chips, {
                    z: (i) => DEPTH_CHIPS[i % DEPTH_CHIPS.length].z,
                    autoAlpha: 1,
                }, {
                    z: (i) => 520 + DEPTH_CHIPS[i % DEPTH_CHIPS.length].z * 2,
                    autoAlpha: 0,
                    stagger: 0.04,
                    immediateRender: false,
                }, 0)
                .fromTo(cue, { y: 0, autoAlpha: 1 }, {
                    autoAlpha: 0,
                    y: 30,
                    immediateRender: false,
                }, 0);

            if (boot) {
                fly.fromTo(boot, { autoAlpha: 1, x: 0 }, { autoAlpha: 0, x: -40, immediateRender: false }, 0);
            }
            // The rain/grid layer dims as the camera dives past it, selling
            // the idea that the backdrop belongs to this depth slice only.
            if (fx) {
                fly.fromTo(fx, { autoAlpha: 1 }, { autoAlpha: 0.15, immediateRender: false }, 0.1);
            }

            // Idle drift so the depth reads even before scrolling.
            chips.forEach((chip, index) => {
                gsap.to(chip, {
                    y: `+=${DEPTH_CHIPS[index % DEPTH_CHIPS.length].drift * 12}`,
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
                <div className="v2-hero-fx pointer-events-none absolute inset-0" aria-hidden="true">
                    <div className="v2-term-grid" />
                    {ready && !isLite && !prefersReducedMotion && <V2MatrixRain opacity={0.32} />}
                    <div className="v2-term-scanlines" />
                </div>

                <div
                    className="relative mx-auto w-full max-w-6xl px-6 py-24 text-center"
                    style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
                >
                    {DEPTH_CHIPS.map((chip) => (
                        <div
                            key={chip.label}
                            className="v2-hero-shard v2-hud-chip pointer-events-none absolute hidden px-4 py-2.5 text-xs font-semibold tracking-wide sm:block"
                            style={{
                                left: chip.x,
                                top: chip.y,
                                transform: `translateZ(${chip.z}px)`,
                                color: chip.accent,
                                borderColor: `color-mix(in srgb, ${chip.accent} 35%, transparent)`,
                                boxShadow: `0 18px 48px -24px color-mix(in srgb, ${chip.accent} 45%, transparent)`,
                            }}
                            aria-hidden="true"
                        >
                            <span className="v2-hero-shard-in block">{chip.label}</span>
                        </div>
                    ))}

                    <div className="v2-hero-headline" style={{ transformStyle: 'preserve-3d' }}>
                        <p className="v2-hero-line eyebrow mb-4 inline-flex items-center gap-2">
                            <span
                                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                                style={{ backgroundColor: 'var(--status-success)' }}
                            />
                            {resumeStatus || 'ONLINE'} · TTY1 · PORTFOLIO_V2
                        </p>
                        <p className="v2-hero-line mb-6 font-mono text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--status-success)' }}>root@portfolio</span>
                            :<span style={{ color: 'var(--accent-cyan)' }}>~</span>$ whoami
                        </p>
                        <h1
                            className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl lg:text-8xl"
                            style={{ color: 'var(--text-bright)' }}
                        >
                            <span
                                className="v2-hero-line v2-glitch block"
                                data-text={displayName}
                                data-v2-scramble="1.4"
                            >
                                {displayName}
                            </span>
                            <span
                                className="v2-hero-line mt-3 block bg-clip-text text-transparent"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(120deg, var(--accent-cyan), var(--accent-purple) 55%, var(--accent-pink))',
                                }}
                            >
                                compiles ideas into software.
                            </span>
                        </h1>
                    </div>

                    <div className="v2-hero-meta mt-8">
                        <div className="v2-hero-meta-in flex flex-col items-center gap-6">
                            <div className="font-mono text-lg font-medium sm:text-2xl" style={{ color: 'var(--text-secondary)' }}>
                                <span style={{ color: 'var(--status-success)' }}>$ </span>
                                <TypewriterEffect roles={homeRoles || []} />
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-3 font-mono">
                                <Link href="/projects" className="pill-solid inline-flex items-center gap-2">
                                    <FaTerminal size={12} /> ./explore --projects
                                </Link>
                                {githubLink && (
                                    <a
                                        href={githubLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="pill-ghost inline-flex items-center gap-2"
                                    >
                                        <FaGithub size={14} /> git clone
                                    </a>
                                )}
                                <Link href="/" className="pill-ghost">
                                    cd /classic
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div
                        className="v2-hero-cue absolute inset-x-0 -bottom-6 mx-auto w-max font-mono text-xs font-medium uppercase tracking-[0.2em]"
                        style={{ color: 'var(--text-muted)' }}
                        aria-hidden="true"
                    >
                        <span className="v2-hero-cue-in flex items-center gap-2">
                            scroll --deeper <FaArrowDown size={10} />
                        </span>
                    </div>
                </div>

                <div
                    className="v2-hero-boot pointer-events-none absolute bottom-8 left-8 hidden text-left font-mono text-[0.7rem] leading-relaxed lg:block"
                    style={{ color: 'var(--text-muted)' }}
                    aria-hidden="true"
                >
                    {BOOT_LINES.map((line) => (
                        <p key={line} className="v2-hero-boot-line whitespace-pre">
                            {line.replace(' OK', '')}
                            <span style={{ color: 'var(--status-success)' }}> OK</span>
                        </p>
                    ))}
                    <p className="v2-hero-boot-line">
                        <span style={{ color: 'var(--status-success)' }}>$</span>
                        <span className="v2-caret" style={{ height: '0.9em', width: '0.5em' }} />
                    </p>
                </div>
            </div>
        </section>
    );
};

export default V2Hero;
