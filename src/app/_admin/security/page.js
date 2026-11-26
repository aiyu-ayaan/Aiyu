"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import {
    FaArrowsRotate,
    FaDesktop,
    FaLocationDot,
    FaMobileScreen,
    FaRightFromBracket,
    FaScroll,
    FaSpinner,
    FaTablet,
    FaTrashCan,
} from 'react-icons/fa6';
import { Badge, EmptyState, Loading, PageHeader, Panel, Stat } from '@/app/components/admin/ui';
import '@/app/styles/admin-system.css';

const TABS = [
    { key: 'sessions', label: 'Active sessions', icon: <FaDesktop aria-hidden="true" /> },
    { key: 'audit', label: 'Audit log', icon: <FaScroll aria-hidden="true" /> },
];

const AUDIT_CATEGORIES = [
    { key: '', label: 'All' },
    { key: 'auth', label: 'Auth' },
    { key: 'security', label: 'Security' },
    { key: 'content', label: 'Content' },
    { key: 'system', label: 'System' },
];

const SESSION_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'expired', label: 'Expired' },
    { key: 'revoked', label: 'Revoked' },
];

function deviceIcon(ua = '') {
    const s = ua.toLowerCase();
    if (/mobile|iphone|android/.test(s) && !/ipad|tablet/.test(s)) return <FaMobileScreen aria-hidden="true" />;
    if (/ipad|tablet/.test(s)) return <FaTablet aria-hidden="true" />;
    return <FaDesktop aria-hidden="true" />;
}

function shortUA(ua = '') {
    if (!ua) return 'Unknown device';
    const browser = /Edg\//.test(ua)
        ? 'Edge'
        : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
        ? 'Safari'
        : 'Browser';
    const os = /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua)
        ? 'macOS'
        : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad|iOS/.test(ua)
        ? 'iOS'
        : /Linux/.test(ua)
        ? 'Linux'
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

const STATE_TONE = {
    expired: 'warn',
    revoked: 'error',
};

const ACTION_TONE = {
    LOGIN_SUCCESS: 'ok',
    LOGOUT: undefined,
    LOGIN_FAILED: 'error',
    LOGIN_RATE_LIMITED: 'warn',
    SESSION_REVOKED: 'error',
};

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

    useEffect(() => {
        load();
    }, [load]);

    const revoke = async (s) => {
        const self = s.current;
        if (
            self &&
            !(await confirm({
                title: 'Revoke current device?',
                message: 'This is the device you are currently using. Revoking it will log you out. Continue?',
                confirmText: 'Revoke & log out',
                danger: true,
            }))
        )
            return;
        if (
            !self &&
            !(await confirm({
                title: 'Revoke this session?',
                message: 'That device will be signed out immediately.',
                confirmText: 'Revoke',
                danger: true,
            }))
        )
            return;
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
        <div className="adm-stack">
            <div className="adm-stats">
                <Stat label="Active sessions" value={counts.active ?? 0} hint="Currently signed in" />
                <Stat label="Expired sessions" value={counts.expired ?? 0} hint={`Kept for ${retentionDays}d`} />
                <Stat label="Revoked sessions" value={counts.revoked ?? 0} hint="Signed out remotely" />
            </div>

            <div className="adm-notice adm-notice-info">
                Expired and revoked sessions stay listed for reference and are automatically deleted{' '}
                <strong className="font-semibold text-[var(--text-bright)]">
                    {retentionDays} day{retentionDays === 1 ? '' : 's'} after they exit
                </strong>
                . Active sessions are never auto-removed — revoke one to sign that device out immediately.
            </div>

            {error && (
                <div role="alert" className="adm-notice adm-notice-error">
                    {error}
                </div>
            )}

            <Panel
                title="Devices and sessions"
                actions={
                    <button type="button" onClick={load} disabled={loading} className="adm-btn">
                        <FaArrowsRotate aria-hidden="true" className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                }
                flush
            >
                <div className="border-b border-[var(--hairline)] px-4 sm:px-5">
                    <div role="group" aria-label="Filter sessions by state" className="adm-tabs border-b-0">
                        {SESSION_FILTERS.map((f) => {
                            const n = f.key === 'all' ? sessions.length : counts[f.key] ?? 0;
                            return (
                                <button
                                    key={f.key}
                                    type="button"
                                    aria-pressed={filter === f.key}
                                    onClick={() => setFilter(f.key)}
                                    className="adm-tab"
                                >
                                    {f.label} <span className="adm-num adm-help">{n}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {loading && sessions.length === 0 ? (
                    <Loading label="Loading sessions" rows={4} />
                ) : visible.length === 0 ? (
                    <EmptyState
                        title={sessions.length === 0 ? 'No sessions recorded yet' : `No ${filter} sessions`}
                        description="Sessions appear here as devices sign in to the admin console."
                    />
                ) : (
                    <ul className="adm-list">
                        {visible.map((s) => (
                            <li
                                key={s._id}
                                className={`adm-row flex-wrap justify-between gap-4 ${!s.active ? 'opacity-75' : ''}`}
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <span className="mt-0.5 shrink-0 text-[var(--text-secondary)]">
                                        {deviceIcon(s.userAgent)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-[var(--text-bright)]">
                                                {shortUA(s.userAgent)}
                                            </span>
                                            {s.current && <Badge tone="ok">This device</Badge>}
                                            {!s.active && (
                                                <Badge tone={STATE_TONE[s.state]}>
                                                    {s.state ? s.state.charAt(0).toUpperCase() + s.state.slice(1) : 'Inactive'}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-[var(--text-secondary)]">
                                            <span className="inline-flex items-center gap-1">
                                                <FaLocationDot aria-hidden="true" className="text-[var(--adm-hint)]" />
                                                {s.geo?.label || s.ipAddress || 'Unknown'}
                                            </span>
                                            <span>{s.ipAddress || '—'}</span>
                                            <span>Active {timeAgo(s.lastSeenAt)}</span>
                                            {!s.active && s.deleteAt && (
                                                <span
                                                    className="inline-flex items-center gap-1 text-[var(--adm-hint)]"
                                                    title={`Auto-deletes ${new Date(s.deleteAt).toLocaleString()}`}
                                                >
                                                    <FaTrashCan aria-hidden="true" /> Auto-deletes in {timeUntil(s.deleteAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {s.active && (
                                    <button
                                        type="button"
                                        onClick={() => revoke(s)}
                                        disabled={revoking === s._id}
                                        className="adm-btn adm-btn-danger"
                                    >
                                        {revoking === s._id ? (
                                            <FaSpinner aria-hidden="true" className="animate-spin" />
                                        ) : (
                                            <FaRightFromBracket aria-hidden="true" />
                                        )}
                                        {s.current ? 'Sign out' : 'Revoke'}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
}

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
        if (more) setLoadingMore(true);
        else setLoading(true);
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
            if (more) setLoadingMore(false);
            else setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(category, null);
    }, [category, load]);

    return (
        <div className="adm-stack">
            <div className="adm-stats">
                <Stat label="Auth events" value={counts.auth ?? 0} hint="Sign-in and sign-out activity" />
                <Stat label="Security events" value={counts.security ?? 0} hint="Failed logins and revocations" />
                <Stat
                    label="Content and system"
                    value={(counts.content || 0) + (counts.system || 0)}
                    hint="Configuration and data changes"
                />
            </div>

            {error && (
                <div role="alert" className="adm-notice adm-notice-error">
                    {error}
                </div>
            )}

            <Panel
                title="Audit trail"
                actions={
                    <button type="button" onClick={() => load(category, null)} disabled={loading} className="adm-btn">
                        <FaArrowsRotate aria-hidden="true" className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                }
                flush
            >
                <div className="border-b border-[var(--hairline)] px-4 sm:px-5">
                    <div role="group" aria-label="Filter audit log by category" className="adm-tabs border-b-0">
                        {AUDIT_CATEGORIES.map((c) => (
                            <button
                                key={c.key}
                                type="button"
                                aria-pressed={category === c.key}
                                onClick={() => setCategory(c.key)}
                                className="adm-tab"
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <Loading label="Loading audit log" rows={6} />
                ) : logs.length === 0 ? (
                    <EmptyState
                        title="No audit entries for this filter"
                        description="Try selecting another category or clearing the filter."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table min-w-[44rem]">
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Category</th>
                                    <th>Details</th>
                                    <th>IP address</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((l) => (
                                    <tr key={l._id}>
                                        <td>
                                            <Badge tone={ACTION_TONE[l.action] || 'info'}>{l.action}</Badge>
                                        </td>
                                        <td>
                                            <Badge>{l.category || 'general'}</Badge>
                                        </td>
                                        <td className="max-w-xl break-words text-[var(--text-primary)]">
                                            {l.details || '—'}
                                        </td>
                                        <td className="font-mono text-xs text-[var(--text-secondary)]">
                                            {l.ipAddress || 'no-ip'}
                                        </td>
                                        <td className="adm-num whitespace-nowrap text-xs text-[var(--text-secondary)]">
                                            {new Date(l.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {nextCursor && !loading && (
                    <div className="border-t border-[var(--hairline)] p-4 text-center">
                        <button
                            type="button"
                            onClick={() => load(category, nextCursor)}
                            disabled={loadingMore}
                            className="adm-btn"
                        >
                            {loadingMore && <FaSpinner aria-hidden="true" className="animate-spin" />}
                            Load more
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
        <div className="adm-page">
            <PageHeader
                command="who -a"
                title="Sessions and security"
                description="Monitor active devices, revoke access remotely, and audit administrative actions."
            />

            <div role="tablist" aria-label="Security sections" className="adm-tabs">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        onClick={() => setTab(t.key)}
                        className="adm-tab"
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {tab === 'sessions' ? <SessionsTab /> : <AuditTab />}
        </div>
    );
}
