"use client";

import React, { useMemo, useState } from 'react';
import AiSectionShell from './AiSectionShell';

/**
 * Skills & specializations. Filterable category chips drive a grid of skill
 * meters; "all" shows everything. Meters fill on render so the section reads
 * as an instrument panel rather than a bullet list.
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
                                <SkillMeter key={item.name} item={item} accent={cat.accent || section.accent} />
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

function SkillMeter({ item, accent }) {
    const level = Math.max(0, Math.min(100, Number(item.level) || 0));
    return (
        <div>
            <div className="mb-2 flex items-baseline justify-between">
                <span className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    {item.name}
                </span>
                <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {level}%
                </span>
            </div>
            <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: 'color-mix(in srgb, var(--text-muted) 22%, transparent)' }}
            >
                <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                        width: `${level}%`,
                        background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 55%, transparent))`,
                    }}
                />
            </div>
        </div>
    );
}
