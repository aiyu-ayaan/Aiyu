"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaArrowUp, FaGamepad } from 'react-icons/fa6';
import { SiPubg, SiRockstargames, SiValorant } from 'react-icons/si';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import SceneBackdrop from './SceneBackdrop';
import { Magnetic, SplitWords, smoothScrollTo } from './motion';
import { v2PublicPath } from '@/lib/siteVersion';

// Games shown on the Windows side of the story. Brand colours are the
// publishers' own; glyphs come from Simple Icons (CC0). See GAME_DISCLAIMER.
export const GAMES = [
    { name: 'VALORANT', genre: 'tactical shooter', Icon: SiValorant, color: '#FA4454' },
    { name: 'GTA V', genre: 'open world', Icon: SiRockstargames, color: '#FCAF17' },
    { name: 'PUBG', genre: 'battle royale', Icon: SiPubg, color: '#F4B942' },
];

export const GAME_DISCLAIMER =
    'VALORANT is a trademark of Riot Games, Inc. Grand Theft Auto V and the Rockstar Games logo are trademarks of Take-Two Interactive Software, Inc. PUBG is a trademark of KRAFTON, Inc. These names and logos are shown only to list games I play. This site is not affiliated with, sponsored or endorsed by Riot Games, Rockstar Games, Take-Two Interactive or KRAFTON, and all rights remain with their respective owners.';

/**
 * Closing chapter — the story ends back on the Windows side: a game's
 * CONTINUE? screen. The countdown is driven by scroll, and "player 2" (the
 * visitor) presses start to reach the contact page. Reduced motion shows the
 * final frame.
 */
const V2Continue = ({ config }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const digit = scope.querySelector('.cont-digit');
            const title = scope.querySelectorAll('.cont-title .split-inner');
            const rest = scope.querySelectorAll('.cont-rest');

            gsap.fromTo(title, { yPercent: 115, skewX: -12 }, {
                yPercent: 0,
                skewX: 0,
                duration: 1,
                ease: 'expo.out',
                stagger: 0.08,
                scrollTrigger: { trigger: scope, start: 'top 70%', toggleActions: 'play none none none' },
            });
            gsap.fromTo(rest, { autoAlpha: 0, y: 18 }, {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                ease: 'power3.out',
                stagger: 0.1,
                scrollTrigger: { trigger: scope, start: 'top 60%', toggleActions: 'play none none none' },
            });

            if (digit) {
                let last = '';
                gsap.to({}, {
                    scrollTrigger: {
                        trigger: scope,
                        start: 'top 75%',
                        end: 'bottom 60%',
                        scrub: true,
                        onUpdate: (self) => {
                            const n = Math.max(0, 9 - Math.floor(self.progress * 10));
                            const next = self.progress >= 0.98 ? '▶' : String(n);
                            if (next === last) return;
                            last = next;
                            digit.textContent = next;
                            gsap.fromTo(digit, { scale: 1.25, autoAlpha: 0.4 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2)', overwrite: true });
                        },
                    },
                });
            }
        },
    });

    const contactHref = v2PublicPath(config, '/contact-us');
    const projectsHref = v2PublicPath(config, '/projects');

    return (
        <section
            ref={sectionRef}
            className="relative isolate overflow-hidden py-24 sm:py-36"
            style={{
                borderTop: '1px solid var(--hairline)',
                backgroundImage:
                    'radial-gradient(60% 70% at 15% 100%, color-mix(in srgb, var(--accent-pink) 16%, transparent), transparent 70%), radial-gradient(50% 60% at 95% 0%, color-mix(in srgb, var(--accent-purple) 14%, transparent), transparent 70%)',
            }}
        >
            <SceneBackdrop accent="var(--accent-pink)" side="left" />
            {/* scanlines */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, var(--text-bright) 0 1px, transparent 1px 4px)' }}
            />

            <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1fr_auto] lg:px-10">
                <div>
                    <p className="cont-rest mb-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] sm:text-sm" style={{ color: 'var(--accent-pink)' }}>
                        <FaGamepad size={14} /> 22:47 — windows · game mode
                    </p>
                    <SplitWords
                        as="h2"
                        text="Continue?"
                        className="cont-title block text-[clamp(3.5rem,13vw,10rem)] font-black uppercase italic leading-[0.9] tracking-[-0.04em]"
                        style={{ color: 'var(--text-bright)' }}
                    />
                    <p className="cont-rest mt-8 max-w-xl text-lg leading-relaxed sm:text-xl" style={{ color: 'var(--text-tertiary)' }}>
                        Player 2 has entered the game. Got a project, a role, or a co-op idea? Press start.
                    </p>

                    <div className="cont-rest mt-10 flex flex-wrap items-center gap-3">
                        <Magnetic>
                            <Link href={contactHref} className="pill-solid inline-flex items-center gap-2">
                                Press start <FaArrowRight size={12} />
                            </Link>
                        </Magnetic>
                        <Magnetic strength={0.25}>
                            <Link href={projectsHref} className="pill-ghost inline-flex items-center gap-2">
                                Replay the projects
                            </Link>
                        </Magnetic>
                    </div>

                    <div className="cont-rest mt-12">
                        <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                            in rotation
                        </p>
                        <ul className="flex flex-wrap gap-3">
                            {GAMES.map(({ name, genre, Icon, color }) => (
                                <li
                                    key={name}
                                    className="flex items-center gap-3 rounded-xl border py-2 pl-2 pr-4"
                                    style={{ borderColor: 'var(--hairline)', backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 75%, transparent)' }}
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: '#111' }}>
                                        <Icon size={18} color={color} aria-hidden="true" />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-extrabold tracking-wide" style={{ color: 'var(--text-bright)' }}>{name}</span>
                                        <span className="block font-mono text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{genre}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <p id="game-disclaimer" className="mt-4 max-w-2xl text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {GAME_DISCLAIMER}
                        </p>
                    </div>

                    <p className="cont-rest mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                        <span><span style={{ color: 'var(--status-success)' }}>[A]</span> contact</span>
                        <button
                            type="button"
                            onClick={() => smoothScrollTo(0)}
                            className="inline-flex cursor-pointer items-center gap-1.5 uppercase"
                        >
                            <span style={{ color: 'var(--status-error, var(--accent-pink))' }}>[B]</span> back to boot <FaArrowUp size={9} />
                        </button>
                    </p>
                </div>

                <div className="flex justify-center lg:justify-end" aria-hidden="true">
                    <span
                        className="cont-digit block w-[1.2ch] text-center text-[clamp(8rem,26vw,18rem)] font-black leading-none tabular-nums"
                        style={{ color: 'transparent', WebkitTextStroke: '2px var(--accent-pink)' }}
                    >
                        9
                    </span>
                </div>
            </div>
        </section>
    );
};

export default V2Continue;
