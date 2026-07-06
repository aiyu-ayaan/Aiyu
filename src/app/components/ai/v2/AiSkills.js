"use client";

import React, { useMemo, useState } from 'react';
import AiSectionShell from './AiSectionShell';

/**
 * AI skills & specializations — the skills the site's AI agents can reach for.
 * Filterable category chips drive a grid; "all" shows everything. Each item is
 * a `{ name, description }` pair rendered as a titled entry with a short blurb.
 */
export default function AiSkills({ index, section }) {
    const categories = useMemo(
        () => (Array.isArray(section.data?.categories) ? section.data.categories : []),
        [section.data]
    );
    const [active, setActive] = useState('all');

    const visible = active === 'all' ? categories : categories.filter((c) => c.id === active);

    return (
        <AiSectionShell index={index} section={section}>
            {/* Filter row */}
            <div data-v2="rise" className="mb-12 flex flex-wrap gap-2.5 font-mono text-xs">
                <FilterChip label="all" active={active === 'all'} accent={section.accent} onClick={() => setActive('all')} />
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

            <div className="grid grid-cols-1 gap-x-14 gap-y-12 lg:grid-cols-2">
                {visible.map((cat) => (
                    <div key={cat.id} data-v2="door-left">
                        <p
                            className="mb-6 font-mono text-[0.7rem] uppercase tracking-[0.3em]"
                            style={{ color: cat.accent || section.accent }}
                        >
                            $ {cat.label}
                        </p>
                        <div className="space-y-5">
                            {(cat.items || []).map((item) => (
                                <SkillEntry key={item.name} item={item} accent={cat.accent || section.accent} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
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

function SkillEntry({ item, accent }) {
    return (
        <div className="flex gap-3">
            <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: accent }}
                aria-hidden="true"
            />
            <div>
                <span className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    {item.name}
                </span>
                {item.description && (
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {item.description}
                    </p>
                )}
            </div>
        </div>
    );
}
