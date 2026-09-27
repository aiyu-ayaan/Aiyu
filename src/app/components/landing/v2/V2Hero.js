"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FaArrowDown, FaArrowRight, FaGithub, FaWindows, FaPlay } from 'react-icons/fa6';
import TypewriterEffect from '../../shared/TypewriterEffect';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import HyperFramesStage from '../../shared/HyperFramesStage';
import { useV2Fx, isLiteDevice } from './gsap3d';
import DesktopPrompt from './DesktopPrompt';
import { smoothScrollTo } from './motion';
import { BOOT_READY_EVENT, isBootReady } from '../../shared/bootSignal';
import { useStoryAutoplay, play as playStory, setHeroDock } from './storyAutoplay';

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

// Fallback only: the real length is read from the player once it is ready,
// so the scroll mapping always matches the film that actually loaded.
const FILM_DURATION = 16;
// The opening "Hi, I'm …" line is fully on screen here; scroll takes over.
const INTRO_END = 1.6;
// The last stretch before the film ends is the player card (press start).
const END_SCENE_LEAD = 1.7;
// Share of the pin spent playing the film; the rest holds the final frame
// so the ending is readable before the page moves on.
const PLAY_SHARE = 0.9;

const V2Hero = ({ data, counts = {} }) => {
    const { name, homeRoles, githubLink, resumeStatus } = data || {};
    const displayName = name || 'Developer';
    const roles = Array.isArray(homeRoles) ? homeRoles : [];

    const sectionRef = useRef(null);
    const playerRef = useRef(null);
    const timeRef = useRef(0);
    const phaseRef = useRef('start');
    const introRef = useRef(null);

    const [film, setFilm] = useState(false);
    const [painted, setPainted] = useState(false);
    const [phase, setPhase] = useState('start');
    const [showDesktopPrompt, setShowDesktopPrompt] = useState(false);
    const { prefersReducedMotion } = useDevicePerformance();

    useEffect(() => {
        setFilm(!prefersReducedMotion && !isLiteDevice());
    }, [prefersReducedMotion]);

    // Skip seeks that would not change the frame (sub-frame at 60fps).
    const seek = useCallback((t) => {
        if (Math.abs(t - timeRef.current) < 1 / 120 && playerRef.current) return;
        timeRef.current = t;
        playerRef.current?.seek(t);
    }, []);

    const syncPhase = useCallback((next) => {
        if (phaseRef.current === next) return;
        phaseRef.current = next;
        setPhase(next);
    }, []);

    const durationRef = useRef(FILM_DURATION);

    const handleReady = useCallback((player) => {
        playerRef.current = player;
        if (Number.isFinite(player.duration) && player.duration > INTRO_END + 1) {
            durationRef.current = player.duration;
        }
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

            let introTween;
            const filmTime = (progress) => {
                const played = Math.min(1, progress / PLAY_SHARE);
                return INTRO_END + played * (durationRef.current - INTRO_END);
            };

            // Scroll drives a paused proxy tween. Lenis already smooths wheel
            // input on desktop, so only touch (native scroll) gets a short
            // catch-up — stacking both is what makes a scrub feel floaty.
            const proxy = { p: 0 };
            const scrub = gsap.to(proxy, {
                p: 1,
                ease: 'none',
                paused: true,
                onUpdate: () => {
                    if (!introTween?.isActive()) seek(filmTime(proxy.p));
                },
            });
            const follow = window.__lenis
                ? (value) => scrub.progress(value)
                : gsap.quickTo(scrub, 'progress', { duration: 0.25, ease: 'power2.out' });

            const st = ScrollTrigger.create({
                trigger: scope,
                start: 'top top',
                end: '+=560%',
                pin: stage,
                anticipatePin: 1,
                onUpdate: (self) => {
                    if (self.progress > 0.001) introTween?.kill();
                    follow(self.progress);
                    const t = filmTime(self.progress);
                    const endScene = durationRef.current - END_SCENE_LEAD;
                    syncPhase(self.progress < 0.03 ? 'start' : t > endScene ? 'end' : 'mid');
                },
            });

            // Opening line plays by itself once the boot splash has cleared
            // AND the film has painted — whichever comes last starts it.
            let bootDone = isBootReady();
            let filmDone = false;
            const maybeIntro = () => {
                if (!bootDone || !filmDone || introTween) return;
                if (window.scrollY > st.start + 4) {
                    seek(filmTime(st.progress));
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
    const { playing } = useStoryAutoplay();
    // While the dock is up and on screen it owns the bottom slot; once the
    // story plays (or the hero scrolls away) the StoryPlayer takes over.
    const dockRef = useRef(null);
    const [dockInView, setDockInView] = useState(true);
    useEffect(() => {
        const el = dockRef.current;
        if (!el || !('IntersectionObserver' in window)) return undefined;
        const io = new IntersectionObserver(([entry]) => setDockInView(entry.isIntersecting), { threshold: 0.5 });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    useEffect(() => {
        setHeroDock(showDock && dockInView);
    }, [showDock, dockInView]);
    useEffect(() => () => setHeroDock(false), []);
    const dockVisible = showDock && !playing;

    return (
        <section ref={sectionRef} className="relative" aria-labelledby="hero-title">
            <div className="hero-stage relative h-[100svh] min-h-[560px] w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {film && (
                    <HyperFramesStage
                        name="story"
                        params={filmParams}
                        onReady={handleReady}
                        onPainted={handlePainted}
                        className="top-24 transition-opacity duration-700 portrait:bottom-[9.75rem]"
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
                    <div className="mt-6 font-mono text-base sm:text-lg" style={{ color: 'var(--accent-cyan)' }}>
                        <TypewriterEffect roles={roles} />
                    </div>
                    <p className="mt-4 max-w-xl text-base sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        Writes code on Linux, plays on Windows.
                    </p>
                </div>

                {/* "Press start" dock: shown before the story starts and once
                    it reaches the Windows scene; hidden while it plays. It
                    shares one bottom-centre slot with the StoryPlayer, and on
                    portrait screens it stays narrow enough to clear the site's
                    floating side pills and sits in a band the film leaves free.
                    The trademark notice rides in it for the game scene. */}
                <div
                    ref={dockRef}
                    className="absolute inset-x-0 bottom-[13vh] z-10 flex justify-center px-4 transition-all duration-500 portrait:bottom-[4.25rem] lg:justify-start lg:px-[4vmin]"
                    style={{
                        opacity: dockVisible ? 1 : 0,
                        transform: dockVisible ? 'none' : 'translateY(16px)',
                        visibility: dockVisible ? 'visible' : 'hidden',
                    }}
                >
                    <div
                        className="flex max-w-[19.5rem] flex-col items-center gap-1.5 rounded-2xl border p-2 backdrop-blur-md sm:max-w-none"
                        style={{ borderColor: 'var(--hairline)', backgroundColor: 'color-mix(in srgb, var(--bg-primary) 60%, transparent)' }}
                    >
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                            <span className="hidden px-2 font-mono text-[0.7rem] uppercase tracking-[0.3em] sm:inline" style={{ color: 'var(--text-muted)' }}>
                                {phase === 'end' ? 'press start' : resumeStatus || 'online'}
                            </span>
                            <button
                                type="button"
                                onClick={playStory}
                                className="pill-solid inline-flex cursor-pointer items-center gap-2 whitespace-nowrap max-sm:px-4!"
                            >
                                <FaPlay size={10} /> <span className="sm:hidden">Play</span>
                                <span className="hidden sm:inline">Play story</span>
                            </button>
                            <Link href="/projects" className="pill-ghost inline-flex items-center gap-2 whitespace-nowrap max-sm:px-3.5!">
                                <span className="sm:hidden">Projects</span>
                                <span className="hidden sm:inline">Explore projects</span>
                                <FaArrowRight size={12} />
                            </Link>
                            {githubLink && (
                                <a href={githubLink} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="pill-ghost inline-flex items-center gap-2 max-sm:px-3!">
                                    <FaGithub size={14} /> <span className="hidden sm:inline">GitHub</span>
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowDesktopPrompt(true)}
                                aria-label="Desktop mode"
                                className="pill-ghost inline-flex cursor-pointer items-center gap-2 max-sm:px-3!"
                            >
                                <FaWindows size={13} /> <span className="hidden sm:inline">Desktop mode</span>
                            </button>
                        </div>
                        {film && phase === 'end' && (
                            <button
                                type="button"
                                onClick={() => {
                                    const target = document.getElementById('v2-continue');
                                    if (target) smoothScrollTo(target.getBoundingClientRect().top + window.scrollY - 80);
                                }}
                                className="inline-flex cursor-pointer items-center gap-1.5 px-2 pb-0.5 text-center font-mono text-[0.6rem] leading-tight transition-opacity hover:opacity-100"
                                style={{ color: 'var(--text-tertiary)', opacity: 0.85 }}
                            >
                                <span className="font-sans text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>™</span>
                                Game names &amp; logos belong to their owners · notice ↓
                            </button>
                        )}
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

                    </>
                )}
            </div>

            <DesktopPrompt open={showDesktopPrompt} onClose={() => setShowDesktopPrompt(false)} />
        </section>
    );
};

export default V2Hero;
