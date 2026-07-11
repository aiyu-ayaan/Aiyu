"use client";

import React, { useState } from 'react';
import AiSectionShell from './AiSectionShell';
import AiSeeAll from './AiSeeAll';

/**
 * Prompt library — expandable cards. Collapsed rows read like a table of
 * contents; expanding reveals the full system prompt in a mono block with a
 * one-tap copy button.
 */
export default function AiPromptLibrary({ index, section, limit = null, detailHref = null, totalCount = null }) {
    const allItems = Array.isArray(section.data?.items) ? section.data.items : [];
    const [openId, setOpenId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const previewing = Number.isFinite(limit) && limit > 0 && allItems.length > limit;
    const items = previewing ? allItems.slice(0, limit) : allItems;
    const total = Number.isFinite(totalCount) ? totalCount : allItems.length;

    const copy = async (item) => {
        try {
            await navigator.clipboard.writeText(item.prompt || '');
            setCopiedId(item.id);
            setTimeout(() => setCopiedId((cur) => (cur === item.id ? null : cur)), 1600);
        } catch {
            /* clipboard unavailable — no-op */
        }
    };

    return (
        <AiSectionShell index={index} section={section}>
            <div data-v2-group data-v2-stagger="0.06" className="space-y-4">
                {items.map((item) => {
                    const open = openId === item.id;
                    return (
                        <div
                            key={item.id}
                            data-v2="rise"
                            className="rounded-2xl transition-colors duration-200"
                            style={{
                                border: '1px solid var(--hairline)',
                                background: open ? 'var(--surface-glass)' : 'transparent',
                                backdropFilter: open ? 'blur(12px)' : undefined,
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setOpenId(open ? null : item.id)}
                                className="flex w-full cursor-pointer items-center gap-4 px-5 py-5 text-left sm:px-7"
                                aria-expanded={open}
                            >
                                <span className="font-mono text-sm" style={{ color: section.accent }}>
                                    {open ? '▾' : '▸'}
                                </span>
                                <span className="flex-1 text-lg font-semibold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                                    {item.title}
                                </span>
                                {item.role && (
                                    <span
                                        className="hidden rounded-full px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider sm:inline"
                                        style={{
                                            color: section.accent,
                                            background: `color-mix(in srgb, ${section.accent} 12%, transparent)`,
                                        }}
                                    >
                                        {item.role}
                                    </span>
                                )}
                            </button>

                            {open && (
                                <div className="px-5 pb-6 sm:px-7">
                                    <pre
                                        className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl p-4 font-mono text-[0.85rem] leading-relaxed"
                                        style={{
                                            color: 'var(--text-secondary)',
                                            background: 'color-mix(in srgb, var(--bg-primary) 55%, transparent)',
                                            border: '1px solid var(--hairline)',
                                        }}
                                    >
                                        {item.prompt}
                                    </pre>
                                    <button
                                        type="button"
                                        onClick={() => copy(item)}
                                        className="mt-3 cursor-pointer rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all duration-200"
                                        style={{
                                            color: copiedId === item.id ? 'var(--bg-primary)' : section.accent,
                                            background: copiedId === item.id ? section.accent : `color-mix(in srgb, ${section.accent} 12%, transparent)`,
                                            border: `1px solid ${section.accent}`,
                                        }}
                                    >
                                        {copiedId === item.id ? '✓ copied' : 'copy prompt'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {previewing && (
                <AiSeeAll href={detailHref} label={`See all ${total} prompts`} accent={section.accent} />
            )}
        </AiSectionShell>
    );
}
