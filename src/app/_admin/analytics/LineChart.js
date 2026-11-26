"use client";
// Dual-series (views + visitors) traffic chart, separate from charts.js so the dashboard does not load the world map.
// The SVG stretches to fill its panel; text and dots are HTML so they never stretch with it.
import { useState } from 'react';
import { EmptyState } from '@/app/components/admin/ui';

const SERIES = [
    { key: 'views', label: 'Views', color: 'var(--accent-cyan)' },
    { key: 'uniques', label: 'Visitors', color: 'var(--accent-purple)' },
];

function niceMax(value) {
    if (value <= 5) return 5;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    const n = value / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
}

export default function LineChart({ data = [], summary }) {
    const [hovered, setHovered] = useState(null);
    const n = data.length;
    if (!n) {
        return <EmptyState className="flex-1 justify-center !items-center text-center" title="No traffic recorded yet" description="Visits show up here once the site gets some." />;
    }

    const max = niceMax(Math.max(1, ...data.map((d) => d.views)));
    const x = (i) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
    const y = (v) => 100 - (v / max) * 100;
    const line = (key) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(d[key]).toFixed(2)}`).join(' ');
    const area = `${line('views')} L${x(n - 1)},100 L${x(0)},100 Z`;
    const ticks = [1, 0.75, 0.5, 0.25, 0];
    const labelEvery = Math.max(1, Math.ceil(n / 6));
    const active = hovered === null ? null : data[hovered];
    const total = data.reduce((sum, d) => sum + d.views, 0);

    const onPointer = (e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - box.left) / box.width;
        setHovered(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
    };

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>{summary}</div>
                <ul className="ml-auto flex items-center gap-4 font-mono text-xs text-[var(--text-secondary)]">
                    {SERIES.map((s) => (
                        <li key={s.key} className="flex items-center gap-1.5">
                            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(14rem,1fr)_auto] gap-x-3 gap-y-2 pt-2">
                <div aria-hidden="true" className="relative min-w-8">
                    {ticks.map((t) => (
                        <span key={t} className="adm-help adm-num absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t) * 100}%` }}>
                            {Math.round(max * t).toLocaleString()}
                        </span>
                    ))}
                </div>
                <div
                    className="relative touch-pan-y"
                    onPointerMove={onPointer}
                    onPointerDown={onPointer}
                    onPointerLeave={() => setHovered(null)}
                >
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={`Traffic: ${total} views over the last ${n} days`}>
                        {ticks.map((t) => (
                            <line key={t} x1="0" x2="100" y1={(1 - t) * 100} y2={(1 - t) * 100} style={{ stroke: 'var(--hairline)' }} vectorEffect="non-scaling-stroke" />
                        ))}
                        <path d={area} style={{ fill: 'var(--accent-cyan)', fillOpacity: 0.12 }} />
                        <path d={line('uniques')} fill="none" style={{ stroke: 'var(--accent-purple)' }} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
                        <path d={line('views')} fill="none" style={{ stroke: 'var(--accent-cyan)' }} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                    {active && (
                        <>
                            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-l border-dashed border-[var(--accent-cyan)]" style={{ left: `${x(hovered)}%` }} />
                            {SERIES.map((s) => (
                                <span key={s.key} aria-hidden="true" className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[var(--bg-primary)]" style={{ left: `${x(hovered)}%`, top: `${y(active[s.key])}%`, borderColor: s.color }} />
                            ))}
                            <div
                                className="adm-dialog pointer-events-none absolute top-0 z-10 !w-40 px-3 py-2"
                                style={x(hovered) < 50 ? { left: `calc(${x(hovered)}% + 0.75rem)` } : { right: `calc(${100 - x(hovered)}% + 0.75rem)` }}
                            >
                                <p className="adm-help adm-num">{active.day}</p>
                                {SERIES.map((s) => (
                                    <p key={s.key} className="mt-1 flex items-center justify-between gap-3 text-xs">
                                        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                                        <span className="adm-num font-semibold text-[var(--text-bright)]">{active[s.key].toLocaleString()}</span>
                                    </p>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div aria-hidden="true" className="relative col-start-2 h-4">
                    {data.map((d, i) => ((i === n - 1 || (i % labelEvery === 0 && n - 1 - i >= labelEvery / 2)) ? (
                        <span key={d.day} className="adm-help adm-num absolute whitespace-nowrap" style={{ left: `${x(i)}%`, transform: `translateX(${i === 0 ? 0 : i === n - 1 ? -100 : -50}%)` }}>
                            {d.day.slice(5)}
                        </span>
                    ) : null))}
                </div>
            </div>
        </div>
    );
}
