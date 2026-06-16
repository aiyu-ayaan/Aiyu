"use client";
/**
 * Dependency-free SVG chart primitives for the analytics dashboard. Styled to
 * match the admin terminal aesthetic (cyan accents on slate/glass). All charts
 * scale via `viewBox` so they stay responsive without a sizing library.
 */
import React from 'react';

const CYAN = '#22d3ee';

function niceMax(value) {
    if (value <= 5) return 5;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    const n = value / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
}

/** Dual-series area + line chart (views + uniques) over time. */
export function LineChart({ data = [], height = 220 }) {
    const W = 760;
    const H = height;
    const pad = { top: 16, right: 16, bottom: 28, left: 36 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;

    const max = niceMax(Math.max(1, ...data.map((d) => d.views)));
    const n = data.length;
    const x = (i) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v) => pad.top + innerH - (v / max) * innerH;

    const line = (key) => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
    const area = `${line('views')} L${x(n - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        v: Math.round(max * (1 - t)),
        yy: pad.top + t * innerH,
    }));

    // Show ~6 x-axis labels max.
    const labelEvery = Math.max(1, Math.ceil(n / 6));

    if (!n) {
        return <div className="text-slate-500 text-sm font-mono py-12 text-center">NO_DATA</div>;
    }

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Traffic over time">
            <defs>
                <linearGradient id="aiyuArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CYAN} stopOpacity="0.30" />
                    <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
                </linearGradient>
            </defs>

            {gridLines.map((g, i) => (
                <g key={i}>
                    <line x1={pad.left} y1={g.yy} x2={W - pad.right} y2={g.yy} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
                    <text x={pad.left - 8} y={g.yy + 3} textAnchor="end" className="fill-slate-500" style={{ fontSize: 10, fontFamily: 'monospace' }}>{g.v}</text>
                </g>
            ))}

            <path d={area} fill="url(#aiyuArea)" />
            <path d={line('views')} fill="none" stroke={CYAN} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d={line('uniques')} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />

            {data.map((d, i) => (i % labelEvery === 0 || i === n - 1) ? (
                <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                    {d.day.slice(5)}
                </text>
            ) : null)}
        </svg>
    );
}

/** Horizontal ranked bar list. items: [{ label, value, sub? }]. */
export function BarList({ items = [], accent = CYAN, emptyLabel = 'NO_DATA' }) {
    const max = Math.max(1, ...items.map((i) => i.value));
    if (!items.length) {
        return <div className="text-slate-600 text-xs font-mono py-6 text-center">{emptyLabel}</div>;
    }
    return (
        <div className="space-y-2.5">
            {items.map((it, idx) => (
                <div key={`${it.label}-${idx}`} className="relative">
                    <div className="relative h-7 rounded-md overflow-hidden bg-white/[0.03] border border-white/5">
                        <div
                            className="absolute inset-y-0 left-0 rounded-md transition-all"
                            style={{ width: `${Math.max(4, (it.value / max) * 100)}%`, background: `${accent}1f`, borderRight: `2px solid ${accent}` }}
                        />
                        <div className="relative z-10 flex items-center justify-between h-full px-3">
                            <span className="text-xs text-slate-200 font-mono truncate pr-2" title={it.label}>{it.label}</span>
                            <span className="text-xs text-slate-400 font-mono tabular-nums shrink-0">{it.value.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Donut chart. segments: [{ label, value, color }]. */
export function DonutSplit({ segments = [], size = 160 }) {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const r = size / 2;
    const stroke = 22;
    const radius = r - stroke / 2;
    const circ = 2 * Math.PI * radius;
    let offset = 0;

    if (!total) {
        return <div className="text-slate-600 text-xs font-mono py-6 text-center">NO_DATA</div>;
    }

    return (
        <div className="flex items-center gap-5">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
                <g transform={`rotate(-90 ${r} ${r})`}>
                    <circle cx={r} cy={r} r={radius} fill="none" stroke="rgba(148,163,184,0.10)" strokeWidth={stroke} />
                    {segments.map((seg, i) => {
                        const frac = seg.value / total;
                        const dash = `${frac * circ} ${circ}`;
                        const el = (
                            <circle key={i} cx={r} cy={r} r={radius} fill="none" stroke={seg.color}
                                strokeWidth={stroke} strokeDasharray={dash} strokeDashoffset={-offset * circ} />
                        );
                        offset += frac;
                        return el;
                    })}
                </g>
                <text x={r} y={r - 2} textAnchor="middle" className="fill-white" style={{ fontSize: 22, fontWeight: 700 }}>{total.toLocaleString()}</text>
                <text x={r} y={r + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 10, fontFamily: 'monospace' }}>TOTAL</text>
            </svg>
            <div className="space-y-1.5">
                {segments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-mono">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: seg.color }} />
                        <span className="text-slate-300 capitalize">{seg.label}</span>
                        <span className="text-slate-500 tabular-nums">{Math.round((seg.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
