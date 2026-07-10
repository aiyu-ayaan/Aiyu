"use client";

import React from 'react';

/**
 * Shared chapter header for the v2 editorial system: a giant ghost numeral
 * parallaxing at depth behind a mono eyebrow and an oversized headline.
 * Content-only — each chapter supplies its own section wrapper and FX scope.
 */
const V2ChapterHead = ({ index, eyebrow, title, kicker, accent = 'var(--accent-cyan)' }) => (
    <div className="relative mb-14 sm:mb-20">
        <span
            data-v2-depth="-0.45"
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 right-0 select-none text-[9rem] font-black leading-none tracking-tighter sm:-top-24 sm:text-[16rem]"
            style={{
                color: 'transparent',
                WebkitTextStroke: `1.5px color-mix(in srgb, ${accent} 22%, transparent)`,
                opacity: 0.8,
            }}
        >
            {index}
        </span>

        <p
            data-v2="line"
            className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]"
            style={{ color: accent }}
        >
            <span data-v2-scramble="0.9">{`0x${index} :: ${eyebrow}`}</span>
        </p>
        <h2
            data-v2="line"
            className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ color: 'var(--text-bright)' }}
        >
            {title}
        </h2>
        {kicker && (
            <p data-v2="rise" className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                {kicker}
            </p>
        )}
    </div>
);

export default V2ChapterHead;
