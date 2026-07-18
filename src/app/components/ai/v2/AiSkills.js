"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import AiSectionShell from './AiSectionShell';
import AiSeeAll from './AiSeeAll';
import { refreshScrollTriggersSoon } from '@/app/components/landing/v2/gsap3d';

/**
 * AI skills & specializations — the skills the site's AI agents can reach for.
 * Every skill is its own glass card in one flat responsive grid, built to hold
 * an unbounded catalog: categories only exist as filter chips and as the tag
 * stamped on each card.
 *
 * Rendering contract: the DOM only ever holds one page of cards. An earlier
 * version mounted the entire catalog and merely toggled `hidden` to filter;
 * at a couple thousand skills that meant a couple thousand blurred glass
 * surfaces the compositor had to keep alive, and filtering stayed slow because
 * nothing ever left the document. Paging keeps the node count flat, so a
 * filter switch costs the same whether the catalog holds 20 skills or 20,000.
 *
 * Animation contract: the visible page animates off ONE data-v2-group trigger.
 * Cards appended by "load more" mount after the GSAP scope has run and so
 * carry no tween — they simply appear, which is the correct behaviour for
 * content the user explicitly asked to see. Grid height moves on every filter
 * or page change, so downstream ScrollTriggers are refreshed.
 */

/** Cards added per page — one to two scrolls' worth on a 3-column grid. */
const PAGE_SIZE = 24;
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
    const total = Number.isFinite(totalCount) ? totalCount : skills.length;

    // Per-category counts, computed once — the chips advertise how much is
    // behind each filter before the user commits to tapping it.
    const counts = useMemo(() => {
        const map = new Map();
        for (const skill of skills) map.set(skill.categoryId, (map.get(skill.categoryId) || 0) + 1);
        return map;
    }, [skills]);

    const filtered = useMemo(
        () => (active === 'all' ? skills : skills.filter((skill) => skill.categoryId === active)),
        [skills, active]
    );

    const [page, setPage] = useState(1);

    // A filter switch is a new result set, so paging restarts. Skipping the
    // first render keeps the initial page from being reset needlessly.
    const mounted = useRef(false);
    useEffect(() => {
        if (mounted.current) setPage(1);
        else mounted.current = true;
    }, [active]);

    const visibleSkills = previewing ? skills.slice(0, limit) : filtered.slice(0, page * PAGE_SIZE);
    const remaining = previewing ? 0 : filtered.length - visibleSkills.length;

    // Grid height changes on every filter or page change; reposition the
    // ScrollTriggers of everything further down the page.
    useEffect(() => {
        refreshScrollTriggersSoon();
    }, [active, page]);

    // Auto-paging: a sentinel below the grid pulls the next page as it nears
    // the viewport, so the catalog reads as one continuous list. The margin
    // fires it a screenful early — the next page is already in the DOM by the
    // time the user reaches where it goes, so no spinner is ever seen.
    const sentinel = useRef(null);
    const [autoPaging, setAutoPaging] = useState(false);

    useEffect(() => {
        if (typeof IntersectionObserver !== 'function') return undefined;
        setAutoPaging(true);
        const node = sentinel.current;
        if (!node) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Bounded by `remaining` at render time: once the last page is
                // rendered the sentinel unmounts and the observer is torn down.
                if (entry.isIntersecting) setPage((cur) => cur + 1);
            },
            { rootMargin: '800px 0px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [active, page, remaining]);

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
                            label={`${cat.label} · ${counts.get(cat.id) || 0}`}
                            active={active === cat.id}
                            accent={cat.accent || section.accent}
                            onClick={() => setActive(cat.id)}
                        />
                    ))}
                </div>
            )}

            <div data-v2-group data-v2-stagger="0.05" className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleSkills.map((skill) => (
                    <SkillCard key={skill.id || `${skill.categoryId}-${skill.name}`} skill={skill} />
                ))}
            </div>

            {!previewing && filtered.length === 0 && (
                <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    No skills in this category yet.
                </p>
            )}

            {remaining > 0 && (
                <div ref={sentinel} className="mt-10 flex flex-col items-center gap-3">
                    {/* Only surfaced where auto-paging can't run (no
                        IntersectionObserver, or JS still hydrating) — otherwise
                        a button the user never needs to press is just noise. */}
                    {!autoPaging && (
                        <button
                            type="button"
                            onClick={() => setPage((cur) => cur + 1)}
                            className="cursor-pointer rounded-full px-7 py-3 font-mono text-xs uppercase tracking-[0.15em] transition-all duration-200"
                            style={{
                                color: section.accent,
                                background: `color-mix(in srgb, ${section.accent} 12%, transparent)`,
                                border: `1px solid ${section.accent}`,
                            }}
                        >
                            Load {Math.min(remaining, PAGE_SIZE)} more
                        </button>
                    )}
                    <span
                        aria-live="polite"
                        className="font-mono text-[0.65rem] uppercase tracking-[0.15em]"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {visibleSkills.length} of {filtered.length}
                    </span>
                </div>
            )}

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

function SkillCard({ skill }) {
    const { accent } = skill;
    const Wrapper = skill.url ? 'a' : 'div';
    const linkProps = skill.url
        ? { href: skill.url, target: '_blank', rel: 'noopener noreferrer' }
        : {};

    return (
        <Wrapper
            {...linkProps}
            data-v2="flip-x"
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
