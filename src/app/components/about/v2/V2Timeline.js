"use client";

import React, { useRef } from 'react';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';
import V2ChapterHead from '../../landing/v2/V2ChapterHead';

/**
 * Ledger timeline chapter for the v2 about page. A vertical spine draws
 * itself down the leader column as the user scrolls (scrubbed scaleY) while
 * each entry hinges in from its side: mono duration column, role in display
 * type, company and description as annotations. Reused for experience,
 * education, and certifications.
 */
const V2Timeline = ({ id, index, eyebrow, title, accent = 'var(--accent-cyan)', items = [], emptyLabel = 'nothing here yet' }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        dependencies: [items.length],
        extra: ({ gsap, scope, reducedMotion }) => {
            if (reducedMotion) return;
            const spine = scope.querySelector('.v2-tl-spine');
            const list = scope.querySelector('.v2-tl-list');
            if (!spine || !list) return;

            gsap.fromTo(
                spine,
                { scaleY: 0, transformOrigin: '50% 0%' },
                {
                    scaleY: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: list,
                        start: 'top 80%',
                        end: 'bottom 45%',
                        scrub: 0.6,
                    },
                }
            );
        },
    });

    return (
        <section
            ref={sectionRef}
            id={id}
            className="relative overflow-hidden py-20 sm:py-28"
            style={{ borderTop: '1px solid var(--hairline)' }}
        >
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
                <V2ChapterHead index={index} eyebrow={eyebrow} title={title} accent={accent} />

                {items.length === 0 ? (
                    <p data-v2="rise" className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        $ {eyebrow.toLowerCase().replace(/\s+/g, '-')} --list → {emptyLabel}
                    </p>
                ) : (
                    <div className="v2-tl-list relative" style={{ perspective: '1600px' }}>
                        <span
                            aria-hidden="true"
                            className="v2-tl-spine absolute bottom-0 left-[3px] top-0 hidden w-px sm:block"
                            style={{ background: `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 25%, transparent))` }}
                        />

                        {items.map((item, itemIndex) => (
                            <article
                                key={`${item.heading}-${itemIndex}`}
                                data-v2={itemIndex % 2 === 0 ? 'door-left' : 'door-right'}
                                className="relative grid grid-cols-12 gap-4 py-8 sm:pl-10 sm:py-10"
                                style={{ borderBottom: '1px solid var(--hairline)' }}
                            >
                                <span
                                    aria-hidden="true"
                                    className="absolute left-0 top-12 hidden h-[7px] w-[7px] rounded-full sm:block"
                                    style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }}
                                />

                                <span className="col-span-12 font-mono text-xs sm:col-span-3 sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                                    {item.meta}
                                    {item.metaSub && (
                                        <span className="mt-1 block" style={{ color: accent }}>{item.metaSub}</span>
                                    )}
                                </span>

                                <div className="col-span-12 sm:col-span-9">
                                    <h3 className="text-2xl font-bold leading-tight tracking-tight sm:text-4xl" style={{ color: 'var(--text-bright)' }}>
                                        {item.heading}
                                    </h3>
                                    {item.subheading && (
                                        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] sm:text-sm" style={{ color: `color-mix(in srgb, ${accent} 80%, var(--text-secondary))` }}>
                                            {item.subheading}
                                        </p>
                                    )}
                                    {item.body && (
                                        <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
                                            {item.body}
                                        </p>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default V2Timeline;
