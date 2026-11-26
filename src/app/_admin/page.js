"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    FaArrowTrendUp, FaArrowTrendDown, FaPlus, FaCircleCheck, FaCircleXmark,
} from "react-icons/fa6";
import { ACCENT } from "@/app/components/admin/shell/navConfig";
import { PageHeader, Panel, Stat, Badge, EmptyState, Loading } from "@/app/components/admin/ui";

/* ── Quick actions (create shortcuts) ─────────────────────────────── */
const QUICK_ACTIONS = [
    { label: "New blog", href: "/admin/blogs/new" },
    { label: "New project", href: "/admin/projects/new" },
    { label: "New app", href: "/admin/apps/new" },
    { label: "New deployment", href: "/admin/apps/new" },
];

const KPI_META = [
    { key: "views", label: "Page views" },
    { key: "uniques", label: "Unique visitors" },
    { key: "contacts", label: "Contacts" },
    { key: "outboundClicks", label: "Outbound clicks" },
];

const AUDIT_ACCENT = { auth: "sky", content: "teal", system: "amber", security: "rose" };

/* ── Helpers ──────────────────────────────────────────────────────── */
function formatNum(n) {
    if (n == null) return "—";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
}
function delta(cur, prev) {
    if (prev == null || prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
}
function timeAgo(iso) {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
}
function fmtBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return "—";
    const GB = 1024 ** 3, MB = 1024 ** 2, KB = 1024;
    if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
    if (bytes >= MB) return `${(bytes / MB).toFixed(0)} MB`;
    if (bytes >= KB) return `${(bytes / KB).toFixed(0)} KB`;
    return `${bytes} B`;
}
function fmtUptime(seconds) {
    if (!seconds) return "—";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return [d ? `${d}d` : "", h ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ");
}
function meterColor(pct) {
    if (pct >= 90) return "bg-[var(--status-error)]";
    if (pct >= 70) return "bg-[var(--status-warning)]";
    return "bg-[var(--status-success)]";
}

/* ── Building blocks ──────────────────────────────────────────────── */
function KpiStat({ meta, value, prev, series }) {
    const d = delta(value, prev);
    const max = series && series.length ? Math.max(...series, 1) : 1;
    return (
        <Stat
            label={meta.label}
            value={formatNum(value)}
            hint={d != null && (
                <Badge tone={d >= 0 ? "ok" : "error"}>
                    {d >= 0 ? <FaArrowTrendUp aria-label="Up" /> : <FaArrowTrendDown aria-label="Down" />}{Math.abs(d)}%
                </Badge>
            )}
        >
            {series && series.length > 0 && (
                <div aria-hidden="true" className="mt-3 flex items-end gap-0.5 h-8">
                    {series.map((v, i) => (
                        <span key={i} className="flex-1 rounded-sm bg-[var(--accent-cyan)] opacity-40" style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
                    ))}
                </div>
            )}
        </Stat>
    );
}

/** Filled SVG area chart for the traffic series (views) with a uniques line. */
function TrafficChart({ series }) {
    if (!series || series.length < 2) {
        return <EmptyState title="Not enough data yet." />;
    }
    const W = 100, H = 42;
    const n = series.length;
    const maxV = Math.max(...series.map((s) => s.views), 1);
    const x = (i) => (i / (n - 1)) * W;
    const yv = (v) => H - (v / maxV) * H;
    const viewsPts = series.map((s, i) => `${x(i).toFixed(2)},${yv(s.views).toFixed(2)}`);
    const uniqPts = series.map((s, i) => `${x(i).toFixed(2)},${yv(s.uniques).toFixed(2)}`);
    const area = `M0,${H} L${viewsPts.join(" L")} L${W},${H} Z`;
    const total = series.reduce((a, s) => a + s.views, 0);
    return (
        <div className="adm-panel-body">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                <span className="adm-num text-2xl font-semibold text-[var(--text-bright)]">{formatNum(total)}</span>
                <span className="adm-help">views, last {n} days</span>
                <span className="ml-auto flex items-center gap-3 font-mono text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--accent-cyan)]" />Views</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--accent-purple)]" />Uniques</span>
                </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40" role="img" aria-label={`Traffic: ${total} views over the last ${n} days`}>
                <path d={area} style={{ fill: "var(--accent-cyan)", fillOpacity: 0.12 }} />
                <polyline points={uniqPts.join(" ")} fill="none" style={{ stroke: "var(--accent-purple)" }} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <polyline points={viewsPts.join(" ")} fill="none" style={{ stroke: "var(--accent-cyan)" }} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
}

/** Ranked list with proportional bars (top pages, devices, countries…). */
function BarList({ rows, empty = "No data yet." }) {
    if (!rows || rows.length === 0) return <EmptyState title={empty} />;
    const max = Math.max(...rows.map((r) => r.value), 1);
    return (
        <ul className="adm-list">
            {rows.map((r, i) => (
                <li key={i} className="adm-row relative">
                    <span aria-hidden="true" className="absolute inset-y-1.5 left-0 rounded-r-md bg-[color-mix(in_srgb,var(--accent-cyan)_12%,transparent)]" style={{ width: `${(r.value / max) * 100}%` }} />
                    <span className="relative min-w-0 flex-1 truncate">{r.label}</span>
                    <span className="adm-num relative text-[var(--text-secondary)]">{formatNum(r.value)}</span>
                </li>
            ))}
        </ul>
    );
}

/** Compact horizontal usage meter for the Server Health widget. */
function HealthMeter({ label, percent, sub }) {
    const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));
    return (
        <div className="px-4 sm:px-5 py-3">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                <span className="adm-num font-semibold text-[var(--text-bright)]">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-200 ${meterColor(pct)}`} style={{ width: `${pct}%` }} />
            </div>
            {sub && <div className="adm-help mt-1 font-mono">{sub}</div>}
        </div>
    );
}

function DetailsLink({ href, children = "Details" }) {
    return <Link href={href} className="adm-link inline-flex min-h-11 sm:min-h-8 items-center text-sm">{children}</Link>;
}

/* ── Dashboard ────────────────────────────────────────────────────── */
export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [logs, setLogs] = useState(null);
    const [health, setHealth] = useState(null); // { metrics, uptime } — best-effort

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch("/api/admin/analytics?range=30d", { cache: "no-store" });
                const json = await res.json();
                if (!alive) return;
                if (json?.success) { setData(json); setStatus("ready"); }
                else setStatus("error");
            } catch { if (alive) setStatus("error"); }
        })();
        (async () => {
            try {
                const res = await fetch("/api/admin/security/audit?limit=8", { cache: "no-store" });
                const json = await res.json();
                if (alive && json?.success) setLogs(json.logs || []);
            } catch { /* activity is best-effort */ }
        })();
        return () => { alive = false; };
    }, []);

    // Live server health — poll every 5s, matching the health dashboard.
    useEffect(() => {
        let alive = true;
        const loadHealth = async () => {
            try {
                const [m, u] = await Promise.all([
                    fetch("/api/admin/health/metrics", { cache: "no-store" }).then((r) => r.json()),
                    fetch("/api/admin/health/uptime", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
                ]);
                if (!alive || !m?.success) return;
                setHealth({ metrics: m.metrics, uptime: u?.success ? u.targets : [] });
            } catch { /* health is best-effort */ }
        };
        loadHealth();
        const id = setInterval(loadHealth, 5000);
        return () => { alive = false; clearInterval(id); };
    }, []);

    const greeting = (() => {
        const h = new Date().getHours();
        return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    })();

    const series = data?.series?.slice(-14) || [];
    const viewsSeries = series.map((s) => s.views);
    const uniquesSeries = series.map((s) => s.uniques);

    const topPages = (data?.topPages || []).slice(0, 6).map((p) => ({ label: p.title || p.path, value: p.views }));
    const devices = (data?.devices || []).slice(0, 4).map((d) => ({ label: d.type || "Unknown", value: d.views }));
    const countries = (data?.countries || []).slice(0, 5).map((c) => ({ label: c.code, value: c.views }));
    const referrers = (data?.referrers || []).slice(0, 5).map((r) => ({ label: r.title || r.type, value: r.views }));
    const topContent = Object.values(data?.topEntities || {})
        .flat()
        .filter(Boolean)
        .map((e) => ({ label: e.title || e.slug || e.path || `#${e.id}`, value: e.views }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    return (
        <div className="adm-page">
            <PageHeader
                command="status"
                title={`${greeting}, Admin`}
                description={`${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}. Your site over the last 30 days.`}
                actions={<Link href="/admin/analytics" className="adm-btn">Full analytics</Link>}
            />

            {/* KPI row */}
            {status === "error" ? (
                <div role="alert" className="adm-notice adm-notice-warn">
                    Analytics are unavailable right now. <Link href="/admin/analytics" className="underline underline-offset-4">Open Analytics</Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {status === "loading" && Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} aria-hidden="true" className="adm-skeleton h-32" />
                    ))}
                    {status === "ready" && KPI_META.map((meta) => (
                        <KpiStat
                            key={meta.key}
                            meta={meta}
                            value={data.kpis?.[meta.key] ?? 0}
                            prev={data.prevKpis?.[meta.key]}
                            series={meta.key === "views" ? viewsSeries : meta.key === "uniques" ? uniquesSeries : null}
                        />
                    ))}
                </div>
            )}

            {/* Quick actions strip */}
            <div className="adm-actions">
                {QUICK_ACTIONS.map((act) => (
                    <Link key={act.href} href={act.href} className="adm-btn">
                        <FaPlus aria-hidden="true" className="text-[12px] text-[var(--accent-cyan)]" />
                        {act.label}
                    </Link>
                ))}
            </div>

            {/* Traffic (full width hero chart) */}
            <Panel title="Traffic" actions={<DetailsLink href="/admin/analytics" />} flush>
                {status === "loading" ? <Loading label="Loading traffic" rows={4} /> : <TrafficChart series={data?.series?.slice(-30) || []} />}
            </Panel>

            {/* Masonry of widgets — column-fill:balance packs by height so there
                are no empty gaps between uneven cards. */}
            <div className="columns-1 md:columns-2 xl:columns-3 gap-6 [column-fill:_balance] [&>*]:mb-6 [&>*]:break-inside-avoid">
                <Panel title="Server health" flush actions={
                    <>
                        {health && <Badge tone="ok">Live</Badge>}
                        <DetailsLink href="/admin/health" />
                    </>
                }>
                    {health == null ? (
                        <Loading label="Loading server health" />
                    ) : (() => {
                        const m = health.metrics;
                        const up = health.uptime.filter((t) => t.latest?.status === "up").length;
                        const down = health.uptime.filter((t) => t.latest?.status === "down").length;
                        const dbUp = m.database?.status === "up";
                        return (
                            <div className="adm-list">
                                <HealthMeter label="CPU" percent={m.cpu.percent}
                                    sub={`${m.cpu.cores} cores · load ${m.cpu.loadAvg.join(" / ")}`} />
                                <HealthMeter label="Memory" percent={m.memory.usedPercent}
                                    sub={`${fmtBytes(m.memory.used)} / ${fmtBytes(m.memory.total)}`} />
                                <HealthMeter label="Disk" percent={m.disk?.usedPercent ?? 0}
                                    sub={m.disk ? `${fmtBytes(m.disk.free)} free` : "unavailable"} />
                                <dl className="grid grid-cols-3 divide-x divide-[var(--hairline)]">
                                    <div className="px-4 py-3">
                                        <dt className="adm-help">Database</dt>
                                        <dd className={`adm-num font-semibold ${dbUp ? "text-[var(--adm-ok-ink)]" : "text-[var(--adm-error-ink)]"}`}>{dbUp ? `${m.database.latencyMs}ms` : "down"}</dd>
                                    </div>
                                    <div className="px-4 py-3">
                                        <dt className="adm-help">Uptime</dt>
                                        <dd className="adm-num font-semibold text-[var(--text-bright)]">{fmtUptime(m.process.uptimeSeconds)}</dd>
                                    </div>
                                    <div className="px-4 py-3">
                                        <dt className="adm-help">Endpoints</dt>
                                        <dd className="adm-num flex items-center gap-2 font-semibold">
                                            <span className="flex items-center gap-1 text-[var(--adm-ok-ink)]"><FaCircleCheck aria-label="Up" className="text-[11px]" />{up}</span>
                                            <span className="flex items-center gap-1 text-[var(--adm-error-ink)]"><FaCircleXmark aria-label="Down" className="text-[11px]" />{down}</span>
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        );
                    })()}
                </Panel>

                <Panel title="Recent activity" actions={<DetailsLink href="/admin/security">Audit log</DetailsLink>} flush>
                    {logs == null ? (
                        <Loading label="Loading activity" rows={5} />
                    ) : logs.length === 0 ? (
                        <EmptyState title="No activity logged yet." />
                    ) : (
                        <ul className="adm-list">
                            {logs.map((log) => {
                                const accent = ACCENT[AUDIT_ACCENT[log.category] || "slate"] || ACCENT.slate;
                                return (
                                    <li key={log._id} className="adm-row !items-start">
                                        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate">{log.action?.replace(/_/g, " ").toLowerCase()}</span>
                                            {log.details && <span className="adm-help block truncate">{log.details}</span>}
                                        </span>
                                        <span className="adm-help shrink-0 font-mono whitespace-nowrap">{timeAgo(log.createdAt)}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Panel>

                <Panel title="Top pages" flush><BarList rows={topPages} empty="No page views recorded yet." /></Panel>

                {topContent.length > 0 && (
                    <Panel title="Top content" flush><BarList rows={topContent} /></Panel>
                )}

                <Panel title="Devices" flush><BarList rows={devices} /></Panel>

                <Panel title="Top countries" flush><BarList rows={countries} /></Panel>

                <Panel title="Referrers" flush><BarList rows={referrers} /></Panel>
            </div>
        </div>
    );
}
