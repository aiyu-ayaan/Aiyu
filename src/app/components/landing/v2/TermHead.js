"use client";

import React, { useRef } from 'react';
import { gsap, useGSAP } from './gsap3d';
import { SplitWords, motionDisabled } from './motion';

/**
 * Home chapter header styled as a shell prompt: the command types itself out,
 * then the headline rises word by word out of a mask. Home-only — the shared
 * V2ChapterHead keeps serving the other v2 pages.
 */
const TermHead = ({ path = '~', command, title, kicker, accent = 'var(--accent-cyan)', host = 'linux' }) => {
    const ref = useRef(null);

    useGSAP(
        () => {
            const root = ref.current;
            if (!root || motionDisabled()) return;
            const cmd = root.querySelector('.term-cmd');
            const words = root.querySelectorAll('.split-inner');
            const kick = root.querySelector('.term-kicker');
            const chars = (command || '').length || 1;

            const tl = gsap.timeline({
                scrollTrigger: { trigger: root, start: 'top 85%', toggleActions: 'play none none none' },
            });
            tl.fromTo(root.querySelector('.term-prompt'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 })
                .fromTo(
                    cmd,
                    { clipPath: 'inset(0 100% 0 0)' },
                    { clipPath: 'inset(0 0% 0 0)', duration: Math.min(0.9, chars * 0.035), ease: `steps(${chars})` }
                )
                .fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.06 }, '-=0.1');
            if (kick) tl.fromTo(kick, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.7');
        },
        { scope: ref, dependencies: [command, title] }
    );

    return (
        <header ref={ref} className="relative mb-12 sm:mb-16">
            <p className="term-prompt mb-5 font-mono text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--status-success)' }}>guest@{host}</span>
                <span>:</span>
                <span style={{ color: 'var(--accent-purple)' }}>{path}</span>
                <span>$ </span>
                <span className="term-cmd inline-block align-bottom" style={{ color: 'var(--text-primary)' }}>
                    {command}
                </span>
                <span
                    aria-hidden="true"
                    className="ml-1 inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] animate-pulse"
                    style={{ backgroundColor: accent }}
                />
            </p>
            <SplitWords
                as="h2"
                text={title}
                className="block max-w-5xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
                style={{ color: 'var(--text-bright)' }}
            />
            {kicker && (
                <p className="term-kicker mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                    {kicker}
                </p>
            )}
        </header>
    );
};

export default TermHead;
