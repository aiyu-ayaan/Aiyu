"use client";
/**
 * Dependency-free chart primitives for the analytics dashboard.
 * Uses theme CSS variables exclusively so light, dark, and custom admin themes work seamlessly.
 */
import React from "react";
import { EmptyState } from "@/app/components/admin/ui";
import LineChart from "./LineChart";
import { WORLD_VIEWBOX, WORLD_PATHS, WORLD_NAMES } from "./worldGeo";

export { LineChart };

/** ISO-2 country code -> flag emoji (no data dependency). */
function flag(code = "") {
    const cc = String(code).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
    return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Horizontal ranked bar list. items: [{ label, value, title?, description?, image?, icon? }]. */
export function BarList({ items = [], accent = "var(--accent-cyan)", emptyLabel = "No data recorded yet.", share = false }) {
    const [hoveredIdx, setHoveredIdx] = React.useState(null);
    if (!items.length) {
        return <EmptyState className="flex-1 justify-center !items-center text-center" title={emptyLabel} />;
    }
    const max = Math.max(1, ...items.map((i) => i.value));
    const total = items.reduce((sum, i) => sum + (i.value || 0), 0) || 1;

    return (
        <ul className="adm-list flex flex-1 flex-col">
            {items.map((it, idx) => {
                const primaryText = it.title || it.label;
                const secondaryText = it.title && it.label && it.title !== it.label ? it.label : it.sub || null;
                const hasPreview = Boolean(it.image || it.description || (it.title && it.title !== it.label));
                return (
                    <li
                        key={`${it.label}-${idx}`}
                        className="adm-row relative max-h-20 flex-1"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <span
                            aria-hidden="true"
                            className="absolute inset-y-1.5 left-0 rounded-r-md"
                            style={{
                                width: `${Math.max(3, (it.value / max) * 100)}%`,
                                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                            }}
                        />
                        {it.image ? (
                            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-[var(--hairline)] bg-[var(--bg-secondary)]">
                                <img src={it.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                            </span>
                        ) : it.icon ? (
                            <span aria-hidden="true" className="relative flex w-6 shrink-0 justify-center text-[var(--text-secondary)]">
                                {it.icon}
                            </span>
                        ) : null}
                        <span className="relative min-w-0 flex-1">
                            <span className="block truncate text-[var(--text-primary)]" title={String(primaryText)}>
                                {primaryText}
                            </span>
                            {secondaryText && (
                                <span className="adm-help block truncate font-mono">{secondaryText}</span>
                            )}
                        </span>
                        <span className="adm-num relative shrink-0 font-semibold text-[var(--text-bright)]">
                            {(it.value ?? 0).toLocaleString()}
                        </span>
                        {share && (
                            <span className="adm-num relative w-11 shrink-0 text-right text-xs text-[var(--text-secondary)]">
                                {Math.round(((it.value || 0) / total) * 100)}%
                            </span>
                        )}

                        {hoveredIdx === idx && hasPreview && (
                            <div className="adm-dialog pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 flex !w-72 -translate-x-1/2 gap-3 p-3">
                                {it.image && (
                                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[var(--hairline)] bg-[var(--bg-primary)]">
                                        <img
                                            src={it.image}
                                            alt={it.title || "Preview"}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold text-[var(--text-bright)]">
                                        {it.title || it.label}
                                    </p>
                                    {secondaryText && (
                                        <p className="adm-help truncate font-mono">{secondaryText}</p>
                                    )}
                                    {it.description && (
                                        <p className="adm-help mt-1 line-clamp-2">{it.description}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

/** Donut chart with side breakdown list. segments: [{ label, value, color }]. */
export function DonutSplit({ segments = [], size = 156 }) {
    const total = segments.reduce((s, x) => s + (x.value || 0), 0);
    const r = size / 2;
    const stroke = 20;
    const radius = r - stroke / 2;
    const circ = 2 * Math.PI * radius;

    if (!total) {
        return <EmptyState className="flex-1 justify-center !items-center text-center" title="No device data recorded yet." />;
    }

    const arcs = segments.reduce((acc, seg) => {
        const frac = seg.value / total;
        const startOffset = acc.length ? acc[acc.length - 1].nextOffset : 0;
        acc.push({
            ...seg,
            frac,
            dash: `${frac * circ} ${circ}`,
            dashOffset: -startOffset * circ,
            nextOffset: startOffset + frac,
        });
        return acc;
    }, []);

    return (
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-6">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Device share">
                <g transform={`rotate(-90 ${r} ${r})`}>
                    <circle cx={r} cy={r} r={radius} fill="none" style={{ stroke: "var(--bg-hover)" }} strokeWidth={stroke} />
                    {arcs.map((seg, i) => (
                        <circle
                            key={i}
                            cx={r}
                            cy={r}
                            r={radius}
                            fill="none"
                            style={{ stroke: seg.color }}
                            strokeWidth={stroke}
                            strokeDasharray={seg.dash}
                            strokeDashoffset={seg.dashOffset}
                        />
                    ))}
                </g>
                <text
                    x={r}
                    y={r - 2}
                    textAnchor="middle"
                    style={{ fill: "var(--text-bright)", fontSize: 20, fontWeight: 700, fontFamily: "var(--adm-mono)" }}
                >
                    {total.toLocaleString()}
                </text>
                <text
                    x={r}
                    y={r + 16}
                    textAnchor="middle"
                    style={{ fill: "var(--text-secondary)", fontSize: 11 }}
                >
                    Total views
                </text>
            </svg>
            <ul className="w-full flex-1 space-y-2.5">
                {segments.map((seg, i) => {
                    const pct = Math.round((seg.value / total) * 100);
                    return (
                        <li key={i} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="flex items-center gap-2">
                                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: seg.color }} />
                                    <span className="capitalize text-[var(--text-primary)]">{seg.label}</span>
                                </span>
                                <span className="adm-num flex items-center gap-2">
                                    <span className="font-semibold text-[var(--text-bright)]">{seg.value.toLocaleString()}</span>
                                    <span className="w-10 text-right text-xs text-[var(--text-secondary)]">{pct}%</span>
                                </span>
                            </div>
                            <div className="adm-meter">
                                <span style={{ width: `${pct}%`, "--adm-meter-tone": seg.color }} />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/**
 * Equirectangular world choropleth. `data`: [{ code (ISO-2), views }].
 * Countries are shaded by traffic volume on a perceptual (sqrt) ramp using theme tokens.
 */
export function WorldMap({ data = [], height = 360 }) {
    const wrapRef = React.useRef(null);
    const [hover, setHover] = React.useState(null);
    const [pos, setPos] = React.useState({ x: 0, y: 0, w: 0 });

    const { values, total, max } = React.useMemo(() => {
        const v = new Map();
        let t = 0;
        let m = 0;
        for (const d of data) {
            if (!d?.code) continue;
            const cc = String(d.code).toUpperCase();
            const n = d.views || 0;
            v.set(cc, (v.get(cc) || 0) + n);
            t += n;
        }
        for (const n of v.values()) m = Math.max(m, n);
        return { values: v, total: t, max: m };
    }, [data]);

    const fillFor = (cc) => {
        const n = values.get(cc) || 0;
        if (!n || !max) return "var(--bg-hover)";
        const pct = Math.round(22 + Math.sqrt(n / max) * 73);
        return `color-mix(in srgb, var(--accent-cyan) ${pct}%, var(--bg-secondary))`;
    };

    const onMove = (e) => {
        const r = wrapRef.current?.getBoundingClientRect();
        if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
    };

    const codes = Object.keys(WORLD_PATHS);
    const hoveredViews = hover ? values.get(hover.code) || 0 : 0;

    return (
        <div ref={wrapRef} className="relative w-full" onMouseMove={onMove}>
            <svg
                viewBox={WORLD_VIEWBOX}
                className="h-auto w-full select-none rounded-lg border border-[var(--hairline)]"
                style={{ maxHeight: height, background: "var(--bg-secondary)" }}
                role="img"
                aria-label="Visitors by country"
                onMouseLeave={() => setHover(null)}
            >
                {codes.map((cc) => (
                    <path
                        key={cc}
                        d={WORLD_PATHS[cc]}
                        style={{
                            fill: fillFor(cc),
                            stroke: hover?.code === cc ? "var(--accent-cyan)" : "var(--hairline-strong)",
                            cursor: values.get(cc) ? "pointer" : "default",
                            transition: "fill 120ms ease",
                        }}
                        strokeWidth={hover?.code === cc ? 1 : 0.45}
                        vectorEffect="non-scaling-stroke"
                        onMouseEnter={() => setHover({ code: cc })}
                    />
                ))}
            </svg>

            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-[var(--hairline)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                <span>Low</span>
                <span
                    aria-hidden="true"
                    className="h-2 w-16 rounded-sm"
                    style={{
                        background:
                            "linear-gradient(90deg, color-mix(in srgb, var(--accent-cyan) 20%, var(--bg-secondary)), var(--accent-cyan))",
                    }}
                />
                <span>High</span>
            </div>

            {hover && (
                <div
                    className="adm-dialog pointer-events-none absolute z-30 !w-auto min-w-[10rem] px-3 py-2 text-xs"
                    style={{
                        left: Math.min(pos.x + 14, Math.max(pos.w - 170, 0)),
                        top: Math.max(pos.y - 10, 0),
                    }}
                >
                    <div className="flex items-center gap-2 font-semibold text-[var(--text-bright)]">
                        <span className="text-base leading-none">{flag(hover.code)}</span>
                        <span className="max-w-[160px] truncate">{WORLD_NAMES[hover.code] || hover.code}</span>
                    </div>
                    <div className="adm-num mt-1 text-[var(--text-primary)]">
                        {hoveredViews.toLocaleString()} view{hoveredViews === 1 ? "" : "s"}
                        {total > 0 && hoveredViews > 0 && (
                            <span className="text-[var(--text-secondary)]"> · {((hoveredViews / total) * 100).toFixed(1)}%</span>
                        )}
                    </div>
                    {hoveredViews === 0 && <div className="adm-help mt-0.5">No recorded visits</div>}
                </div>
            )}
        </div>
    );
}
