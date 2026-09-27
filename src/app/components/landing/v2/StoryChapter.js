"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowDown } from 'react-icons/fa6';
import HyperFramesStage from '../../shared/HyperFramesStage';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { gsap, ScrollTrigger, useGSAP, isLiteDevice, refreshScrollTriggersSoon } from './gsap3d';
import { smoothScrollTo } from './motion';

// Share of the pin spent playing; the rest holds the last frame so the
// chapter's final line can be read before the next one scrolls in.
const PLAY_SHARE = 0.9;
// Scroll length per film second, in % of the viewport height (the hero film
// uses about the same rate, so every chapter scrolls at one speed).
const PIN_PER_SECOND = 34;

/**
 * One chapter of the life story: a pinned, scroll-scrubbed HyperFrames film.
 *
 * - The opening (0 → introEnd) plays while the chapter scrolls up into view,
 *   so it never arrives as an empty frame; the pin then scrubs the rest.
 * - The player mounts only while the chapter is within about a viewport of
 *   the screen and unmounts when it is far away, so a long story never runs
 *   more than one or two players at once.
 * - The DOM card is the chapter's real copy (SEO, screen readers). It is the
 *   whole chapter on reduced-motion / lite devices, and is shown while the
 *   film loads, then fades out once the film paints.
 */
const StoryChapter = ({ chapter, index, total, params, skipTo }) => {
    const { id, film: filmName, eyebrow, when, title, body, accent, image, duration, introEnd } = chapter;

    const sectionRef = useRef(null);
    const playerRef = useRef(null);
    const timeRef = useRef(0);
    const durationRef = useRef(duration);

    const [film, setFilm] = useState(false);
    const [near, setNear] = useState(false);
    const [painted, setPainted] = useState(false);
    const { prefersReducedMotion } = useDevicePerformance();

    useEffect(() => {
        setFilm(!prefersReducedMotion && !isLiteDevice());
    }, [prefersReducedMotion]);

    // Mount the player only near the viewport.
    useEffect(() => {
        const el = sectionRef.current;
        if (!film || !el || !('IntersectionObserver' in window)) return undefined;
        const io = new IntersectionObserver(
            ([entry]) => {
                setNear(entry.isIntersecting);
                if (!entry.isIntersecting) {
                    setPainted(false);
                    playerRef.current = null;
                }
            },
            { rootMargin: '120% 0px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [film]);

    // Skip seeks that would not change the frame (sub-frame at 60fps).
    const seek = useCallback((t) => {
        if (Math.abs(t - timeRef.current) < 1 / 120 && playerRef.current) return;
        timeRef.current = t;
        playerRef.current?.seek(t);
    }, []);

    const handleReady = useCallback((player) => {
        playerRef.current = player;
        if (Number.isFinite(player.duration) && player.duration > introEnd + 1) {
            durationRef.current = player.duration;
        }
        player.pause();
        player.seek(timeRef.current);
    }, [introEnd]);

    // `painted` fires when the player's loading panel hides, which can be
    // before the composition's first frame is on screen. Re-seek and reveal
    // once the player reports the new time (or after a short fallback), so
    // the card never hands off to a blank film.
    const handlePainted = useCallback((player) => {
        let done = false;
        const reveal = () => {
            if (done) return;
            done = true;
            player.removeEventListener('timeupdate', reveal);
            requestAnimationFrame(() => requestAnimationFrame(() => setPainted(true)));
        };
        player.addEventListener('timeupdate', reveal);
        player.seek(timeRef.current);
        window.setTimeout(reveal, 900);
    }, []);

    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!film || !section) return;

            // Lenis already smooths wheel input, so only native (touch)
            // scrolling gets a short catch-up; stacking both feels floaty.
            const proxy = { t: timeRef.current };
            const follow = window.__lenis
                ? (t) => seek(t)
                : gsap.quickTo(proxy, 't', { duration: 0.25, ease: 'power2.out', onUpdate: () => seek(proxy.t) });

            // The stage is CSS-sticky inside a tall section (see below), so this
            // trigger only reads progress. A ScrollTrigger pin would move the
            // stage in and out of its spacer on every refresh, and moving a
            // <hyperframes-player> in the DOM reloads its film.
            const pin = ScrollTrigger.create({
                trigger: section,
                start: 'top top',
                end: 'bottom bottom',
                onUpdate: (self) => {
                    const played = Math.min(1, self.progress / PLAY_SHARE);
                    follow(introEnd + played * (durationRef.current - introEnd));
                },
            });
            ScrollTrigger.create({
                trigger: section,
                start: 'top bottom',
                end: 'top top',
                onUpdate: (self) => {
                    if (pin.progress === 0) follow(self.progress * introEnd);
                },
            });
            // Chapters mount after the hero: re-sort so refresh runs in page order.
            refreshScrollTriggersSoon();
        },
        { scope: sectionRef, dependencies: [film, duration, introEnd], revertOnUpdate: true }
    );

    const showCard = !film || !painted;
    const pinLength = Math.round((duration - introEnd) * PIN_PER_SECOND);

    return (
        <section
            id={`story-${id}`}
            ref={sectionRef}
            className="relative"
            style={film ? { height: `calc(max(100svh, 560px) + ${pinLength}svh)` } : undefined}
            aria-labelledby={`story-${id}-title`}
        >
            <div className="story-stage sticky top-0 h-[100svh] min-h-[560px] w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {film && near && (
                    <HyperFramesStage
                        name={filmName}
                        params={params}
                        onReady={handleReady}
                        onPainted={handlePainted}
                        className="top-24 portrait:bottom-[6.75rem]"
                    />
                )}

                {/* The chapter's copy: visible without the film, kept in the
                    document for crawlers and screen readers once it plays.
                    It is opaque and sits over the film while that loads: the
                    film keeps rendering underneath (an iframe at opacity 0 is
                    not painted, so fading the film in would flash black). */}
                <div
                    className="absolute inset-0 z-[1] flex items-center justify-center px-6 transition-opacity duration-700"
                    style={{ opacity: showCard ? 1 : 0, backgroundColor: 'var(--bg-primary)', pointerEvents: showCard ? 'auto' : 'none' }}
                >
                    <div className="grid w-full max-w-5xl items-center gap-8 md:grid-cols-[auto_1fr] md:gap-14">
                        <div className="flex items-center gap-5 md:flex-col md:items-start">
                            {image ? (
                                <img src={image} alt="" width={96} height={96} className="h-20 w-20 rounded-[1.4rem] shadow-lg md:h-24 md:w-24" />
                            ) : null}
                            <p
                                className="font-mono text-[clamp(2.25rem,7vw,4.5rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums"
                                style={{ color: accent }}
                            >
                                {when}
                            </p>
                        </div>
                        <div>
                            <p className="mb-4 font-mono text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                                {eyebrow} <span aria-hidden="true">·</span> {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
                            </p>
                            <h2
                                id={`story-${id}-title`}
                                className="text-[clamp(2rem,5.2vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.035em]"
                                style={{ color: 'var(--text-bright)' }}
                            >
                                {title}
                            </h2>
                            <p className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                                {body}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom centre, clear of the site's floating corner buttons;
                    on portrait screens the film ends above it. */}
                {film && skipTo && (
                    <button
                        type="button"
                        onClick={() => {
                            const target = document.getElementById(skipTo);
                            if (target) smoothScrollTo(target.getBoundingClientRect().top + window.scrollY);
                        }}
                        className="absolute inset-x-0 bottom-[4.25rem] z-10 mx-auto inline-flex w-max cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.2em] opacity-70 backdrop-blur-md transition-[opacity,transform] duration-200 hover:opacity-100 active:scale-[0.97]"
                        style={{
                            borderColor: 'var(--hairline)',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 55%, transparent)',
                        }}
                    >
                        skip story <FaArrowDown size={9} />
                    </button>
                )}
            </div>
        </section>
    );
};

export default StoryChapter;
