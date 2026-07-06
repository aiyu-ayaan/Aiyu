"use client";

import React from 'react';
import AiSectionShell from './AiSectionShell';

/**
 * The recommended stack — glass cards, each with a rating meter, an honest
 * "why", capability tags, and a direct link. Cards swing up on their own
 * hinge as they enter.
 */
export default function AiRecommendations({ index, section }) {
    const cards = Array.isArray(section.data?.cards) ? section.data.cards : [];

    return (
        <AiSectionShell index={index} section={section}>
            <div data-v2-group data-v2-stagger="0.08" className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {cards.map((card) => (
                    <a
                        key={card.id}
                        href={card.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-v2="flip-x"
                        className="group relative flex flex-col rounded-2xl p-6 transition-all duration-300 sm:p-8"
                        style={{
                            border: '1px solid var(--hairline)',
                            background: 'var(--surface-glass)',
                            backdropFilter: 'blur(14px)',
                        }}
                    >
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
                            style={{ background: `linear-gradient(90deg, transparent, ${card.accent || section.accent}, transparent)` }}
                        />

                        <div className="flex items-start justify-between gap-4">
                            <h3 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                                {card.name}
                            </h3>
                            <Rating value={card.rating} accent={card.accent || section.accent} />
                        </div>

                        <p className="mt-4 flex-1 text-[0.95rem] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                            {card.blurb}
                        </p>

                        <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-[0.7rem]">
                            {(card.tags || []).map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded px-2 py-1"
                                    style={{
                                        color: card.accent || section.accent,
                                        background: `color-mix(in srgb, ${card.accent || section.accent} 12%, transparent)`,
                                    }}
                                >
                                    #{tag}
                                </span>
                            ))}
                            <span
                                className="ml-auto transition-transform duration-300 group-hover:translate-x-1"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                visit ↗
                            </span>
                        </div>
                    </a>
                ))}
            </div>
        </AiSectionShell>
    );
}

function Rating({ value, accent }) {
    const rating = Math.max(0, Math.min(5, Number(value) || 0));
    return (
        <div className="flex shrink-0 items-center gap-0.5" aria-label={`${rating} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
                <span
                    key={i}
                    className="text-sm leading-none"
                    style={{ color: i < rating ? accent : 'color-mix(in srgb, var(--text-muted) 40%, transparent)' }}
                >
                    ●
                </span>
            ))}
        </div>
    );
}
