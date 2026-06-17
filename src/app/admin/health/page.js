"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    FaServer, FaMicrochip, FaMemory, FaHardDrive, FaGauge, FaDatabase,
    FaArrowsRotate, FaSpinner, FaCircleCheck, FaCircleXmark, FaPlus, FaTrash,
    FaRobot, FaTriangleExclamation, FaPlay, FaUpRightFromSquare, FaPause,
} from 'react-icons/fa6';

const TABS = [
    { key: 'resources', label: 'Resources', icon: <FaGauge /> },
    { key: 'uptime', label: 'Uptime', icon: <FaServer /> },
    { key: 'analyzer', label: 'AI Analyzer', icon: <FaRobot /> },
];

function Panel({ children, className = '' }) {
    return <div className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 ${className}`}>{children}</div>;
}

function fmtBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return '—';
    const GB = 1024 ** 3, MB = 1024 ** 2, KB = 1024;
    if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
    if (bytes >= MB) return `${(bytes / MB).toFixed(0)} MB`;
    if (bytes >= KB) return `${(bytes / KB).toFixed(0)} KB`;
    return `${bytes} B`;
}

function fmtUptime(seconds) {
    if (!seconds) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return [d ? `${d}d` : '', h ? `${h}h` : '', `${m}m`].filter(Boolean).join(' ');
}

function meterColor(pct) {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
}

function Meter({ icon, label, percent, sub, accent }) {
    const pct = Math.max(0, Math.min(100, percent || 0));
    return (
        <Panel className="p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-slate-300">
                    <span className={accent}>{icon}</span>
                    <span className="text-sm font-mono uppercase tracking-widest text-slate-400">{label}</span>
                </div>
                <span className="text-2xl font-bold tabular-nums text-white">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${meterColor(pct)}`} style={{ width: `${pct}%` }} />
            </div>
            {sub && <div className="mt-2 text-xs font-mono text-slate-500">{sub}</div>}
        </Panel>
    );
}

function Stat({ icon, label, value, accent }) {
    return (
        <Panel className="p-5">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
                <span className={accent}>{icon}</span>
                <span className="text-xs font-mono uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{value}</div>
        </Panel>
    );
}

// ─────────────────────────── Resources tab ───────────────────────────

function ResourcesTab() {
    const [metrics, setMetrics] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [auto, setAuto] = useState(true);
    const timer = useRef(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/health/metrics', { cache: 'no-store' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load metrics');
            setMetrics(data.metrics);
            setError('');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        return () => clearInterval(timer.current);
    }, [load]);

    useEffect(() => {
        clearInterval(timer.current);
        if (auto) timer.current = setInterval(load, 5000);
        return () => clearInterval(timer.current);
    }, [auto, load]);

    if (loading) return <div className="py-12 text-center text-slate-500"><FaSpinner className="animate-spin inline mr-2" /> Sampling metrics…</div>;
    if (error) return <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm flex items-center gap-2"><FaTriangleExclamation /> {error}</div>;
    if (!metrics) return null;

    const m = metrics;
    return (
        <div>
            <div className="flex items-center justify-end gap-3 mb-4">
                <button onClick={() => setAuto((a) => !a)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-white/10 text-slate-300 hover:text-white text-xs font-mono">
                    {auto ? <FaPause /> : <FaPlay />} {auto ? 'Live (5s)' : 'Paused'}
                </button>
                <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-white/10 text-slate-300 hover:text-white text-xs font-mono">
                    <FaArrowsRotate /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Meter icon={<FaMicrochip />} label="CPU" percent={m.cpu.percent} accent="text-cyan-400"
                    sub={`${m.cpu.cores} cores · load ${m.cpu.loadAvg.join(' / ')}`} />
                <Meter icon={<FaMemory />} label="Memory" percent={m.memory.usedPercent} accent="text-violet-400"
                    sub={`${fmtBytes(m.memory.used)} / ${fmtBytes(m.memory.total)}`} />
                <Meter icon={<FaHardDrive />} label="Disk" percent={m.disk?.usedPercent ?? 0} accent="text-amber-400"
                    sub={m.disk ? `${fmtBytes(m.disk.used)} / ${fmtBytes(m.disk.total)} · ${fmtBytes(m.disk.free)} free` : 'unavailable'} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat icon={<FaGauge />} label="Event-loop lag" accent="text-emerald-400"
                    value={`${m.eventLoop.lagMeanMs} ms`} />
                <Stat icon={<FaDatabase />} label="Database" accent={m.database.status === 'up' ? 'text-emerald-400' : 'text-red-400'}
                    value={m.database.status === 'up' ? `up · ${m.database.latencyMs}ms` : 'down'} />
                <Stat icon={<FaMemory />} label="Heap / RSS" accent="text-cyan-400"
                    value={`${fmtBytes(m.process.heapUsed)} / ${fmtBytes(m.process.rss)}`} />
                <Stat icon={<FaServer />} label="Process uptime" accent="text-slate-300"
                    value={fmtUptime(m.process.uptimeSeconds)} />
            </div>

            <div className="mt-4 text-xs font-mono text-slate-600">
                Node {m.process.nodeVersion} · {m.host.platform} {m.host.release} · host up {fmtUptime(m.host.uptimeSeconds)} · sampled {new Date(m.timestamp).toLocaleTimeString()}
            </div>
        </div>
    );
}

// ─────────────────────────── Uptime tab ───────────────────────────

function HistoryStrip({ history }) {
    if (!history?.length) return <span className="text-xs text-slate-600 font-mono">no history</span>;
    return (
        <div className="flex gap-0.5 items-end">
            {history.map((h, i) => (
                <span
                    key={i}
                    title={`${h.status} · ${h.latencyMs}ms · ${new Date(h.checkedAt).toLocaleString()}`}
                    className={`w-1.5 rounded-sm ${h.status === 'up' ? 'bg-emerald-500/70' : 'bg-red-500/70'}`}
                    style={{ height: `${Math.max(6, Math.min(24, (h.latencyMs || 0) / 50))}px` }}
                />
            ))}
        </div>
    );
}

function UptimeTab() {
    const [targets, setTargets] = useState([]);
    const [custom, setCustom] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [u, c] = await Promise.all([
                fetch('/api/admin/health/uptime', { cache: 'no-store' }).then((r) => r.json()),
                fetch('/api/admin/health/targets', { cache: 'no-store' }).then((r) => r.json()),
            ]);
            if (!u.success) throw new Error(u.error);
            setTargets(u.targets || []);
            setCustom(c.targets || []);
            setError('');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const runCheck = async () => {
        setChecking(true);
        setError('');
        try {
            const res = await fetch('/api/admin/health/uptime/check', { method: 'POST' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setTargets(data.targets || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setChecking(false);
        }
    };

    const addTarget = async (e) => {
        e.preventDefault();
        setAdding(true);
        setError('');
        try {
            const res = await fetch('/api/admin/health/targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: newLabel, url: newUrl }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setNewLabel('');
            setNewUrl('');
            await load();
        } catch (e) {
            setError(e.message);
        } finally {
            setAdding(false);
        }
    };

    const removeTarget = async (id) => {
        if (!confirm('Remove this custom endpoint from monitoring?')) return;
        await fetch(`/api/admin/health/targets?id=${id}`, { method: 'DELETE' });
        await load();
    };

    const upCount = targets.filter((t) => t.latest?.status === 'up').length;
    const downCount = targets.filter((t) => t.latest?.status === 'down').length;

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <Stat icon={<FaCircleCheck />} label="Up" value={upCount} accent="text-emerald-400" />
                <Stat icon={<FaCircleXmark />} label="Down" value={downCount} accent="text-red-400" />
                <Stat icon={<FaServer />} label="Monitored" value={targets.length} accent="text-cyan-400" />
                <button onClick={runCheck} disabled={checking}
                    className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-sm font-mono uppercase tracking-wider disabled:opacity-50">
                    {checking ? <FaSpinner className="animate-spin" /> : <FaPlay />} Run check now
                </button>
            </div>

            {error && <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm flex items-center gap-2"><FaTriangleExclamation /> {error}</div>}

            <Panel className="p-2 sm:p-4 mb-6">
                {loading && targets.length === 0 ? (
                    <div className="py-12 text-center text-slate-500"><FaSpinner className="animate-spin inline mr-2" /> Loading…</div>
                ) : targets.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">No endpoints yet. Add a deployment with a hosted URL, or a custom target below, then run a check.</div>
                ) : (
                    <div className="space-y-2">
                        {targets.map((t) => {
                            const up = t.latest?.status === 'up';
                            const noData = !t.latest;
                            return (
                                <div key={t.url} className="rounded-xl border border-white/5 bg-slate-950/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className={`text-lg shrink-0 ${noData ? 'text-slate-500' : up ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {noData ? <FaServer /> : up ? <FaCircleCheck /> : <FaCircleXmark />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-slate-200 text-sm font-medium truncate">{t.label || t.url}</span>
                                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{t.source}</span>
                                            <a href={t.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-cyan-300"><FaUpRightFromSquare size={11} /></a>
                                        </div>
                                        <div className="text-xs font-mono text-slate-500 truncate mt-0.5">{t.url}</div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <HistoryStrip history={t.history} />
                                        <div className="text-right min-w-[70px]">
                                            {noData ? <span className="text-xs text-slate-600 font-mono">no data</span> : (
                                                <>
                                                    <div className={`text-sm font-bold tabular-nums ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {up ? `${t.latest.latencyMs}ms` : (t.latest.error || 'down')}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-slate-600">{up ? `HTTP ${t.latest.statusCode}` : ''}</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Panel>

            <Panel className="p-5">
                <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400 mb-4">Custom endpoints</h3>
                <form onSubmit={addTarget} className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (optional)"
                        className="sm:w-48 px-3 py-2 rounded-lg bg-slate-950/60 border border-white/10 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/40 outline-none" />
                    <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://example.com/health" required
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950/60 border border-white/10 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/40 outline-none" />
                    <button type="submit" disabled={adding}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-sm font-mono disabled:opacity-50">
                        {adding ? <FaSpinner className="animate-spin" /> : <FaPlus />} Add
                    </button>
                </form>
                {custom.length === 0 ? (
                    <p className="text-xs text-slate-600 font-mono">No custom endpoints. Deployments with a hosted URL are monitored automatically.</p>
                ) : (
                    <div className="space-y-1.5">
                        {custom.map((t) => (
                            <div key={t._id} className="flex items-center gap-3 text-sm">
                                <span className="text-slate-300">{t.label}</span>
                                <span className="text-xs font-mono text-slate-600 truncate flex-1">{t.url}</span>
                                <button onClick={() => removeTarget(t._id)} className="text-red-400/70 hover:text-red-400"><FaTrash size={12} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    );
}

// ─────────────────────────── Analyzer tab ───────────────────────────

function AnalyzerTab() {
    const [logText, setLogText] = useState('');
    const [summary, setSummary] = useState('');
    const [signals, setSignals] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const analyze = async () => {
        setLoading(true);
        setError('');
        setSummary('');
        try {
            const res = await fetch('/api/admin/health/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logText }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setSummary(data.summary);
            setSignals(data.signals);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <Panel className="p-5">
                <p className="text-sm text-slate-400 mb-3">
                    Feeds recent failed uptime checks and security events — plus any logs you paste below (docker output, stack traces) — to the AI Core for a troubleshooting summary.
                </p>
                <textarea
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    rows={8}
                    placeholder="(Optional) paste recent runtime logs or a stack trace here…"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-white/10 text-sm font-mono text-slate-200 placeholder-slate-600 focus:border-cyan-500/40 outline-none resize-y"
                />
                <div className="flex items-center gap-3 mt-3">
                    <button onClick={analyze} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/20 text-sm font-mono uppercase tracking-wider disabled:opacity-50">
                        {loading ? <FaSpinner className="animate-spin" /> : <FaRobot />} Analyze
                    </button>
                    {signals && (
                        <span className="text-xs font-mono text-slate-500">
                            {signals.failedChecks} failed checks · {signals.securityEvents} security events
                        </span>
                    )}
                </div>
            </Panel>

            {error && <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm flex items-center gap-2"><FaTriangleExclamation /> {error}</div>}

            {summary && (
                <Panel className="p-5">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-fuchsia-400 mb-3 flex items-center gap-2"><FaRobot /> Analysis</h3>
                    <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">{summary}</pre>
                </Panel>
            )}
        </div>
    );
}

export default function HealthDashboard() {
    const [tab, setTab] = useState('resources');

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
                    <FaServer className="text-emerald-400" /> Server Health
                </h1>
                <p className="text-slate-400">Live resource meters, endpoint uptime monitoring, and AI-assisted error triage.</p>
            </div>

            <div className="flex gap-2 mb-6 border-b border-white/10">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-mono uppercase tracking-wider border-b-2 -mb-px transition-colors ${
                            tab === t.key ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {tab === 'resources' && <ResourcesTab />}
            {tab === 'uptime' && <UptimeTab />}
            {tab === 'analyzer' && <AnalyzerTab />}
        </div>
    );
}
