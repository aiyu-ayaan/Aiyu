"use client";

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { FaArrowDown, FaGithub, FaSatelliteDish, FaDesktop, FaXmark, FaArrowRight } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';
import TypewriterEffect from '../../shared/TypewriterEffect';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import { BOOT_READY_EVENT, isBootReady } from '../../shared/bootSignal';

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
    const [showDesktopPrompt, setShowDesktopPrompt] = useState(false);
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
            // Targets are INNER wrappers (.v2-hero-*-in) — the fly-through
            // below animates the outer elements, and sharing targets between
            // a time-based intro and a scrubbed timeline makes the scrub
            // capture/fight the intro's hidden start values (shards vanished
            // after a scroll round-trip). Disjoint targets can't conflict.
            //
            // Built paused: the boot splash covers the hero for ~3s, so playing
            // now would burn the entrance behind the overlay. It starts on the
            // boot-ready handoff (or immediately if the splash was skipped).
            const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, paused: true });
            intro
                .from(scope.querySelectorAll('.v2-hero-line'), {
                    autoAlpha: 0,
                    rotationX: -46,
                    yPercent: 52,
                    transformOrigin: '50% 100%',
                    transformPerspective: 900,
                    duration: 1.1,
                    stagger: 0.1,
                })
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

            // Start on the boot handoff. If the splash already finished (or was
            // skipped for this tab), the flag is set — play right away.
            let teardownIntro;
            if (isBootReady()) {
                intro.play();
            } else {
                const startIntro = () => intro.play();
                window.addEventListener(BOOT_READY_EVENT, startIntro, { once: true });
                // Returned to useV2Fx as teardown (unmount before the handoff).
                teardownIntro = () => window.removeEventListener(BOOT_READY_EVENT, startIntro);
            }

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
                .fromTo(shards, {
                    z: (i) => DEPTH_SHARDS[i % DEPTH_SHARDS.length].z,
                    autoAlpha: 1,
                }, {
                    z: (i) => 520 + DEPTH_SHARDS[i % DEPTH_SHARDS.length].z * 2,
                    autoAlpha: 0,
                    stagger: 0.04,
                    immediateRender: false,
                }, 0)
                .fromTo(cue, { y: 0, autoAlpha: 1 }, {
                    autoAlpha: 0,
                    y: 30,
                    immediateRender: false,
                }, 0);

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

            return teardownIntro;
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
                            <span className="v2-hero-shard-in block">{shard.label}</span>
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

                    <div className="v2-hero-meta mt-8">
                        <div className="v2-hero-meta-in flex flex-col items-center gap-6">
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
                            <button
                                type="button"
                                onClick={() => setShowDesktopPrompt(true)}
                                className="pill-ghost inline-flex cursor-pointer items-center gap-2"
                            >
                                <FaDesktop size={14} /> Desktop Mode
                            </button>
                        </div>
                        </div>
                    </div>

                    <div
                        className="v2-hero-cue absolute inset-x-0 -bottom-6 mx-auto w-max text-xs font-medium uppercase tracking-[0.2em]"
                        style={{ color: 'var(--text-muted)' }}
                        aria-hidden="true"
                    >
                        <span className="v2-hero-cue-in flex items-center gap-2">
                            Scroll to fly through <FaArrowDown size={10} />
                        </span>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showDesktopPrompt && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDesktopPrompt(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent-cyan)_35%,transparent)] bg-[var(--bg-surface)] p-6 shadow-2xl backdrop-blur-xl sm:p-8 text-left"
                            style={{
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px color-mix(in srgb, var(--accent-cyan) 20%, transparent)',
                            }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="desktop-dialog-title"
                        >
                            <button
                                type="button"
                                onClick={() => setShowDesktopPrompt(false)}
                                className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-bright)]"
                                aria-label="Close dialog"
                            >
                                <FaXmark size={14} />
                            </button>

                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent-cyan)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)] px-3 py-1 text-xs font-semibold font-mono text-[var(--accent-cyan)]">
                                <FaDesktop size={12} />
                                <span>Aiyu OS · Web Desktop</span>
                            </div>

                            <h3 id="desktop-dialog-title" className="text-2xl font-bold text-[var(--text-bright)] sm:text-3xl">
                                Launch Desktop OS?
                            </h3>

                            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                                Switch to an interactive, windowed Web OS environment simulating Windows 11 with built-in apps, code editor, terminal, browser, and live widgets.
                            </p>

                            <div className="mt-5 space-y-2.5 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-4 text-xs sm:text-sm">
                                <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                                    <span className="font-bold text-[var(--accent-cyan)]">•</span>
                                    <span>Multi-window multitasking with drag, minimize & resize</span>
                                </div>
                                <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                                    <span className="font-bold text-[var(--accent-purple)]">•</span>
                                    <span>Interactive Apps (Terminal, Code Editor, Browser & Settings)</span>
                                </div>
                                <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                                    <span className="font-bold text-[var(--accent-orange)]">•</span>
                                    <span>Custom wallpapers and widgets feed</span>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDesktopPrompt(false)}
                                    className="pill-ghost cursor-pointer text-xs sm:text-sm"
                                >
                                    Cancel
                                </button>
                                <Link
                                    href="/desktop"
                                    onClick={() => setShowDesktopPrompt(false)}
                                    className="pill-solid inline-flex items-center gap-2 text-xs sm:text-sm"
                                >
                                    <span>Launch Desktop</span>
                                    <FaArrowRight size={12} />
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default V2Hero;
