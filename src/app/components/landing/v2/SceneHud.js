"use client";

import React, { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from './gsap3d';
import { motionDisabled } from './motion';

// Home chapters after the film, in page order (ids are the lazy-section wrappers).
const CHAPTERS = [
    { id: 'v2-snapshot', label: 'system', accent: 'var(--status-success)' },
    { id: 'v2-status', label: 'status', accent: 'var(--accent-purple)' },
    { id: 'v2-tech', label: 'stack', accent: 'var(--accent-orange)' },
    { id: 'v2-about', label: 'about', accent: 'var(--accent-pink)' },
    { id: 'v2-showcase', label: 'workspaces', accent: 'var(--accent-cyan)' },
    { id: 'v2-projects', label: 'projects', accent: 'var(--accent-cyan)' },
    { id: 'v2-blogs', label: 'notes', accent: 'var(--accent-purple)' },
    { id: 'v2-continue', label: 'continue', accent: 'var(--accent-pink)' },
];

// One "second" of timecode per viewport scrolled, 24 frames each — the same
// readout the story film shows, so the page feels like the film running on.
const formatTimecode = (px) => {
    const seconds = Math.max(0, px / window.innerHeight);
    const whole = Math.floor(seconds);
    const mm = String(Math.floor(whole / 60)).padStart(2, '0');
    const ss = String(whole % 60).padStart(2, '0');
    const ff = String(Math.floor((seconds % 1) * 24)).padStart(2, '0');
    return `${mm}:${ss}:${ff}`;
};

/**
 * Fixed chapter rail for the home page, the DOM twin of the film's HUD:
 * ● REC + current chapter, one progress bar per chapter, and a running
 * timecode. It fades in once the film hands off (first chapter reaches the
 * viewport) and out at the footer. A chapter missing from the page (a
 * section disabled in admin) keeps an empty bar. Hidden for reduced motion.
 */
const SceneHud = () => {
    const ref = useRef(null);

    useGSAP(
        () => {
            const root = ref.current;
            if (!root || motionDisabled()) return;

            const present = CHAPTERS.filter((chapter) => document.getElementById(chapter.id));
            if (!present.length) return;

            const label = root.querySelector('.hud-label');
            const dot = root.querySelector('.hud-dot');
            const tc = root.querySelector('.hud-tc');
            const first = document.getElementById(present[0].id);
            const last = document.getElementById(present[present.length - 1].id);

            gsap.set(root, { autoAlpha: 0, y: 12 });
            ScrollTrigger.create({
                trigger: first,
                start: 'top 70%',
                endTrigger: last,
                end: 'bottom 60%',
                onToggle: (self) => gsap.to(root, { autoAlpha: self.isActive ? 1 : 0, y: self.isActive ? 0 : 12, duration: 0.4, ease: 'power2.out', overwrite: true }),
                onUpdate: () => {
                    if (tc) tc.textContent = formatTimecode(window.scrollY);
                },
            });

            // Bars are filled by direct DOM writes, keyed by chapter id.
            requestAnimationFrame(() => {
                present.forEach((chapter, index) => {
                    const fill = root.querySelector(`[data-hud="${chapter.id}"] .hud-fill`);
                    const el = document.getElementById(chapter.id);
                    ScrollTrigger.create({
                        trigger: el,
                        start: 'top 55%',
                        end: 'bottom 55%',
                        onUpdate: (self) => {
                            if (fill) fill.style.transform = `scaleX(${self.progress})`;
                        },
                        onToggle: (self) => {
                            if (!self.isActive) return;
                            if (label) label.textContent = `${String(index + 1).padStart(2, '0')} ${chapter.label}`;
                            if (dot) dot.style.backgroundColor = chapter.accent;
                        },
                    });
                });
                ScrollTrigger.sort();
                ScrollTrigger.refresh();
            });
        },
        { scope: ref }
    );

    return (
        <div
            ref={ref}
            aria-hidden="true"
            className="pointer-events-none fixed bottom-3 left-4 right-20 z-40 flex items-center gap-4 rounded-full border px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] backdrop-blur-md sm:left-6 sm:right-24 sm:text-[0.66rem]"
            style={{
                opacity: 0,
                visibility: 'hidden',
                borderColor: 'var(--hairline)',
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 62%, transparent)',
                color: 'var(--text-muted)',
            }}
        >
            <span className="flex shrink-0 items-center gap-2">
                <span className="hud-dot h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--accent-pink)' }} />
                <span className="hidden sm:inline">rec</span>
                <span className="hud-label" style={{ color: 'var(--text-primary)' }}>01 system</span>
            </span>
            <span className="flex flex-1 items-center gap-1.5">
                {CHAPTERS.map((chapter) => (
                    <span key={chapter.id} data-hud={chapter.id} className="h-[3px] flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--hairline)' }}>
                        <span className="hud-fill block h-full origin-left" style={{ transform: 'scaleX(0)', backgroundColor: chapter.accent }} />
                    </span>
                ))}
            </span>
            <span className="hud-tc shrink-0 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                00:00:00
            </span>
        </div>
    );
};

export default SceneHud;
