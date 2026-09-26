"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FaArrowDown, FaArrowRight, FaGithub, FaWindows, FaForwardStep } from 'react-icons/fa6';
import TypewriterEffect from '../../shared/TypewriterEffect';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import HyperFramesStage from '../../shared/HyperFramesStage';
import { useV2Fx, isLiteDevice } from './gsap3d';
import DesktopPrompt from './DesktopPrompt';
import { BOOT_READY_EVENT, isBootReady } from '../../shared/bootSignal';

/**
 * V2 hero — the story film. The boot loader ends on a login prompt; this
 * stage opens on the same frame and plays the HyperFrames "story"
 * composition (hyperframes/story): hello → code on Linux → ship → reboot →
 * play on Windows. The opening line plays by itself after the boot handoff,
 * then scrolling scrubs the film while the stage is pinned, like a product
 * page. Live home data and the site theme flow into the film.
 *
 * A real DOM headline stays in the document for SEO and screen readers, and
 * is the whole hero on reduced-motion / lite devices, which never load the
 * film.
 */

const FILM_DURATION = 12;
// The opening "Hi, I'm …" line is fully on screen here; scroll takes over.
const INTRO_END = 1.6;

const V2Hero = ({ data, counts = {} }) => {
    const { name, homeRoles, githubLink, resumeStatus } = data || {};
    const displayName = name || 'Developer';
    const roles = Array.isArray(homeRoles) ? homeRoles : [];

    const sectionRef = useRef(null);
    const playerRef = useRef(null);
    const timeRef = useRef(0);
    const phaseRef = useRef('start');
    const skipRef = useRef(null);
    const introRef = useRef(null);

    const [film, setFilm] = useState(false);
    const [painted, setPainted] = useState(false);
    const [phase, setPhase] = useState('start');
    const [showDesktopPrompt, setShowDesktopPrompt] = useState(false);
    const { prefersReducedMotion } = useDevicePerformance();

    useEffect(() => {
        setFilm(!prefersReducedMotion && !isLiteDevice());
    }, [prefersReducedMotion]);

    const seek = useCallback((t) => {
        timeRef.current = t;
        playerRef.current?.seek(t);
    }, []);

    const syncPhase = useCallback((next) => {
        if (phaseRef.current === next) return;
        phaseRef.current = next;
        setPhase(next);
    }, []);

    const handleReady = useCallback((player) => {
        playerRef.current = player;
        player.pause();
        player.seek(timeRef.current);
    }, []);

    const handlePainted = useCallback(() => {
        setPainted(true);
        introRef.current?.();
    }, []);

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion || !film,
        dependencies: [film],
        extra: ({ gsap, ScrollTrigger, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const stage = scope.querySelector('.hero-stage');
            if (!stage) return;

            const span = FILM_DURATION - INTRO_END;
            let introTween;

            // Scroll drives a paused proxy tween through quickTo, so wheel
            // steps glide instead of jumping frame to frame.
            const proxy = { t: INTRO_END };
            const scrub = gsap.to(proxy, {
                t: FILM_DURATION,
                ease: 'none',
                paused: true,
                onUpdate: () => {
                    if (!introTween?.isActive()) seek(proxy.t);
                },
            });
            const follow = gsap.quickTo(scrub, 'progress', { duration: 0.5, ease: 'power3.out' });

            const st = ScrollTrigger.create({
                trigger: scope,
                start: 'top top',
                end: '+=420%',
                pin: stage,
                anticipatePin: 1,
                onUpdate: (self) => {
                    if (self.progress > 0.001) introTween?.kill();
                    follow(self.progress);
                    const t = INTRO_END + self.progress * span;
                    syncPhase(self.progress < 0.03 ? 'start' : t > 10.4 ? 'end' : 'mid');
                },
            });

            skipRef.current = () => window.scrollTo({ top: st.end + 2, behavior: 'smooth' });

            // Opening line plays by itself once the boot splash has cleared
            // AND the film has painted — whichever comes last starts it.
            let bootDone = isBootReady();
            let filmDone = false;
            const maybeIntro = () => {
                if (!bootDone || !filmDone || introTween) return;
                if (window.scrollY > st.start + 4) {
                    seek(INTRO_END + st.progress * span);
                    return;
                }
                const o = { t: 0 };
                introTween = gsap.to(o, {
                    t: INTRO_END,
                    duration: INTRO_END,
                    ease: 'none',
                    onUpdate: () => seek(o.t),
                });
            };
            const onBoot = () => {
                bootDone = true;
                maybeIntro();
            };
            introRef.current = () => {
                filmDone = true;
                maybeIntro();
            };
            if (!bootDone) window.addEventListener(BOOT_READY_EVENT, onBoot, { once: true });
            if (playerRef.current) introRef.current();

            return () => {
                window.removeEventListener(BOOT_READY_EVENT, onBoot);
                introRef.current = null;
                skipRef.current = null;
            };
        },
    });

    const filmParams = {
        name: displayName,
        roles: roles.slice(0, 2).join('|'),
        projects: counts.projects ?? 0,
        skills: counts.skills ?? 0,
        blogs: counts.blogs ?? 0,
    };

    const showDock = !film || phase !== 'mid';

    return (
        <section ref={sectionRef} className="relative" aria-labelledby="hero-title">
            <div className="hero-stage relative h-[100svh] min-h-[560px] w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {film && (
                    <HyperFramesStage
                        name="story"
                        params={filmParams}
                        onReady={handleReady}
                        onPainted={handlePainted}
                        className="top-[4.5rem] transition-opacity duration-700 sm:top-24"
                        style={{ opacity: painted ? 1 : 0 }}
                    />
                )}

                {/* DOM hero: the real headline. It is the visible hero until
                    the film paints (and always without the film); after that
                    it stays in the document for crawlers and screen readers. */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-700"
                    style={{ opacity: film && painted ? 0 : 1 }}
                >
                    <p className="mb-5 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        <span style={{ color: 'var(--status-success)' }}>$</span> whoami
                    </p>
                    <h1
                        id="hero-title"
                        className="text-[clamp(3rem,10vw,8.5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        Hi, I&apos;m {displayName}.
                    </h1>
                    <p className="mt-6 font-mono text-base sm:text-lg" style={{ color: 'var(--accent-cyan)' }}>
                        <TypewriterEffect roles={roles} />
                    </p>
                    <p className="mt-4 max-w-xl text-base sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        Writes code on Linux, plays on Windows.
                    </p>
                </div>

                {/* "Press start" dock: shown before the story starts and once
                    it reaches the Windows scene; hidden while it plays. */}
                <div
                    className="absolute inset-x-0 bottom-[12svh] z-10 flex justify-center px-4 transition-all duration-500 sm:bottom-[13vh] lg:justify-start lg:px-[4vmin]"
                    style={{
                        opacity: showDock ? 1 : 0,
                        transform: showDock ? 'none' : 'translateY(16px)',
                        visibility: showDock ? 'visible' : 'hidden',
                    }}
                >
                    <div
                        className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border p-2 backdrop-blur-md"
                        style={{ borderColor: 'var(--hairline)', backgroundColor: 'color-mix(in srgb, var(--bg-primary) 55%, transparent)' }}
                    >
                        <span className="hidden px-2 font-mono text-[0.7rem] uppercase tracking-[0.3em] sm:inline" style={{ color: 'var(--text-muted)' }}>
                            {phase === 'end' ? 'press start' : resumeStatus || 'online'}
                        </span>
                        <Link href="/projects" className="pill-solid inline-flex items-center gap-2">
                            Explore projects <FaArrowRight size={12} />
                        </Link>
                        {githubLink && (
                            <a href={githubLink} target="_blank" rel="noopener noreferrer" className="pill-ghost inline-flex items-center gap-2">
                                <FaGithub size={14} /> GitHub
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowDesktopPrompt(true)}
                            className="pill-ghost inline-flex cursor-pointer items-center gap-2"
                        >
                            <FaWindows size={13} /> Desktop mode
                        </button>
                    </div>
                </div>

                {film && (
                    <>
                        <div
                            className="pointer-events-none absolute inset-x-0 bottom-[6.5vmin] z-10 mx-auto w-max font-mono text-[0.68rem] uppercase tracking-[0.3em] transition-opacity duration-500"
                            style={{ color: 'var(--text-muted)', opacity: phase === 'start' ? 1 : 0 }}
                            aria-hidden="true"
                        >
                            <span className="flex items-center gap-2">
                                scroll to play <FaArrowDown size={10} className="animate-bounce" />
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => skipRef.current?.()}
                            className="absolute right-4 top-24 z-10 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] backdrop-blur-md transition-opacity duration-300 hover:opacity-100 sm:right-[4vmin]"
                            style={{
                                borderColor: 'var(--hairline)',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, transparent)',
                                opacity: phase === 'end' ? 0 : 0.75,
                            }}
                        >
                            skip story <FaForwardStep size={10} />
                        </button>
                    </>
                )}
            </div>

            <DesktopPrompt open={showDesktopPrompt} onClose={() => setShowDesktopPrompt(false)} />
        </section>
    );
};

export default V2Hero;
