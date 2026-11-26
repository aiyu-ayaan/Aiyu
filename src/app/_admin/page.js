"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    FaArrowTrendUp, FaArrowTrendDown, FaPlus, FaCircleCheck, FaCircleXmark, FaKey, FaPenToSquare,
    FaGear, FaShieldHalved, FaCircleInfo, FaDesktop, FaMobileScreen, FaTabletScreenButton, FaRobot,
} from "react-icons/fa6";
import { ACCENT } from "@/app/components/admin/shell/navConfig";
import { PageHeader, Panel, Stat, Badge, EmptyState, Loading } from "@/app/components/admin/ui";
import LineChart from "./analytics/LineChart";
import { fmtBytes, fmtUptime, MeterBar } from "./health/shared";
import "../styles/admin-insights.css";

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
const AUDIT_ICON = { auth: FaKey, content: FaPenToSquare, system: FaGear, security: FaShieldHalved };
const DEVICE_ICON = { desktop: FaDesktop, mobile: FaMobileScreen, tablet: FaTabletScreenButton, bot: FaRobot };

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
function countryName(code) {
    try {
        return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
    } catch {
        return code;
    }
}

/* ── Building blocks ──────────────────────────────────────────────── */
function KpiStat({ meta, value, prev, series }) {
    const d = delta(value, prev);
    const max = series && series.length ? Math.max(...series, 1) : 1;
    const compareMax = Math.max(value, prev || 0, 1);
    return (
        <Stat
            className="flex flex-col"
            label={meta.label}
            value={formatNum(value)}
            hint={
                <span className="flex min-h-6 flex-wrap items-center gap-2">
                    {d != null && (
                        <Badge tone={d >= 0 ? "ok" : "error"}>
                            {d >= 0 ? <FaArrowTrendUp aria-label="Up" /> : <FaArrowTrendDown aria-label="Down" />}{Math.abs(d)}%
                        </Badge>
                    )}
                    <span>{prev == null ? "Last 30 days" : `${formatNum(prev)} the 30 days before`}</span>
                </span>
            }
        >
            <div className="mt-auto pt-3">
                {series && series.length > 0 ? (
                    <div aria-hidden="true" className="flex h-10 items-end gap-0.5">
                        {series.map((v, i) => (
                            <span key={i} className="flex-1 rounded-sm bg-[var(--accent-cyan)] opacity-40 last:opacity-100" style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
                        ))}
                    </div>
                ) : (
                    <div aria-hidden="true" className="flex h-10 flex-col justify-end gap-1.5">
                        {[["Now", value, ""], ["Before", prev || 0, "opacity-40"]].map(([label, v, fade]) => (
                            <div key={label} className="flex items-center gap-2">
                                <span className="adm-help w-12 leading-none">{label}</span>
                                <span className="adm-meter flex-1"><span className={fade} style={{ width: `${(v / compareMax) * 100}%` }} /></span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Stat>
    );
}

/** Ranked list with proportional bars. Rows share the panel height, so neighbouring panels end level. */
function BarList({ rows, empty = "No data yet.", share = false }) {
    if (!rows || rows.length === 0) return <EmptyState className="flex-1 justify-center !items-center text-center" title={empty} />;
    const max = Math.max(...rows.map((r) => r.value), 1);
    const total = rows.reduce((a, r) => a + r.value, 0) || 1;
    return (
        <ul className="adm-list flex flex-1 flex-col">
            {rows.map((r, i) => (
                <li key={i} className="adm-row relative max-h-20 flex-1">
                    <span aria-hidden="true" className="absolute inset-y-1.5 left-0 rounded-r-md bg-[color-mix(in_srgb,var(--accent-cyan)_12%,transparent)]" style={{ width: `${(r.value / max) * 100}%` }} />
                    {r.icon && <span aria-hidden="true" className="relative flex w-6 shrink-0 justify-center text-[var(--text-secondary)]">{r.icon}</span>}
                    <span className="relative min-w-0 flex-1">
                        <span className="block truncate">{r.label}</span>
                        {r.sub && <span className="adm-help block truncate font-mono">{r.sub}</span>}
                    </span>
                    <span className="adm-num relative font-semibold text-[var(--text-bright)]">{formatNum(r.value)}</span>
                    {share && <span className="adm-num relative w-11 text-right text-xs text-[var(--text-secondary)]">{Math.round((r.value / total) * 100)}%</span>}
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
            <MeterBar label={label} percent={pct} />
            {sub && <div className="adm-help mt-1 font-mono">{sub}</div>}
        </div>
    );
}

function DetailsLink({ href, children = "Details" }) {
    return <Link href={href} className="adm-link inline-flex min-h-11 sm:min-h-8 items-center text-sm">{children}</Link>;
}

/** A dashboard cell: a titled panel that fills its grid row. */
function Cell({ className, ...props }) {
    return <Panel flush className={`flex flex-col ${className}`} {...props} />;
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

    const topPages = (data?.topPages || []).slice(0, 6).map((p) => ({ label: p.title || p.path, sub: p.title ? p.path : null, value: p.views }));
    const devices = (data?.devices || []).slice(0, 4).map((d) => {
        const Icon = DEVICE_ICON[d.type] || FaDesktop;
        return { label: <span className="capitalize">{d.type || "Unknown"}</span>, icon: <Icon />, value: d.views };
    });
    const countries = (data?.countries || []).slice(0, 5).map((c) => ({
        label: countryName(c.code),
        icon: <span className="adm-num text-xs">{c.code}</span>,
        value: c.views,
    }));
    const referrers = (data?.referrers || []).slice(0, 5).map((r) => ({ label: <span className={r.title ? "" : "capitalize"}>{r.title || r.type}</span>, value: r.views }));
    const topContent = Object.entries(data?.topEntities || {})
        .flatMap(([type, list]) => (list || []).filter(Boolean).map((e) => ({ label: e.title || e.slug || e.path || `#${e.id}`, sub: type, value: e.views })))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    const traffic = data?.series?.slice(-30) || [];
    const trafficTotal = traffic.reduce((a, s) => a + s.views, 0);
    const listBody = (node, label) => (status === "loading" ? <Loading label={label} rows={5} /> : node);

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
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
                    {status === "loading" && Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} aria-hidden="true" className="adm-skeleton h-40" />
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Traffic beside server health and create shortcuts */}
                <Cell title="Traffic" actions={<DetailsLink href="/admin/analytics" />} className="md:col-span-12 xl:col-span-8 2xl:col-span-9">
                    {listBody(traffic.length < 2 ? (
                        <EmptyState className="flex-1 justify-center !items-center text-center" title="Not enough data yet." />
                    ) : (
                        <LineChart
                            data={traffic}
                            summary={
                                <p className="flex items-baseline gap-2">
                                    <span className="adm-num text-2xl font-semibold text-[var(--text-bright)]">{formatNum(trafficTotal)}</span>
                                    <span className="adm-help">views, last {traffic.length} days</span>
                                </p>
                            }
                        />
                    ), "Loading traffic")}
                </Cell>

                <div className="md:col-span-12 xl:col-span-4 2xl:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:flex xl:flex-col gap-6 min-w-0">
                    <Cell title="Server health" className="xl:flex-1" actions={
                        <>
                            {health && <Badge tone="ok">Live</Badge>}
                            <DetailsLink href="/admin/health" />
                        </>
                    }>
                        {health == null ? (
                            <Loading label="Loading server health" rows={5} />
                        ) : (() => {
                            const m = health.metrics;
                            const up = health.uptime.filter((t) => t.latest?.status === "up").length;
                            const down = health.uptime.filter((t) => t.latest?.status === "down").length;
                            const dbUp = m.database?.status === "up";
                            return (
                                <div className="adm-list flex flex-1 flex-col justify-between">
                                    <HealthMeter label="CPU" percent={m.cpu.percent}
                                        sub={`${m.cpu.cores} cores · load ${m.cpu.loadAvg.join(" / ")}`} />
                                    <HealthMeter label="Memory" percent={m.memory.usedPercent}
                                        sub={`${fmtBytes(m.memory.used)} / ${fmtBytes(m.memory.total)}`} />
                                    <HealthMeter label="Disk" percent={m.disk?.usedPercent ?? 0}
                                        sub={m.disk ? `${fmtBytes(m.disk.free)} free` : "unavailable"} />
                                    <dl className="grid grid-cols-3 divide-x divide-[var(--hairline)]">
                                        <div className="min-w-0 px-4 py-3">
                                            <dt className="adm-help">Database</dt>
                                            <dd className={`adm-num font-semibold ${dbUp ? "text-[var(--adm-ok-ink)]" : "text-[var(--adm-error-ink)]"}`}>{dbUp ? `${m.database.latencyMs}ms` : "down"}</dd>
                                        </div>
                                        <div className="min-w-0 px-4 py-3">
                                            <dt className="adm-help">Uptime</dt>
                                            <dd className="adm-num font-semibold text-[var(--text-bright)]">{fmtUptime(m.process.uptimeSeconds)}</dd>
                                        </div>
                                        <div className="min-w-0 px-4 py-3">
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
                    </Cell>

                    <Panel title="Create">
                        <div className="grid grid-cols-2 gap-2">
                            {QUICK_ACTIONS.map((act) => (
                                <Link key={act.label} href={act.href} className="adm-btn !justify-start !rounded-[10px] !min-h-11 !px-3">
                                    <FaPlus aria-hidden="true" className="shrink-0 text-[12px] text-[var(--accent-cyan)]" />
                                    {act.label}
                                </Link>
                            ))}
                        </div>
                    </Panel>
                </div>

                {/* What gets read, and where readers come from */}
                <Cell title="Top pages" className="md:col-span-6 xl:col-span-4">
                    {listBody(<BarList rows={topPages} empty="No page views recorded yet." />, "Loading top pages")}
                </Cell>
                <Cell title="Top content" className="md:col-span-6 xl:col-span-4">
                    {listBody(<BarList rows={topContent} empty="No content views yet." />, "Loading top content")}
                </Cell>
                <Cell title="Referrers" className="md:col-span-12 xl:col-span-4">
                    {listBody(<BarList rows={referrers} share empty="No referrers yet." />, "Loading referrers")}
                </Cell>

                <Cell title="Recent activity" actions={<DetailsLink href="/admin/security">Audit log</DetailsLink>} className="md:col-span-12 xl:col-span-6">
                    {logs == null ? (
                        <Loading label="Loading activity" rows={5} />
                    ) : logs.length === 0 ? (
                        <EmptyState className="flex-1 justify-center !items-center text-center" title="No activity logged yet." />
                    ) : (
                        <ul className="grid flex-1 grid-cols-1 sm:grid-cols-2 auto-rows-fr overflow-hidden">
                            {logs.map((log) => {
                                const accent = ACCENT[AUDIT_ACCENT[log.category] || "slate"] || ACCENT.slate;
                                const Icon = AUDIT_ICON[log.category] || FaCircleInfo;
                                return (
                                    <li key={log._id} className="adm-row !items-start -mb-px -mr-px border-b border-r border-[var(--hairline)]">
                                        <Icon aria-hidden="true" className={`mt-1 shrink-0 ${accent.text}`} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate first-letter:uppercase">{log.action?.replace(/_/g, " ").toLowerCase()}</span>
                                            {log.details && <span className="adm-help block truncate">{log.details}</span>}
                                            <span className="adm-help block font-mono">{timeAgo(log.createdAt)}</span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Cell>
                <Cell title="Top countries" className="md:col-span-6 xl:col-span-3">
                    {listBody(<BarList rows={countries} share empty="No location data yet." />, "Loading countries")}
                </Cell>
                <Cell title="Devices" className="md:col-span-6 xl:col-span-3">
                    {listBody(<BarList rows={devices} share empty="No device data yet." />, "Loading devices")}
                </Cell>
            </div>
        </div>
    );
}
