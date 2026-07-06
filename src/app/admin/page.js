"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    FaArrowRight, FaArrowTrendUp, FaArrowTrendDown, FaPlus,
    FaEye, FaUsers, FaEnvelope, FaArrowUpRightFromSquare,
    FaClockRotateLeft, FaDesktop, FaGlobe, FaLink,
} from "react-icons/fa6";
import { ACCENT } from "@/app/components/admin/shell/navConfig";

/* ── Quick actions (create shortcuts) ─────────────────────────────── */
const QUICK_ACTIONS = [
    { label: "New Blog", href: "/admin/blogs/new", accent: "teal" },
    { label: "New Project", href: "/admin/projects/new", accent: "blue" },
    { label: "New App", href: "/admin/apps/new", accent: "cyan" },
    { label: "New Deployment", href: "/admin/deployments/new", accent: "emerald" },
];

const KPI_META = [
    { key: "views", label: "Page Views", icon: FaEye, accent: "cyan" },
    { key: "uniques", label: "Unique Visitors", icon: FaUsers, accent: "violet" },
    { key: "contacts", label: "Contacts", icon: FaEnvelope, accent: "green" },
    { key: "outboundClicks", label: "Outbound Clicks", icon: FaArrowUpRightFromSquare, accent: "amber" },
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

/* ── Building blocks ──────────────────────────────────────────────── */
function Card({ title, icon: Icon, action, children, className = "" }) {
    return (
        <section className={`rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/5 ${className}`}>
            {(title || action) && (
                <header className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h2 className="flex items-center gap-2.5 text-sm font-semibold text-white">
                        {Icon && <Icon className="text-slate-500 text-[13px]" />}
                        {title}
                    </h2>
                    {action}
                </header>
            )}
            {children}
        </section>
    );
}

function StatCard({ meta, value, prev, series }) {
    const accent = ACCENT[meta.accent] || ACCENT.slate;
    const Icon = meta.icon;
    const d = delta(value, prev);
    const max = series && series.length ? Math.max(...series, 1) : 1;
    return (
        <div className="relative p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/5 overflow-hidden">
            <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.bgSoft} ${accent.text}`}>
                    <Icon className="text-[15px]" />
                </div>
                {d != null && (
                    <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-lg ${d >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
                        {d >= 0 ? <FaArrowTrendUp /> : <FaArrowTrendDown />}{Math.abs(d)}%
                    </span>
                )}
            </div>
            <p className="mt-4 text-3xl font-bold text-white tracking-tight tabular-nums">{formatNum(value)}</p>
            <p className="text-sm text-slate-400">{meta.label}</p>
            {series && series.length > 0 && (
                <div className="mt-4 flex items-end gap-0.5 h-8">
                    {series.map((v, i) => (
                        <span key={i} className={`flex-1 rounded-sm ${accent.dot} opacity-40`} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
                    ))}
                </div>
            )}
        </div>
    );
}

/** Filled SVG area chart for the traffic series (views) with a uniques line. */
function TrafficChart({ series }) {
    if (!series || series.length < 2) {
        return <p className="px-5 py-10 text-center text-sm text-slate-500">Not enough data yet.</p>;
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
        <div className="p-5">
            <div className="flex items-baseline gap-3 mb-3">
                <span className="text-2xl font-bold text-white tabular-nums">{formatNum(total)}</span>
                <span className="text-xs text-slate-500">views · last {n} days</span>
                <span className="ml-auto flex items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-cyan-400"><span className="h-2 w-2 rounded-full bg-cyan-400" />Views</span>
                    <span className="flex items-center gap-1.5 text-violet-400"><span className="h-2 w-2 rounded-full bg-violet-400" />Uniques</span>
                </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40">
                <defs>
                    <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(34,211,238)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="rgb(34,211,238)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={area} fill="url(#trafficFill)" />
                <polyline points={uniqPts.join(" ")} fill="none" stroke="rgb(167,139,250)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" />
                <polyline points={viewsPts.join(" ")} fill="none" stroke="rgb(34,211,238)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
}

/** Ranked list with proportional bars (top pages, devices, countries…). */
function BarList({ rows, accent = "cyan", empty = "No data yet." }) {
    const a = ACCENT[accent] || ACCENT.cyan;
    if (!rows || rows.length === 0) return <p className="px-5 py-8 text-center text-sm text-slate-500">{empty}</p>;
    const max = Math.max(...rows.map((r) => r.value), 1);
    return (
        <ul className="p-2">
            {rows.map((r, i) => (
                <li key={i} className="relative flex items-center gap-3 px-3 py-2 rounded-lg overflow-hidden">
                    <span className={`absolute inset-y-1 left-0 rounded-md ${a.bgSoft}`} style={{ width: `${(r.value / max) * 100}%` }} />
                    <span className="relative z-10 min-w-0 flex-1 text-sm text-slate-200 truncate">{r.label}</span>
                    <span className="relative z-10 text-sm font-mono text-slate-400 tabular-nums">{formatNum(r.value)}</span>
                </li>
            ))}
        </ul>
    );
}

/* ── Dashboard ────────────────────────────────────────────────────── */
export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [logs, setLogs] = useState(null);

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

    return (
        <div className="p-5 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-mono uppercase tracking-widest text-cyan-400/80 mb-1">
                        {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{greeting}, Admin</h1>
                    <p className="text-slate-400 mt-1">Your site at a glance — last 30 days.</p>
                </div>
                <Link href="/admin/analytics" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm text-slate-300 hover:text-white transition-colors">
                    Full analytics <FaArrowRight className="text-[11px]" />
                </Link>
            </header>

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {status === "loading" && Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[168px] rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse" />
                ))}
                {status === "error" && (
                    <div className="col-span-2 lg:col-span-4 p-6 rounded-2xl border border-white/5 bg-slate-900/40 text-center text-slate-400 text-sm">
                        Analytics are unavailable right now. <Link href="/admin/analytics" className="text-cyan-400 hover:underline">Open Analytics →</Link>
                    </div>
                )}
                {status === "ready" && KPI_META.map((meta) => (
                    <StatCard
                        key={meta.key}
                        meta={meta}
                        value={data.kpis?.[meta.key] ?? 0}
                        prev={data.prevKpis?.[meta.key]}
                        series={meta.key === "views" ? viewsSeries : meta.key === "uniques" ? uniquesSeries : null}
                    />
                ))}
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: traffic + top pages */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Traffic" icon={FaEye} action={<Link href="/admin/analytics" className="text-xs font-mono text-slate-500 hover:text-cyan-400">Details →</Link>}>
                        {status === "loading" ? <div className="h-52 animate-pulse" /> : <TrafficChart series={data?.series?.slice(-30) || []} />}
                    </Card>
                    <Card title="Top Pages" icon={FaLink}>
                        <BarList rows={topPages} accent="cyan" empty="No page views recorded yet." />
                    </Card>
                </div>

                {/* Right: quick actions + activity */}
                <div className="space-y-6">
                    <Card title="Quick Actions" icon={FaPlus}>
                        <div className="p-3 grid grid-cols-1 gap-2">
                            {QUICK_ACTIONS.map((act) => {
                                const accent = ACCENT[act.accent] || ACCENT.slate;
                                return (
                                    <Link key={act.href} href={act.href} className={`group flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all ${accent.border}`}>
                                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent.bgSoft} ${accent.text}`}>
                                            <FaPlus className="text-[12px]" />
                                        </span>
                                        <span className="text-sm font-semibold text-white">{act.label}</span>
                                        <FaArrowRight className="ml-auto text-slate-600 group-hover:text-white text-xs transition-colors" />
                                    </Link>
                                );
                            })}
                        </div>
                    </Card>

                    <Card
                        title="Recent Activity"
                        icon={FaClockRotateLeft}
                        action={<Link href="/admin/security" className="text-xs font-mono text-slate-500 hover:text-cyan-400">Audit log →</Link>}
                    >
                        {logs == null ? (
                            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
                        ) : logs.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-slate-500">No activity logged yet.</p>
                        ) : (
                            <ul className="p-2">
                                {logs.map((log) => {
                                    const accent = ACCENT[AUDIT_ACCENT[log.category] || "slate"] || ACCENT.slate;
                                    return (
                                        <li key={log.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03]">
                                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm text-slate-200 truncate">{log.action?.replace(/_/g, " ").toLowerCase()}</span>
                                                {log.details && <span className="block text-xs text-slate-500 truncate">{log.details}</span>}
                                            </span>
                                            <span className="shrink-0 text-[11px] font-mono text-slate-600 whitespace-nowrap">{timeAgo(log.createdAt)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>

            {/* Breakdown row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Card title="Devices" icon={FaDesktop}><BarList rows={devices} accent="violet" /></Card>
                <Card title="Top Countries" icon={FaGlobe}><BarList rows={countries} accent="emerald" /></Card>
                <Card title="Referrers" icon={FaLink}><BarList rows={referrers} accent="amber" /></Card>
            </div>
        </div>
    );
}
