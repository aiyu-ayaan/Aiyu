"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    FaPlus,
    FaGear,
    FaCode,
    FaMagnifyingGlass,
    FaArrowUp,
    FaArrowDown,
    FaPen,
    FaTrash,
    FaFileLines,
    FaCheck,
    FaXmark,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { PageHeader, Panel, Stat, Badge, EmptyState, Loading } from '@/app/components/admin/ui';
import '@/app/styles/admin-blogs.css';

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
                return dateStr ? `${dateStr} · ${timeStr}` : dateObj.toLocaleString('en-US', {
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
    const [searchQuery, setSearchQuery] = useState('');
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

    const sortedBlogs = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return blogs;
        return blogs.filter((blog) => {
            const title = (blog.title || '').toLowerCase();
            const slug = (blog.slug || '').toLowerCase();
            const tags = Array.isArray(blog.tags) ? blog.tags.join(' ').toLowerCase() : '';
            const reason = (blog.flagReason || '').toLowerCase();
            return title.includes(q) || slug.includes(q) || tags.includes(q) || reason.includes(q);
        });
    }, [blogs, searchQuery]);

    const renderSortableHeader = (label, sortKey) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th scope="col">
                <button
                    type="button"
                    onClick={() => requestSort(sortKey)}
                    data-active={isSorted}
                    className="adm-sort-btn"
                >
                    <span>{label}</span>
                    {isSorted && (
                        sortConfig.direction === 'desc'
                            ? <FaArrowDown aria-hidden="true" className="w-3 h-3" />
                            : <FaArrowUp aria-hidden="true" className="w-3 h-3" />
                    )}
                </button>
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
            title: 'Delete blog post?',
            message: 'Are you sure you want to delete this blog post? This action cannot be undone.',
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

    return (
        <div className="adm-page">
            <PageHeader
                command="ls -la"
                title="Blogs"
                description="Write, review, and publish blog posts and technical articles."
                actions={
                    <>
                        <Link href="/admin/blogs/config" className="adm-btn">
                            <FaGear aria-hidden="true" /> Blog settings
                        </Link>
                        <Link href="/admin/api-reference" className="adm-btn">
                            <FaCode aria-hidden="true" /> API reference
                        </Link>
                        <Link href="/admin/blogs/new" className="adm-btn adm-btn-primary">
                            <FaPlus aria-hidden="true" /> New post
                        </Link>
                    </>
                }
            />

            <div className="adm-stats">
                <Stat label="Total posts" value={counts.all} hint="All posts in database" />
                <Stat label="Published" value={activeCount} hint="Live on public blog" />
                <Stat label="Drafts" value={ceasedCount} hint="Unpublished or offline" />
                <Stat
                    label="Flagged for review"
                    value={flaggedCount}
                    hint={flaggedCount > 0 ? 'Held by review engine' : 'No flagged posts'}
                />
            </div>

            <Panel
                title="All posts"
                actions={
                    <Badge tone={flaggedCount > 0 ? 'warn' : 'ok'}>
                        {flaggedCount > 0 ? `${flaggedCount} flagged` : `${activeCount} live`}
                    </Badge>
                }
                flush
            >
                <div className="adm-toolbar">
                    <div className="adm-tabs border-b-0" role="tablist" aria-label="Filter posts by status">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={filterTab === 'all'}
                            onClick={() => changeFilterTab('all')}
                            className="adm-tab"
                        >
                            All ({counts.all})
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={filterTab === 'active'}
                            onClick={() => changeFilterTab('active')}
                            className="adm-tab"
                        >
                            Published ({activeCount})
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={filterTab === 'ceased'}
                            onClick={() => changeFilterTab('ceased')}
                            className="adm-tab"
                        >
                            Drafts ({ceasedCount})
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={filterTab === 'flagged'}
                            onClick={() => changeFilterTab('flagged')}
                            className="adm-tab"
                        >
                            <span>Flagged</span>
                            {flaggedCount > 0 ? <Badge tone="error">{flaggedCount}</Badge> : <span>({flaggedCount})</span>}
                        </button>
                    </div>

                    <div className="adm-search-wrap">
                        <FaMagnifyingGlass aria-hidden="true" className="adm-search-icon w-3.5 h-3.5" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter loaded posts by title or tag..."
                            aria-label="Filter loaded posts"
                            className="adm-input adm-search-input"
                        />
                    </div>
                </div>

                {loading && !hasLoadedOnce ? (
                    <Loading label="Loading blog posts" rows={6} />
                ) : sortedBlogs.length === 0 ? (
                    <EmptyState
                        title={searchQuery ? 'No matching posts' : 'No blog posts yet'}
                        description={
                            searchQuery
                                ? 'Try clearing the search filter or switching tabs.'
                                : 'Write and publish your first post to appear on the public blog.'
                        }
                        action={
                            searchQuery ? (
                                <button type="button" onClick={() => setSearchQuery('')} className="adm-btn">
                                    Clear filter
                                </button>
                            ) : (
                                <Link href="/admin/blogs/new" className="adm-btn adm-btn-primary">
                                    <FaPlus aria-hidden="true" /> New post
                                </Link>
                            )
                        }
                    />
                ) : (
                    <div className={`adm-table-wrap transition-opacity ${loading && hasLoadedOnce ? 'opacity-50 pointer-events-none' : ''}`}>
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    {renderSortableHeader('Post', 'title')}
                                    {renderSortableHeader('Date', 'date')}
                                    {renderSortableHeader('Views', 'views')}
                                    {renderSortableHeader('Status', 'published')}
                                    <th scope="col" className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedBlogs.map((blog) => {
                                    const isFlagged = blog.isFlagged || blog.reviewStatus === 'FLAGGED';
                                    const isPublished = blog.published !== false;
                                    const tags = Array.isArray(blog.tags) ? blog.tags.slice(0, 3) : [];
                                    return (
                                        <tr key={blog._id}>
                                            <td>
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="adm-thumb" aria-hidden="true">
                                                        {blog.image ? (
                                                            <img src={blog.image} alt="" loading="lazy" />
                                                        ) : (
                                                            <FaFileLines className="w-4 h-4" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <Link
                                                            href={`/admin/blogs/${blog._id}`}
                                                            className="font-semibold text-[var(--text-bright)] hover:text-[var(--adm-accent-ink)] block truncate"
                                                            title={blog.title}
                                                        >
                                                            {blog.title}
                                                        </Link>
                                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                            {blog.readTime && (
                                                                <span className="adm-help font-mono">{blog.readTime}</span>
                                                            )}
                                                            {tags.map((tag) => (
                                                                <Badge key={tag}>{tag}</Badge>
                                                            ))}
                                                            {isFlagged && blog.flagReason && (
                                                                <Badge tone="error" title={blog.flagReason}>
                                                                    Reason: {blog.flagReason}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="adm-num whitespace-nowrap text-[var(--text-secondary)]">
                                                {formatBlogTimestamp(blog)}
                                            </td>
                                            <td className="adm-num whitespace-nowrap">
                                                {blog.views != null ? blog.views.toLocaleString() : '0'}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                {isFlagged ? (
                                                    <Badge tone="error">Flagged for review</Badge>
                                                ) : isPublished ? (
                                                    <Badge tone="ok">Published</Badge>
                                                ) : (
                                                    <Badge tone="warn">Draft</Badge>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isFlagged ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => approveBlog(blog._id, true)}
                                                                className="adm-btn"
                                                            >
                                                                <FaCheck aria-hidden="true" /> Approve &amp; publish
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => approveBlog(blog._id, false)}
                                                                className="adm-btn adm-btn-quiet"
                                                            >
                                                                <FaXmark aria-hidden="true" /> Dismiss flag
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePublish(blog._id, isPublished)}
                                                            className="adm-btn"
                                                        >
                                                            {isPublished ? 'Unpublish' : 'Publish'}
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={`/admin/blogs/${blog._id}`}
                                                        className="adm-icon-btn"
                                                        aria-label={`Edit ${blog.title}`}
                                                        title="Edit post"
                                                    >
                                                        <FaPen className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteBlog(blog._id)}
                                                        className="adm-icon-btn"
                                                        aria-label={`Delete ${blog.title}`}
                                                        title="Delete post"
                                                    >
                                                        <FaTrash className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="adm-panel-foot">
                    <span className="adm-num">
                        Showing {sortedBlogs.length} of {pagination.total} total
                    </span>
                    {loadingMore && <span>Loading more…</span>}
                </div>
                {pagination.hasMore && <div ref={sentinelRef} className="h-px" />}
            </Panel>
        </div>
    );
}
