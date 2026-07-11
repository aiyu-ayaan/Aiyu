"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import Link from 'next/link';
import {
    FaShieldHalved, FaArrowsRotate, FaDesktop, FaMobileScreen, FaTablet,
    FaLocationDot, FaRightFromBracket, FaSpinner, FaScroll, FaFilter,
    FaTriangleExclamation, FaCircleInfo, FaTrashCan,
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

/** Human "in Xd / Xh" until a future ISO timestamp; "soon" once it's due. */
function timeUntil(iso) {
    if (!iso) return '—';
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'soon';
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return '<1h';
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

const SESSION_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'expired', label: 'Expired' },
    { key: 'revoked', label: 'Revoked' },
];

const STATE_BADGE = {
    expired: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    revoked: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/20',
};

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
    const { confirm } = useAdminFeedback();
    const [sessions, setSessions] = useState([]);
    const [counts, setCounts] = useState({ active: 0, expired: 0, revoked: 0 });
    const [retentionDays, setRetentionDays] = useState(7);
    const [filter, setFilter] = useState('all');
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
            setCounts(data.counts || { active: 0, expired: 0, revoked: 0 });
            if (data.retentionDays) setRetentionDays(data.retentionDays);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const revoke = async (s) => {
        const self = s.current;
        if (self && !(await confirm({
            title: 'Revoke current device?',
            message: 'This is the device you are currently using. Revoking it will log you out. Continue?',
            confirmText: 'Revoke & log out',
            danger: true,
        }))) return;
        if (!self && !(await confirm({
            title: 'Revoke this session?',
            message: 'That device will be signed out immediately.',
            confirmText: 'Revoke',
            danger: true,
        }))) return;
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

    const visible = filter === 'all' ? sessions : sessions.filter((s) => s.state === filter);

    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-4">
                <StatPill label="Active" value={counts.active} accent="text-emerald-400" />
                <StatPill label="Expired" value={counts.expired} accent="text-amber-400" />
                <StatPill label="Revoked" value={counts.revoked} accent="text-fuchsia-400" />
                <button
                    onClick={load}
                    className="flex items-center gap-2 px-4 rounded-xl bg-slate-900/50 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/30 transition-colors text-sm font-mono"
                >
                    <FaArrowsRotate className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Retention policy notice */}
            <div className="mb-5 px-4 py-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] text-amber-200/80 text-xs flex items-start gap-2.5">
                <FaCircleInfo className="mt-0.5 shrink-0 text-amber-400/80" />
                <span>
                    Expired and revoked sessions stay listed for reference and are{' '}
                    <span className="font-semibold text-amber-200">automatically deleted {retentionDays} day{retentionDays === 1 ? '' : 's'} after they exit</span>.
                    Active sessions are never auto-removed — revoke one to sign that device out immediately.
                </span>
            </div>

            {/* State filter */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <FaFilter className="text-slate-500" />
                {SESSION_FILTERS.map((f) => {
                    const n = f.key === 'all' ? sessions.length : counts[f.key];
                    return (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border transition-colors ${
                                filter === f.key
                                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                    : 'bg-slate-900/50 text-slate-400 border-white/10 hover:text-white'
                            }`}
                        >
                            {f.label} <span className="opacity-60">{n}</span>
                        </button>
                    );
                })}
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm flex items-center gap-2">
                    <FaTriangleExclamation /> {error}
                </div>
            )}

            <Panel className="p-2 sm:p-4">
                {loading && sessions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500"><FaSpinner className="animate-spin inline mr-2" /> Loading sessions…</div>
                ) : visible.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                        {sessions.length === 0 ? 'No sessions recorded yet.' : `No ${filter} sessions.`}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {visible.map((s) => (
                            <div
                                key={s._id}
                                className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
                                    s.active ? 'border-white/5 bg-slate-950/40' : 'border-white/5 bg-slate-950/20 opacity-70'
                                }`}
                            >
                                <div className={`text-xl shrink-0 ${s.active ? 'text-cyan-400' : 'text-slate-500'}`}>
                                    {deviceIcon(s.userAgent)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-slate-200 text-sm font-medium">{shortUA(s.userAgent)}</span>
                                        {s.current && <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">This device</span>}
                                        {!s.active && <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${STATE_BADGE[s.state] || 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>{s.state}</span>}
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-slate-500 font-mono">
                                        <span className="flex items-center gap-1"><FaLocationDot className="text-slate-600" /> {s.geo?.label || s.ipAddress || 'Unknown'}</span>
                                        <span>{s.ipAddress || '—'}</span>
                                        <span>active {timeAgo(s.lastSeenAt)}</span>
                                        {!s.active && s.deleteAt && (
                                            <span className="flex items-center gap-1 text-slate-500" title={`Auto-deletes ${new Date(s.deleteAt).toLocaleString()}`}>
                                                <FaTrashCan className="text-slate-600" /> auto-deletes in {timeUntil(s.deleteAt)}
                                            </span>
                                        )}
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
