"use client";
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    FaShieldHalved, FaArrowsRotate, FaDesktop, FaMobileScreen, FaTablet,
    FaLocationDot, FaRightFromBracket, FaSpinner, FaScroll, FaFilter,
    FaTriangleExclamation,
} from 'react-icons/fa6';

const TABS = [
    { key: 'sessions', label: 'Active Sessions', icon: <FaDesktop /> },
    { key: 'audit', label: 'Audit Log', icon: <FaScroll /> },
];

const AUDIT_CATEGORIES = [
    { key: '', label: 'All' },
    { key: 'auth', label: 'Auth' },
    { key: 'security', label: 'Security' },
    { key: 'content', label: 'Content' },
    { key: 'system', label: 'System' },
];

function Panel({ children, className = '' }) {
    return <div className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 ${className}`}>{children}</div>;
}

function StatPill({ label, value, accent }) {
    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
            <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value ?? 0}</div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500">{label}</div>
        </div>
    );
}

function deviceIcon(ua = '') {
    const s = ua.toLowerCase();
    if (/mobile|iphone|android/.test(s) && !/ipad|tablet/.test(s)) return <FaMobileScreen />;
    if (/ipad|tablet/.test(s)) return <FaTablet />;
    return <FaDesktop />;
}

function shortUA(ua = '') {
    if (!ua) return 'Unknown device';
    const browser = /Edg\//.test(ua) ? 'Edge'
        : /Chrome\//.test(ua) ? 'Chrome'
        : /Firefox\//.test(ua) ? 'Firefox'
        : /Safari\//.test(ua) ? 'Safari'
        : 'Browser';
    const os = /Windows/.test(ua) ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
        : /Android/.test(ua) ? 'Android'
        : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
        : /Linux/.test(ua) ? 'Linux'
        : '';
    return [browser, os].filter(Boolean).join(' · ');
}

function timeAgo(iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

const ACTION_STYLE = {
    LOGIN_SUCCESS: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    LOGOUT: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
    LOGIN_FAILED: 'text-red-400 bg-red-500/10 border-red-500/20',
    LOGIN_RATE_LIMITED: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    SESSION_REVOKED: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
};
function actionStyle(action) {
    return ACTION_STYLE[action] || 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20';
}

// ─────────────────────────── Sessions tab ───────────────────────────

function SessionsTab() {
    const [sessions, setSessions] = useState([]);
    const [activeCount, setActiveCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revoking, setRevoking] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/security/sessions', { cache: 'no-store' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load sessions');
            setSessions(data.sessions || []);
            setActiveCount(data.activeCount || 0);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const revoke = async (s) => {
        const self = s.current;
        if (self && !confirm('This is the device you are currently using. Revoking it will log you out. Continue?')) return;
        if (!self && !confirm('Revoke this session? That device will be signed out immediately.')) return;
        setRevoking(s._id);
        try {
            const res = await fetch(`/api/admin/security/sessions/${s._id}/revoke`, { method: 'POST' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Revoke failed');
            if (data.self) {
                window.location.href = '/admin/login';
                return;
            }
            await load();
        } catch (e) {
            setError(e.message);
        } finally {
            setRevoking('');
        }
    };

    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-6">
                <StatPill label="Active sessions" value={activeCount} accent="text-emerald-400" />
                <StatPill label="Tracked total" value={sessions.length} accent="text-cyan-400" />
                <button
                    onClick={load}
                    className="flex items-center gap-2 px-4 rounded-xl bg-slate-900/50 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/30 transition-colors text-sm font-mono"
                >
                    <FaArrowsRotate className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm flex items-center gap-2">
                    <FaTriangleExclamation /> {error}
                </div>
            )}

            <Panel className="p-2 sm:p-4">
                {loading && sessions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500"><FaSpinner className="animate-spin inline mr-2" /> Loading sessions…</div>
                ) : sessions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">No sessions recorded yet.</div>
                ) : (
                    <div className="space-y-2">
                        {sessions.map((s) => (
                            <div
                                key={s._id}
                                className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
                                    s.active ? 'border-white/5 bg-slate-950/40' : 'border-white/5 bg-slate-950/20 opacity-60'
                                }`}
                            >
                                <div className={`text-xl shrink-0 ${s.active ? 'text-cyan-400' : 'text-slate-500'}`}>
                                    {deviceIcon(s.userAgent)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-slate-200 text-sm font-medium">{shortUA(s.userAgent)}</span>
                                        {s.current && <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">This device</span>}
                                        {!s.active && <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-slate-500/20">{s.revokedAt ? 'Revoked' : 'Expired'}</span>}
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-slate-500 font-mono">
                                        <span className="flex items-center gap-1"><FaLocationDot className="text-slate-600" /> {s.geo?.label || s.ipAddress || 'Unknown'}</span>
                                        <span>{s.ipAddress || '—'}</span>
                                        <span>active {timeAgo(s.lastSeenAt)}</span>
                                    </div>
                                </div>
                                {s.active && (
                                    <button
                                        onClick={() => revoke(s)}
                                        disabled={revoking === s._id}
                                        className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
                                    >
                                        {revoking === s._id ? <FaSpinner className="animate-spin" /> : <FaRightFromBracket />}
                                        {s.current ? 'Sign out' : 'Revoke'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    );
}

// ─────────────────────────── Audit tab ───────────────────────────

function AuditTab() {
    const [logs, setLogs] = useState([]);
    const [counts, setCounts] = useState({});
    const [category, setCategory] = useState('');
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async (cat, cursor) => {
        const more = Boolean(cursor);
        more ? setLoadingMore(true) : setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (cat) params.set('category', cat);
            if (cursor) params.set('cursor', cursor);
            const res = await fetch(`/api/admin/security/audit?${params}`, { cache: 'no-store' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load audit log');
            setLogs((prev) => (more ? [...prev, ...data.logs] : data.logs));
            setNextCursor(data.nextCursor);
            setCounts(data.counts || {});
        } catch (e) {
            setError(e.message);
        } finally {
            more ? setLoadingMore(false) : setLoading(false);
        }
    }, []);

    useEffect(() => { load(category, null); }, [category, load]);

    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-6">
                <StatPill label="Auth events" value={counts.auth} accent="text-emerald-400" />
                <StatPill label="Security events" value={counts.security} accent="text-red-400" />
                <StatPill label="Content/System" value={(counts.content || 0) + (counts.system || 0)} accent="text-cyan-400" />
            </div>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <FaFilter className="text-slate-500" />
                {AUDIT_CATEGORIES.map((c) => (
                    <button
                        key={c.key}
                        onClick={() => setCategory(c.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border transition-colors ${
                            category === c.key
                                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                : 'bg-slate-900/50 text-slate-400 border-white/10 hover:text-white'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm flex items-center gap-2">
                    <FaTriangleExclamation /> {error}
                </div>
            )}

            <Panel className="p-2 sm:p-4">
                {loading ? (
                    <div className="py-12 text-center text-slate-500"><FaSpinner className="animate-spin inline mr-2" /> Loading audit log…</div>
                ) : logs.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">No audit entries for this filter.</div>
                ) : (
                    <div className="space-y-1.5">
                        {logs.map((l) => (
                            <div key={l._id} className="rounded-lg border border-white/5 bg-slate-950/40 p-3 flex items-start gap-3">
                                <span className={`shrink-0 mt-0.5 text-xs font-mono px-2 py-1 rounded border ${actionStyle(l.action)}`}>{l.action}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-slate-300 text-sm break-words">{l.details || '—'}</p>
                                    <div className="mt-1 flex items-center gap-3 flex-wrap text-[11px] text-slate-500 font-mono">
                                        <span>{l.ipAddress || 'no-ip'}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-white/5">{l.category}</span>
                                        <span>{new Date(l.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {nextCursor && !loading && (
                    <div className="text-center pt-4">
                        <button
                            onClick={() => load(category, nextCursor)}
                            disabled={loadingMore}
                            className="px-4 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/30 text-sm font-mono disabled:opacity-50"
                        >
                            {loadingMore ? <FaSpinner className="animate-spin inline mr-2" /> : null} Load more
                        </button>
                    </div>
                )}
            </Panel>
        </div>
    );
}

export default function SecurityDashboard() {
    const [tab, setTab] = useState('sessions');

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
                    <FaShieldHalved className="text-rose-400" /> Session &amp; Security
                </h1>
                <p className="text-slate-400">Monitor active devices, revoke access remotely, and audit administrative actions.</p>
            </div>

            <div className="flex gap-2 mb-6 border-b border-white/10">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-mono uppercase tracking-wider border-b-2 -mb-px transition-colors ${
                            tab === t.key ? 'border-rose-400 text-rose-300' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {tab === 'sessions' ? <SessionsTab /> : <AuditTab />}
        </div>
    );
}
