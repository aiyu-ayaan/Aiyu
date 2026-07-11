"use client";

import React, { useState } from 'react';
import AiSectionShell from './AiSectionShell';
import AiSeeAll from './AiSeeAll';

/**
 * Free credits & free-tier finder. Two filter toggles ([free API key] / [no
 * card]) narrow a ledger of providers. Rendered as hairline-separated log rows
 * — provider, offer, badges, and a jump link — so it reads like terminal
 * output rather than a marketing table.
 */
export default function AiFreeCredits({ index, section, limit = null, detailHref = null, totalCount = null }) {
    const rows = Array.isArray(section.data?.rows) ? section.data.rows : [];
    const [freeApiOnly, setFreeApiOnly] = useState(false);
    const [noCardOnly, setNoCardOnly] = useState(false);

    // Preview mode (on the hub): cap the ledger and hand the full, filterable
    // list to the /ai/free-credits sub-page; the toggles are hidden meanwhile.
    const previewing = Number.isFinite(limit) && limit > 0 && rows.length > limit;
    const total = Number.isFinite(totalCount) ? totalCount : rows.length;

    const visible = previewing
        ? rows.slice(0, limit)
        : rows.filter((r) => (!freeApiOnly || r.freeApi) && (!noCardOnly || r.noCard));

    return (
        <AiSectionShell index={index} section={section}>
            {!previewing && (
                <div data-v2="rise" className="mb-10 flex flex-wrap gap-2.5 font-mono text-xs">
                    <Toggle label="free API key" active={freeApiOnly} accent={section.accent} onClick={() => setFreeApiOnly((v) => !v)} />
                    <Toggle label="no credit card" active={noCardOnly} accent={section.accent} onClick={() => setNoCardOnly((v) => !v)} />
                </div>
            )}

            <div style={{ borderTop: '1px solid var(--hairline)' }}>
                {visible.map((row) => (
                    <a
                        key={row.id}
                        href={row.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-v2="rise"
                        className="group grid grid-cols-1 gap-x-6 gap-y-2 px-1 py-6 transition-colors duration-200 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-center"
                        style={{ borderBottom: '1px solid var(--hairline)' }}
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className="font-mono text-sm"
                                style={{ color: section.accent }}
                            >
                                ▸
                            </span>
                            <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                                {row.name}
                            </span>
                        </div>

                        <div>
                            <p className="text-[0.95rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {row.offer}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wider">
                                {row.freeApi && <Badge label="free api" accent="var(--accent-cyan)" />}
                                {row.noCard && <Badge label="no card" accent="var(--accent-orange)" />}
                                {row.note && (
                                    <span className="normal-case tracking-normal" style={{ color: 'var(--text-muted)' }}>
                                        {row.note}
                                    </span>
                                )}
                            </div>
                        </div>

                        <span
                            className="hidden font-mono text-xs transition-transform duration-300 group-hover:translate-x-1 sm:inline"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            open ↗
                        </span>
                    </a>
                ))}

                {visible.length === 0 && (
                    <p className="py-10 text-center font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        no providers match those filters.
                    </p>
                )}
            </div>

            {previewing && (
                <AiSeeAll href={detailHref} label={`See all ${total} providers`} accent={section.accent} />
            )}
        </AiSectionShell>
    );
}

function Toggle({ label, active, accent, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="cursor-pointer rounded-full px-4 py-2 transition-all duration-200"
            style={{
                color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
                background: active ? accent : 'var(--surface-glass)',
                border: `1px solid ${active ? accent : 'var(--hairline-strong)'}`,
                backdropFilter: 'blur(8px)',
            }}
        >
            [{active ? '×' : ' '}] {label}
        </button>
    );
}

function Badge({ label, accent }) {
    return (
        <span
            className="rounded px-1.5 py-0.5"
            style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
        >
            {label}
        </span>
    );
}
