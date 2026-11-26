'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    FaArrowLeft,
    FaChevronDown,
    FaChevronLeft,
    FaChevronRight,
    FaMagnifyingGlass,
    FaRotate,
} from 'react-icons/fa6';
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import '@/app/styles/admin-system.css';

const PAGE_SIZE = 10;

function formatDate(value) {
    return value ? new Date(value).toLocaleString() : 'Unknown';
}

function formatDuration(value) {
    if (!value && value !== 0) return 'n/a';
    if (value < 1000) return `${value}ms`;
    return `${(value / 1000).toFixed(2)}s`;
}

const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'success', label: 'Success' },
    { key: 'failure', label: 'Failure' },
];

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
            limit: String(PAGE_SIZE),
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
        } catch {
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
        setPagination((prev) => ({ ...prev, page: 1 }));
        setSearch(searchInput);
    };

    const changeStatus = (value) => {
        setPagination((prev) => ({ ...prev, page: 1 }));
        setStatusFilter(value);
    };

    const changePage = (nextPage) => {
        setPagination((prev) => ({
            ...prev,
            page: Math.min(Math.max(nextPage, 1), prev.totalPages || 1),
        }));
    };

    const showingStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const showingEnd = Math.min(pagination.page * pagination.limit, pagination.total);

    return (
        <div className="adm-page">
            <PageHeader
                command="tail -f"
                title="Cron execution logs"
                description="History of scheduled and manually triggered task runs."
                actions={
                    <>
                        <Link href="/admin/config/crons" className="adm-btn">
                            <FaArrowLeft aria-hidden="true" /> Back to scheduler
                        </Link>
                        <button
                            type="button"
                            onClick={() => fetchLogs()}
                            disabled={refreshing}
                            className="adm-btn"
                        >
                            <FaRotate aria-hidden="true" className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </>
                }
            />

            {message && (
                <div
                    role="alert"
                    className={`adm-notice ${
                        message.type === 'error'
                            ? 'adm-notice-error'
                            : message.type === 'success'
                            ? 'adm-notice-ok'
                            : 'adm-notice-info'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <Panel
                title="Execution history"
                actions={<Badge>{pagination.total} runs</Badge>}
                flush
            >
                <div className="flex flex-col gap-3 border-b border-[var(--hairline)] p-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                    <form onSubmit={applySearch} className="flex flex-1 max-w-xl items-center gap-2">
                        <label htmlFor="cron-logs-search" className="sr-only">
                            Search task, URL, or log text
                        </label>
                        <div className="relative flex-1">
                            <FaMagnifyingGlass
                                aria-hidden="true"
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--adm-hint)]"
                            />
                            <input
                                id="cron-logs-search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search task, URL, or log text"
                                className="adm-input pl-9"
                            />
                        </div>
                        <button type="submit" className="adm-btn">
                            Search
                        </button>
                    </form>

                    <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
                        {STATUS_FILTERS.map((s) => (
                            <button
                                key={s.key}
                                type="button"
                                aria-pressed={statusFilter === s.key}
                                onClick={() => changeStatus(s.key)}
                                className="adm-tab"
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <Loading label="Loading execution history" rows={6} />
                ) : logs.length === 0 ? (
                    <EmptyState
                        title="No cron logs found"
                        description="Adjust the status filter or search query, or trigger a task in the scheduler."
                    />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table min-w-[52rem]">
                            <thead>
                                <tr>
                                    <th>Run</th>
                                    <th>Task</th>
                                    <th>Status</th>
                                    <th>Method</th>
                                    <th>Target URL</th>
                                    <th>Duration</th>
                                    <th className="text-right">Output</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => {
                                    const expanded = expandedLogId === log._id;
                                    return (
                                        <React.Fragment key={log._id}>
                                            <tr>
                                                <td className="adm-num whitespace-nowrap">{formatDate(log.ranAt)}</td>
                                                <td>
                                                    <div className="font-semibold text-[var(--text-bright)]">{log.cronName}</div>
                                                    {log.action && <div className="adm-help font-mono">{log.action}</div>}
                                                </td>
                                                <td>
                                                    <Badge tone={log.status === 'success' ? 'ok' : 'error'}>
                                                        {log.status === 'success' ? 'Success' : 'Failure'}
                                                    </Badge>
                                                </td>
                                                <td className="font-mono">{log.method || '—'}</td>
                                                <td>
                                                    <span
                                                        className="block max-w-[18rem] truncate font-mono text-xs"
                                                        title={log.url || ''}
                                                    >
                                                        {log.url || '—'}
                                                    </span>
                                                </td>
                                                <td className="adm-num">{formatDuration(log.durationMs)}</td>
                                                <td className="text-right">
                                                    <button
                                                        type="button"
                                                        aria-expanded={expanded}
                                                        onClick={() => setExpandedLogId(expanded ? null : log._id)}
                                                        className="adm-btn"
                                                    >
                                                        {expanded ? 'Hide log' : 'View log'}
                                                        <FaChevronDown
                                                            aria-hidden="true"
                                                            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </button>
                                                </td>
                                            </tr>
                                            {expanded && (
                                                <tr>
                                                    <td colSpan={7} className="bg-[var(--bg-secondary)] p-4 sm:px-5">
                                                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                            <span className="font-semibold text-[var(--text-bright)]">
                                                                Execution output
                                                            </span>
                                                            <span className="adm-help font-mono">{formatDate(log.ranAt)}</span>
                                                        </div>
                                                        <pre className="adm-code max-h-[32rem] whitespace-pre-wrap">
                                                            {log.log || 'No log output recorded.'}
                                                        </pre>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex flex-col gap-3 border-t border-[var(--hairline)] p-4 sm:px-5 md:flex-row md:items-center md:justify-between">
                    <p className="adm-help">
                        Showing <span className="adm-num text-[var(--text-primary)]">{showingStart}</span> to{' '}
                        <span className="adm-num text-[var(--text-primary)]">{showingEnd}</span> of{' '}
                        <span className="adm-num text-[var(--text-primary)]">{pagination.total}</span> logs
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => changePage(page - 1)}
                            disabled={page <= 1 || loading}
                            className="adm-btn"
                        >
                            <FaChevronLeft aria-hidden="true" /> Previous
                        </button>
                        <span className="adm-num px-2 text-sm text-[var(--text-secondary)]">
                            {pagination.page} / {pagination.totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => changePage(page + 1)}
                            disabled={page >= pagination.totalPages || loading}
                            className="adm-btn"
                        >
                            Next <FaChevronRight aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </Panel>
        </div>
    );
}
