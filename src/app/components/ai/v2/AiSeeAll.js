"use client";

import React from 'react';
import Link from 'next/link';

/**
 * "See all N →" call-to-action rendered beneath a capped section on the AI Hub.
 * Links to the section's full sub-page (/ai/<slug>). Animates in with the same
 * `data-v2="rise"` contract as the rows above it, so it enters on the section's
 * own GSAP scope without a dedicated trigger.
 */
export default function AiSeeAll({ href, label, accent = 'var(--accent-cyan)' }) {
    if (!href) return null;

    return (
        <div data-v2="rise" className="mt-12 flex justify-center">
            <Link
                href={href}
                className="group inline-flex items-center gap-3 rounded-full px-7 py-3.5 font-mono text-xs uppercase tracking-[0.18em] transition-all duration-300"
                style={{
                    color: accent,
                    background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${accent} 55%, transparent)`,
                    backdropFilter: 'blur(8px)',
                }}
            >
                {label}
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
        </div>
    );
}
