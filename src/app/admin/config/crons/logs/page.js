'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, RefreshCw, Search, Terminal, XCircle } from 'lucide-react';

const PAGE_SIZE = 10;

function formatDate(value) {
    return value ? new Date(value).toLocaleString() : 'Unknown';
}

function formatDuration(value) {
    if (!value && value !== 0) return 'n/a';
    if (value < 1000) return `${value}ms`;
    return `${(value / 1000).toFixed(2)}s`;
}

export default function CronLogsPage() {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    const [cronId, setCronId] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(null);

    const page = pagination.page;

    const queryString = useMemo(() => {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_SIZE)
        });
        if (cronId) params.set('cronId', cronId);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (search.trim()) params.set('search', search.trim());
        return params.toString();
    }, [page, cronId, statusFilter, search]);

    const fetchLogs = async ({ initial = false } = {}) => {
        if (initial) setLoading(true);
        setRefreshing(true);
        try {
            const res = await fetch(`/api/admin/crons/logs?${queryString}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.success) {
                setLogs(data.data || []);
                setPagination(data.pagination || { page, limit: PAGE_SIZE, total: 0, totalPages: 1 });
                setExpandedLogId(null);
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to load cron logs.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Could not reach cron logs API.' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs({ initial: true });
    }, [queryString]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setCronId(params.get('cronId') || '');
    }, []);

    const applySearch = (event) => {
        event.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearch(searchInput);
    };

    const changeStatus = (value) => {
        setPagination(prev => ({ ...prev, page: 1 }));
        setStatusFilter(value);
    };

    const changePage = (nextPage) => {
        setPagination(prev => ({
            ...prev,
            page: Math.min(Math.max(nextPage, 1), prev.totalPages || 1)
        }));
    };

    const showingStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const showingEnd = Math.min(pagination.page * pagination.limit, pagination.total);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
            <div className="relative z-10 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <Link href="/admin/config/crons" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition">
                            <ArrowLeft size={14} />
                            Cron Schedules
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400">
                                <Terminal size={22} />
                            </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Cron Execution Logs</h1>
                            <p className="text-sm text-slate-400">Paginated history of scheduled and manually triggered task runs.</p>
                        </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchLogs()}
                        disabled={refreshing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-500/30 hover:text-cyan-300 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {message && (
                    <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>
                        {message.text}
                    </div>
                )}

                <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-4 md:p-5 backdrop-blur-md space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <form onSubmit={applySearch} className="relative flex-1 max-w-xl">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search task, URL, or log text"
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-9 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                            />
                        </form>

                        <div className="flex rounded-xl border border-white/10 bg-slate-950 p-1">
                            {['all', 'success', 'failure'].map(status => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => changeStatus(status)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${statusFilter === status ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/10">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead className="bg-slate-950/80 text-[10px] uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Run</th>
                                        <th className="px-4 py-3">Task</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Method</th>
                                        <th className="px-4 py-3">Target URL</th>
                                        <th className="px-4 py-3">Duration</th>
                                        <th className="px-4 py-3 text-right">Log</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-slate-900/30">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-slate-500">Loading execution history...</td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-slate-500">No cron logs found.</td>
                                        </tr>
                                    ) : (
                                        logs.map(log => (
                                            <React.Fragment key={log._id}>
                                                <tr className="hover:bg-white/[0.03] transition">
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={13} className="text-slate-500" />
                                                            {formatDate(log.ranAt)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-white">{log.cronName}</div>
                                                        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{log.action}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                                                            {log.status === 'success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs font-bold text-pink-300">{log.method || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="block max-w-[280px] truncate font-mono text-xs text-cyan-300" title={log.url || ''}>
                                                            {log.url || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{formatDuration(log.durationMs)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedLogId(expandedLogId === log._id ? null : log._id)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-500/30 hover:text-cyan-300"
                                                        >
                                                            Full Log
                                                            <ChevronDown size={13} className={`transition ${expandedLogId === log._id ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expandedLogId === log._id && (
                                                    <tr>
                                                        <td colSpan={7} className="bg-slate-950/70 px-4 py-4">
                                                            <div className="rounded-2xl border border-white/10 bg-slate-950 overflow-hidden">
                                                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
                                                                    <div className="flex min-w-0 items-center gap-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setExpandedLogId(null)}
                                                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/15"
                                                                        >
                                                                            Collapse
                                                                            <ChevronDown size={13} className="rotate-180" />
                                                                        </button>
                                                                        <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Full Execution Log</div>
                                                                    </div>
                                                                    <div className="font-mono text-[10px] text-slate-500">{formatDate(log.ranAt)}</div>
                                                                </div>
                                                                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-cyan-300 custom-scrollbar">
                                                                    {log.log || 'No log output recorded.'}
                                                                </pre>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm text-slate-500">
                        <span>
                            Showing <span className="font-mono text-slate-300">{showingStart}</span> to <span className="font-mono text-slate-300">{showingEnd}</span> of <span className="font-mono text-slate-300">{pagination.total}</span> logs
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => changePage(page - 1)}
                                disabled={page <= 1 || loading}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-white/20 disabled:opacity-40"
                            >
                                <ChevronLeft size={14} />
                                Prev
                            </button>
                            <span className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-300">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => changePage(page + 1)}
                                disabled={page >= pagination.totalPages || loading}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-white/20 disabled:opacity-40"
                            >
                                Next
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
