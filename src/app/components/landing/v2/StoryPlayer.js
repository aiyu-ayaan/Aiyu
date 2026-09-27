"use client";

import React, { useEffect, useState } from 'react';
import { FaPlay, FaPause, FaArrowDown } from 'react-icons/fa6';
import { useStoryAutoplay, toggle, pause, setSpeed, cycleSpeed, storyEndY, STORY_SPEEDS } from './storyAutoplay';
import { smoothScrollTo } from './motion';

const label = (speed) => `${speed}×`;

/**
 * Floating story controls: play / pause, speed (1× to 3×) and skip. They
 * sit in the bottom-centre slot while the reader is inside the story, on
 * every device, clear of the site's corner buttons. On the hero's first
 * and last screens the hero's own dock owns that slot (it has its own
 * "Play story" button) until playback starts.
 */
export default function StoryPlayer({ skipTo = 'v2-snapshot' }) {
    const { playing, speed, heroDock } = useStoryAutoplay();
    const [inStory, setInStory] = useState(true);

    useEffect(() => {
        let frame = 0;
        const measure = () => {
            frame = 0;
            setInStory(window.scrollY < storyEndY() - 4);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(measure);
        };
        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    // Leaving the page (route change) must not leave a scroll loop running.
    useEffect(() => () => pause(), []);

    const visible = inStory && (playing || !heroDock);

    const skip = () => {
        pause();
        const target = document.getElementById(skipTo);
        if (target) smoothScrollTo(target.getBoundingClientRect().top + window.scrollY);
    };

    return (
        <div
            data-story-player
            className="pointer-events-none fixed inset-x-0 bottom-[4.25rem] z-40 flex justify-center px-4 transition-[opacity,transform] duration-300 ease-out"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateY(12px)',
                visibility: visible ? 'visible' : 'hidden',
            }}
        >
            <div
                role="group"
                aria-label="Story playback"
                className="pointer-events-auto flex items-center gap-1 rounded-full border p-1 shadow-lg backdrop-blur-md"
                style={{ borderColor: 'var(--hairline)', backgroundColor: 'color-mix(in srgb, var(--bg-primary) 72%, transparent)' }}
            >
                <button
                    type="button"
                    onClick={toggle}
                    aria-pressed={playing}
                    aria-label={playing ? 'Pause the story' : 'Play the story'}
                    className="flex h-9 cursor-pointer items-center gap-2 rounded-full pl-3 pr-4 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.18em] transition-transform duration-100 active:scale-[0.96]"
                    style={{ backgroundColor: 'var(--text-bright)', color: 'var(--bg-primary)' }}
                >
                    <span className="relative inline-flex h-3 w-3 items-center justify-center">
                        <FaPlay size={10} className="absolute transition-all duration-200" style={{ opacity: playing ? 0 : 1, transform: playing ? 'scale(0.6)' : 'none' }} />
                        <FaPause size={10} className="absolute transition-all duration-200" style={{ opacity: playing ? 1 : 0, transform: playing ? 'none' : 'scale(0.6)' }} />
                    </span>
                    <span className="w-[5.5ch] text-left">{playing ? 'pause' : 'play'}</span>
                </button>

                {/* Speed: a segmented control where there is room, one
                    cycling button on phones. */}
                <div className="hidden items-center sm:flex" role="radiogroup" aria-label="Playback speed">
                    {STORY_SPEEDS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            role="radio"
                            aria-checked={speed === s}
                            onClick={() => setSpeed(s)}
                            className="h-9 min-w-[2.6rem] cursor-pointer rounded-full px-2 font-mono text-[0.7rem] tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.94]"
                            style={{
                                backgroundColor: speed === s ? 'color-mix(in srgb, var(--text-bright) 14%, transparent)' : 'transparent',
                                color: speed === s ? 'var(--text-bright)' : 'var(--text-muted)',
                            }}
                        >
                            {label(s)}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={cycleSpeed}
                    aria-label={`Playback speed ${label(speed)}, tap to change`}
                    className="h-9 min-w-[2.8rem] cursor-pointer rounded-full px-2 font-mono text-[0.72rem] tabular-nums transition-transform duration-100 active:scale-[0.94] sm:hidden"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--text-bright) 12%, transparent)', color: 'var(--text-bright)' }}
                >
                    {label(speed)}
                </button>

                <span className="mx-0.5 h-5 w-px" style={{ backgroundColor: 'var(--hairline)' }} aria-hidden="true" />

                <button
                    type="button"
                    onClick={skip}
                    aria-label="Skip the story"
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] transition-transform duration-100 active:scale-[0.96]"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <span className="hidden sm:inline">skip</span>
                    <FaArrowDown size={10} />
                </button>
            </div>
        </div>
    );
}
