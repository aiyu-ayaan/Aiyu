"use client";

import React, { useEffect, useMemo, useState } from 'react';
import AiSectionShell from './AiSectionShell';
import AiSeeAll from './AiSeeAll';
import { refreshScrollTriggersSoon } from '@/app/components/landing/v2/gsap3d';

/**
 * AI skills & specializations — the skills the site's AI agents can reach for.
 * Every skill is its own glass card in one flat responsive grid, built to hold
 * an unbounded catalog: categories only exist as filter chips and as the tag
 * stamped on each card.
 *
 * Animation contract: the whole grid animates off ONE data-v2-group trigger,
 * so entrance cost stays constant no matter how many skills exist, and
 * filtering never unmounts a card — it only toggles `hidden` — so the GSAP
 * tweens created at mount always keep their targets. The only thing a filter
 * change needs is a ScrollTrigger refresh because the grid height moved.
 */
export default function AiSkills({ index, section, limit = null, detailHref = null, totalCount = null }) {
    const categories = useMemo(
        () => (Array.isArray(section.data?.categories) ? section.data.categories : []),
        [section.data]
    );
    const [active, setActive] = useState('all');

    // Flatten to one card list; each skill remembers its category for the tag
    // and for filtering.
    const skills = useMemo(
        () =>
            categories.flatMap((cat) =>
                (Array.isArray(cat.items) ? cat.items : []).map((item) => ({
                    ...item,
                    categoryId: cat.id,
                    categoryLabel: cat.label,
                    accent: cat.accent || section.accent,
                }))
            ),
        [categories, section.accent]
    );

    // Preview mode (on the hub): cap the grid and defer the full, filterable
    // catalog to the /ai/skills sub-page. Filtering a truncated set would be
    // misleading, so the chips are hidden while previewing.
    const previewing = Number.isFinite(limit) && limit > 0 && skills.length > limit;
    const visibleSkills = previewing ? skills.slice(0, limit) : skills;
    const total = Number.isFinite(totalCount) ? totalCount : skills.length;

    // Grid height changes when cards are hidden/shown; reposition the
    // ScrollTriggers of everything further down the page.
    useEffect(() => {
        refreshScrollTriggersSoon();
    }, [active]);

    return (
        <AiSectionShell index={index} section={section}>
            {/* Filter row — full catalog only; a capped preview hides it. */}
            {!previewing && (
                <div data-v2="rise" className="mb-12 flex flex-wrap gap-2.5 font-mono text-xs">
                    <FilterChip
                        label={`all · ${skills.length}`}
                        active={active === 'all'}
                        accent={section.accent}
                        onClick={() => setActive('all')}
                    />
                    {categories.map((cat) => (
                        <FilterChip
                            key={cat.id}
                            label={cat.label}
                            active={active === cat.id}
                            accent={cat.accent || section.accent}
                            onClick={() => setActive(cat.id)}
                        />
                    ))}
                </div>
            )}

            <div data-v2-group data-v2-stagger="0.05" className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleSkills.map((skill) => (
                    <SkillCard
                        key={skill.id || `${skill.categoryId}-${skill.name}`}
                        skill={skill}
                        hidden={!previewing && active !== 'all' && active !== skill.categoryId}
                    />
                ))}
            </div>

            {previewing && (
                <AiSeeAll href={detailHref} label={`See all ${total} skills`} accent={section.accent} />
            )}
        </AiSectionShell>
    );
}

function FilterChip({ label, active, accent, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="cursor-pointer rounded-full px-4 py-2 uppercase tracking-[0.15em] transition-all duration-200"
            style={{
                color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
                background: active ? accent : 'var(--surface-glass)',
                border: `1px solid ${active ? accent : 'var(--hairline-strong)'}`,
                backdropFilter: 'blur(8px)',
            }}
        >
            {label}
        </button>
    );
}

function SkillCard({ skill, hidden }) {
    const { accent } = skill;
    const Wrapper = skill.url ? 'a' : 'div';
    const linkProps = skill.url
        ? { href: skill.url, target: '_blank', rel: 'noopener noreferrer' }
        : {};

    return (
        <Wrapper
            {...linkProps}
            data-v2="flip-x"
            hidden={hidden}
            className="group relative flex h-full flex-col rounded-2xl p-5 transition-all duration-300 sm:p-6"
            style={{
                border: '1px solid var(--hairline)',
                background: 'var(--surface-glass)',
                backdropFilter: 'blur(14px)',
            }}
        >
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
            />

            <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                {skill.name}
            </h3>

            {skill.description && (
                <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    {skill.description}
                </p>
            )}

            <div className="mt-5 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.15em]">
                <span
                    className="rounded px-2 py-1 normal-case tracking-normal"
                    style={{
                        color: accent,
                        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                    }}
                >
                    #{skill.categoryLabel}
                </span>
                {skill.url && (
                    <span
                        className="ml-auto transition-transform duration-300 group-hover:translate-x-1"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        docs ↗
                    </span>
                )}
            </div>
        </Wrapper>
    );
}
