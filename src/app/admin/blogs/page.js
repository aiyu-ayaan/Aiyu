
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';

function formatBlogTimestamp(blog) {
    if (!blog) return '';
    const dateStr = blog.date || '';
    if (blog.createdAt) {
        try {
            const dateObj = new Date(blog.createdAt);
            if (!isNaN(dateObj.getTime())) {
                const timeStr = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
                return dateStr ? `${dateStr} • ${timeStr}` : dateObj.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
            }
        } catch {
            // fallback to dateStr
        }
    }
    return dateStr;
}

export default function AdminBlogsPage() {
    const { confirm } = useAdminFeedback();
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false });
    const [counts, setCounts] = useState({ all: 0, flagged: 0, ceased: 0, active: 0 });
    const PAGE_SIZE = 20;
    const sentinelRef = React.useRef(null);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            setSortConfig({ key: null, direction: 'desc' });
            setPage(1);
            return;
        }
        setSortConfig({ key, direction });
        setPage(1);
    };

    const [filterTab, setFilterTab] = useState('all');

    // Sorting/filtering happens server-side over the whole table now, so the
    // fetched page arrives already in the right order.
    const sortedBlogs = blogs;

    const renderSortableHeader = (label, sortKey, alignRight = false) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th
                onClick={() => requestSort(sortKey)}
                className={`px-6 py-5 cursor-pointer hover:bg-white/[0.03] hover:text-white transition-colors group select-none ${
                    alignRight ? 'text-right' : ''
                }`}
            >
                <div className={`flex items-center gap-1.5 ${alignRight ? 'justify-end' : ''}`}>
                    <span>{label}</span>
                    <span
                        className={`transition-all duration-200 ${
                            isSorted ? 'text-cyan-400 opacity-100' : 'opacity-0 group-hover:opacity-40'
                        }`}
                    >
                        {isSorted && sortConfig.direction === 'desc' ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                        )}
                    </span>
                </div>
            </th>
        );
    };

    useEffect(() => {
        fetchBlogs(page, filterTab, sortConfig);
    }, [page, filterTab, sortConfig.key, sortConfig.direction]);

    const fetchBlogs = async (targetPage, targetFilter, targetSort) => {
        const append = targetPage > 1;
        if (append) setLoadingMore(true); else setLoading(true);
        try {
            const params = new URLSearchParams({
                all: 'true',
                page: String(targetPage),
                limit: String(PAGE_SIZE),
                filter: targetFilter,
            });
            if (targetSort?.key) {
                params.set('sortKey', targetSort.key);
                params.set('sortDir', targetSort.direction);
            }
            const res = await fetch(`/api/blogs?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setBlogs((prev) => (append ? [...prev, ...data.data] : data.data));
                if (data.pagination) setPagination(data.pagination);
                if (data.counts) setCounts(data.counts);
                setHasLoadedOnce(true);
            }
        } catch (error) {
            console.error('Failed to fetch blogs:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Auto-load the next page once the sentinel row scrolls into view.
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && pagination.hasMore && !loading && !loadingMore) {
                    setPage((p) => p + 1);
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [pagination.hasMore, loading, loadingMore]);

    const changeFilterTab = (tab) => {
        setFilterTab(tab);
        setPage(1);
    };

    const togglePublish = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ published: !currentStatus }),
            });
            const data = await res.json();
            if (data.success) {
                // Optimistic update or refetch
                setBlogs(blogs.map(blog =>
                    blog._id === id ? { ...blog, published: !currentStatus } : blog
                ));
            }
        } catch (error) {
            console.error('Failed to toggle blog status:', error);
        }
    };

    const approveBlog = async (id, shouldBroadcast = true) => {
        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isFlagged: false,
                    flagReason: '',
                    reviewStatus: 'APPROVED',
                    published: shouldBroadcast,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setBlogs(blogs.map(blog =>
                    blog._id === id
                        ? { ...blog, isFlagged: false, flagReason: '', reviewStatus: 'APPROVED', published: shouldBroadcast }
                        : blog
                ));
            }
        } catch (error) {
            console.error('Failed to approve blog:', error);
        }
    };

    const deleteBlog = async (id) => {
        if (!(await confirm({
            title: 'Delete blog?',
            message: 'Are you sure you want to delete this blog? This action cannot be undone.',
            confirmText: 'Delete',
            danger: true,
        }))) return;

        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                if (page === 1) fetchBlogs(1, filterTab, sortConfig);
                else setPage(1);
            }
        } catch (error) {
            console.error('Failed to delete blog:', error);
        }
    };

    const flaggedCount = counts.flagged;
    const ceasedCount = counts.ceased;
    const activeCount = counts.active;

    if (loading && !hasLoadedOnce) return <div className="p-4 md:p-8 text-center text-white">Loading...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Transmission Logs</h1>
                        <p className="text-slate-400">Manage blog posts, articles, and public transmissions.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link href="/admin/blogs/config" className="px-4 py-3 rounded-lg overflow-hidden bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/50 transition-all text-blue-300 font-bold tracking-wide text-xs uppercase">
                            Blog Settings
                        </Link>
                        <Link href="/admin/api-reference" className="px-4 py-3 rounded-lg overflow-hidden bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/50 transition-all text-purple-300 font-bold tracking-wide text-xs uppercase">
                            API Reference
                        </Link>
                        <Link href="/admin/blogs/new" className="group relative px-6 py-3 rounded-lg overflow-hidden bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                            <span className="relative text-cyan-400 font-bold tracking-wide flex items-center gap-2">
                                <span className="text-lg">+</span> COMPOSE_TRANSMISSION
                            </span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/10 pb-4">
                <button
                    onClick={() => changeFilterTab('all')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        filterTab === 'all'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                    }`}
                >
                    All ({counts.all})
                </button>
                <button
                    onClick={() => changeFilterTab('flagged')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
                        filterTab === 'flagged'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                    }`}
                >
                    <span>Flagged for Review</span>
                    {flaggedCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-bold animate-pulse">
                            {flaggedCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => changeFilterTab('ceased')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        filterTab === 'ceased'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                    }`}
                >
                    Ceased / Draft ({ceasedCount})
                </button>
                <button
                    onClick={() => changeFilterTab('active')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        filterTab === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                    }`}
                >
                    Broadcast Active ({activeCount})
                </button>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className={`overflow-x-auto transition-opacity ${loading && hasLoadedOnce ? 'opacity-50 pointer-events-none' : ''}`}>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400 font-medium">
                            <tr>
                                {renderSortableHeader('Transmission Title', 'title')}
                                {renderSortableHeader('Timestamp', 'date')}
                                {renderSortableHeader('Views', 'views')}
                                {renderSortableHeader('Signal Status', 'published')}
                                <th className="px-6 py-5 text-right select-none">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {sortedBlogs.map((blog) => {
                                const isFlagged = blog.isFlagged || blog.reviewStatus === 'FLAGGED';
                                return (
                                    <tr key={blog._id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-5 font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                                            <div>
                                                <span>{blog.title}</span>
                                                {isFlagged && blog.flagReason && (
                                                    <div className="mt-1 text-xs font-normal text-rose-400/90 flex items-center gap-1">
                                                        <span className="font-mono text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30 uppercase font-semibold">
                                                            REASON:
                                                        </span>
                                                        <span>{blog.flagReason}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-slate-500 font-mono text-xs whitespace-nowrap">
                                            {formatBlogTimestamp(blog)}
                                        </td>
                                        <td className="px-6 py-5 text-slate-400 font-mono">
                                            {blog.views != null ? blog.views.toLocaleString() : '0'}
                                        </td>
                                        <td className="px-6 py-5">
                                            {isFlagged ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                                    Ceased (Flagged for Review)
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${blog.published !== false
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${blog.published !== false ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                    {blog.published !== false ? 'Broadcast Active' : 'Ceased / Offline'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {isFlagged ? (
                                                <>
                                                    <button
                                                        onClick={() => approveBlog(blog._id, true)}
                                                        className="text-emerald-400 hover:text-emerald-300 transition-colors text-xs uppercase font-bold tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded"
                                                    >
                                                        Approve & Broadcast
                                                    </button>
                                                    <button
                                                        onClick={() => approveBlog(blog._id, false)}
                                                        className="text-slate-400 hover:text-slate-200 transition-colors text-xs uppercase font-bold tracking-wider"
                                                    >
                                                        Dismiss Flag
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => togglePublish(blog._id, blog.published !== false)}
                                                    className={`${blog.published !== false ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'} transition-colors text-xs uppercase font-bold tracking-wider`}
                                                >
                                                    {blog.published !== false ? 'Cease' : 'Broadcast'}
                                                </button>
                                            )}
                                            <Link href={`/admin/blogs/${blog._id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors text-xs uppercase font-bold tracking-wider">
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => deleteBlog(blog._id)}
                                                className="text-red-400 hover:text-red-300 transition-colors text-xs uppercase font-bold tracking-wider"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {blogs.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No transmissions intercepted. Initialize new sequence.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-white/10 text-xs text-slate-400">
                    <span>
                        Showing {sortedBlogs.length} of {pagination.total} total
                    </span>
                    {loadingMore && <span className="animate-pulse">Loading more…</span>}
                </div>
                {pagination.hasMore && <div ref={sentinelRef} className="h-px" />}
            </div>
        </div>
    );
}
