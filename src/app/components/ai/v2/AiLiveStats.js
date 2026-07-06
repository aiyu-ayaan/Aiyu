"use client";

import React from 'react';
import AiSectionShell from './AiSectionShell';

/**
 * Live AI telemetry, aggregated from the site's own AiLog. Oversized counters
 * animate up on entry; a log strip below names the most-active model and top
 * provider — proof the portfolio runs real AI workflows, not screenshots.
 */
export default function AiLiveStats({ index, section, stats }) {
    const s = stats || {};
    const hasData = (s.totalCalls || 0) > 0;

    const metrics = [
        { label: 'AI calls processed', ...toCounter(s.totalCalls || 0), accent: 'var(--accent-cyan)' },
        { label: 'tokens processed', ...toCounter(s.totalTokens || 0), accent: 'var(--accent-purple)' },
        { label: 'calls · last 7 days', ...toCounter(s.calls7d || 0), accent: 'var(--accent-orange)' },
        { label: 'tokens · last 7 days', ...toCounter(s.tokens7d || 0), accent: 'var(--accent-pink)' },
    ];

    return (
        <AiSectionShell index={index} section={section}>
            {!hasData ? (
                <p data-v2="rise" className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    ▸ telemetry warming up — no AI calls logged yet.
                </p>
            ) : (
                <>
                    <div
                        data-v2-group
                        data-v2-stagger="0.1"
                        className="grid grid-cols-2 lg:grid-cols-4"
                        style={{ borderTop: '1px solid var(--hairline)' }}
                    >
                        {metrics.map((m, i) => (
                            <div
                                key={m.label}
                                data-v2="flip-x"
                                className="relative px-2 py-10 sm:px-6 sm:py-14"
                                style={{
                                    borderRight: i % 2 === 0 ? '1px solid var(--hairline)' : undefined,
                                    borderBottom: '1px solid var(--hairline)',
                                }}
                            >
                                <p
                                    className="text-5xl font-black leading-none tracking-tighter tabular-nums sm:text-7xl"
                                    style={{ color: 'var(--text-bright)' }}
                                >
                                    <span data-counter={m.value} data-counter-suffix={m.suffix}>
                                        {m.value}
                                        {m.suffix}
                                    </span>
                                </p>
                                <p
                                    className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.25em]"
                                    style={{ color: m.accent }}
                                >
                                    {m.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 grid grid-cols-1 gap-8 font-mono text-sm md:grid-cols-2">
                        <LogLine
                            label="$ most-active --model"
                            value={s.topModel}
                            meta={s.topModelCalls ? `${s.topModelCalls} calls` : null}
                            accent="var(--accent-purple)"
                        />
                        <LogLine
                            label="$ top --provider"
                            value={s.topProvider}
                            accent="var(--accent-cyan)"
                        />
                    </div>
                </>
            )}
        </AiSectionShell>
    );
}

function LogLine({ label, value, meta, accent }) {
    return (
        <div data-v2="door-left">
            <p className="mb-3 text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                {label}
            </p>
            <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: accent }}>▸ </span>
                {value || '—'}
                {meta && <span style={{ color: 'var(--text-muted)' }}> · {meta}</span>}
            </p>
        </div>
    );
}

/** Scale a raw count into an animatable integer + unit suffix (K / M). */
function toCounter(n) {
    const num = Number(n) || 0;
    if (num >= 1_000_000) return { value: Math.round(num / 1_000_000), suffix: 'M' };
    if (num >= 1_000) return { value: Math.round(num / 1_000), suffix: 'K' };
    return { value: num, suffix: '' };
}
