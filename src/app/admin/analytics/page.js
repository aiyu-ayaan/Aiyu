"use client";
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    FaChartLine, FaEye, FaUsers, FaPaperPlane, FaUpRightFromSquare,
    FaArrowPointer, FaRobot, FaArrowsRotate, FaTriangleExclamation,
} from 'react-icons/fa6';
import { LineChart, BarList, DonutSplit } from './charts';

const RANGES = [
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '90d', label: '90D' },
];

const DEVICE_COLORS = { desktop: '#22d3ee', mobile: '#a78bfa', tablet: '#34d399', bot: '#64748b' };
const REFERRER_LABELS = { direct: 'Direct', internal: 'Internal', search: 'Search', social: 'Social', external: 'External' };
const ENTITY_META = {
    blog: { label: 'Top Blogs', base: '/blogs/' },
    project: { label: 'Top Projects', base: '/projects/' },
    app: { label: 'Top Apps', base: '/apps/' },
    gallery: { label: 'Top Gallery', base: '/gallery/' },
};

function KpiCard({ icon, label, value, accent, sub }) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-xl p-5 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-mono uppercase tracking-widest ${accent}`}>{label}</span>
                <span className={accent}>{icon}</span>
            </div>
            <div className="text-3xl font-bold text-white tabular-nums">{(value ?? 0).toLocaleString()}</div>
            {sub && <div className="text-xs text-slate-500 font-mono mt-1">{sub}</div>}
        </div>
    );
}

export default function AnalyticsDashboard() {
    const [range, setRange] = useState('30d');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async (r) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/analytics?range=${r}`, { cache: 'no-store' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'FETCH_FAILED');
            setData(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(range); }, [range, load]);

    const handleReset = async () => {
        if (!window.confirm('WARNING: THIS WILL PERMANENTLY DELETE ALL ANALYTICS DATA. CONFIRM PROTOCOL?')) return;
        try {
            const res = await fetch('/api/admin/analytics', { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'RESET_FAILED');
            load(range);
        } catch (e) {
            setError(e.message);
        }
    };

    const kpis = data?.kpis || {};
    const devices = (data?.devices || []).map((d) => ({ label: d.type, value: d.views, color: DEVICE_COLORS[d.type] || '#64748b' }));
    const referrers = (data?.referrers || []).map((r) => ({ label: REFERRER_LABELS[r.type] || r.type, value: r.views }));
    const topPages = (data?.topPages || []).map((p) => ({ label: p.path, value: p.views }));
    const topEntities = data?.topEntities || {};

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                            <FaChartLine className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">Analytics</h1>
                            <p className="text-slate-400">First-party traffic, content & engagement insights.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-900/60 border border-white/10 rounded-lg p-1">
                            {RANGES.map((r) => (
                                <button
                                    key={r.key}
                                    onClick={() => setRange(r.key)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${range === r.key ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => load(range)}
                            className="p-2.5 rounded-lg bg-slate-900/60 border border-white/10 text-slate-400 hover:text-cyan-300 transition-colors"
                            title="Refresh"
                        >
                            <FaArrowsRotate className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl mb-6 flex items-center gap-3 border bg-red-500/10 text-red-400 border-red-500/20">
                    <FaTriangleExclamation />
                    <span className="font-mono text-sm tracking-wide">{error}</span>
                </div>
            )}

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <KpiCard icon={<FaEye />} label="Views" value={kpis.views} accent="text-cyan-400" />
                <KpiCard icon={<FaUsers />} label="Visitors" value={kpis.uniques} accent="text-violet-400" sub="unique / day" />
                <KpiCard icon={<FaArrowPointer />} label="Content" value={kpis.entityViews} accent="text-teal-400" sub="entity views" />
                <KpiCard icon={<FaPaperPlane />} label="Contacts" value={kpis.contacts} accent="text-emerald-400" />
                <KpiCard icon={<FaUpRightFromSquare />} label="Clicks" value={kpis.outboundClicks} accent="text-amber-400" sub="outbound" />
                <KpiCard icon={<FaRobot />} label="Bots" value={kpis.botViews} accent="text-slate-400" />
            </div>

            {/* Traffic chart */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-xl p-4 md:p-6 rounded-2xl border border-white/10 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest">Traffic</h2>
                    <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Views</span>
                        <span className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-0.5 inline-block" style={{ background: '#a78bfa' }} /> Visitors</span>
                    </div>
                </div>
                <LineChart data={data?.series || []} />
            </motion.div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                    <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-4">Top Pages</h2>
                    <BarList items={topPages} />
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                    <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-4">Referrers</h2>
                    <BarList items={referrers} accent="#a78bfa" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                    <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-4">Devices</h2>
                    <DonutSplit segments={devices} />
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                    <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-4">Engagement</h2>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                            <div className="text-slate-500 font-mono text-xs uppercase mb-1">Click-through</div>
                            <div className="text-2xl font-bold text-white tabular-nums">
                                {kpis.views ? `${((kpis.outboundClicks / kpis.views) * 100).toFixed(1)}%` : '—'}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                            <div className="text-slate-500 font-mono text-xs uppercase mb-1">Contact rate</div>
                            <div className="text-2xl font-bold text-white tabular-nums">
                                {kpis.views ? `${((kpis.contacts / kpis.views) * 100).toFixed(2)}%` : '—'}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                            <div className="text-slate-500 font-mono text-xs uppercase mb-1">Views / visitor</div>
                            <div className="text-2xl font-bold text-white tabular-nums">
                                {kpis.uniques ? (kpis.views / kpis.uniques).toFixed(1) : '—'}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                            <div className="text-slate-500 font-mono text-xs uppercase mb-1">Content views</div>
                            <div className="text-2xl font-bold text-white tabular-nums">{(kpis.entityViews ?? 0).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top content per entity type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {Object.keys(ENTITY_META).map((type) => {
                    const items = (topEntities[type] || []).map((e) => ({
                        label: e.slug,
                        value: e.views,
                        title: e.title,
                        image: e.image,
                        description: e.description,
                    }));
                    return (
                        <div key={type} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                            <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-4">{ENTITY_META[type].label}</h2>
                            <BarList items={items} accent="#34d399" emptyLabel="NO_VIEWS_YET" />
                        </div>
                    );
                })}
            </div>

            {/* Danger zone */}
            <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-red-500/15">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <FaTriangleExclamation className="text-red-500/70" />
                        <div>
                            <h2 className="text-sm font-mono text-red-400/80 uppercase tracking-widest">Reset Analytics</h2>
                            <p className="text-slate-500 text-xs mt-1">Permanently delete all recorded events and rollups. This cannot be undone.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleReset}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-3 px-5 rounded-xl transition-all uppercase tracking-wider text-xs"
                    >
                        Purge_Data
                    </button>
                </div>
            </div>
        </div>
    );
}
