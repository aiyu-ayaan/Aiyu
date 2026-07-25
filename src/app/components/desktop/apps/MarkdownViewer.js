"use client";
import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import { FOLDERS_DATA } from '@/app/data/folderMdData';
import {
    FileText,
    Search,
    Globe,
    Copy,
    Check,
    PanelLeft,
    Loader2,
    Calendar,
    Clock,
    Tag,
    BookOpen,
    ExternalLink,
} from 'lucide-react';

const ALL_FOLDER_FILES = FOLDERS_DATA.flatMap((f) => f.files);

const ReactMarkdown = dynamic(() => import('react-markdown'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center gap-2 p-4 text-xs text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span>Loading reader...</span>
        </div>
    ),
});

export default function MarkdownViewer({ payload, openApp }) {
    const [blogs, setBlogs] = useState(ALL_FOLDER_FILES);
    const [loading, setLoading] = useState(true);
    const [activeSlug, setActiveSlug] = useState(() => payload?.slug || payload?.blog?.slug || 'about-me');
    const [query, setQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let alive = true;
        async function fetchBlogs() {
            try {
                const res = await fetch('/api/blogs');
                if (res.ok) {
                    const data = await res.json();
                    if (alive && data.success && Array.isArray(data.data)) {
                        const merged = [...ALL_FOLDER_FILES, ...data.data];
                        setBlogs(merged);
                        if (!activeSlug && merged.length > 0) {
                            setActiveSlug(merged[0].slug || '');
                        }
                    }
                }
            } catch (err) {
                console.warn('[WARN] Failed to fetch blogs for MarkdownViewer:', err);
            } finally {
                if (alive) setLoading(false);
            }
        }
        fetchBlogs();
        return () => {
            alive = false;
        };
    }, []);

    const filteredBlogs = useMemo(() => {
        let result = blogs;
        if (filterCategory === 'header') {
            result = result.filter((b) => b.category === 'Header Menu');
        } else if (filterCategory === 'blogs') {
            result = result.filter((b) => b.category !== 'Header Menu');
        }
        if (!query.trim()) return result;
        const q = query.toLowerCase();
        return result.filter(
            (b) =>
                (b.title || '').toLowerCase().includes(q) ||
                (b.category || '').toLowerCase().includes(q) ||
                (b.slug || '').toLowerCase().includes(q) ||
                (b.fileName || '').toLowerCase().includes(q)
        );
    }, [blogs, query, filterCategory]);

    const [fullBlogMap, setFullBlogMap] = useState({});

    useEffect(() => {
        if (payload?.slug) {
            setActiveSlug(payload.slug);
        } else if (payload?.blog?.slug) {
            setActiveSlug(payload.blog.slug);
        }
    }, [payload]);

    useEffect(() => {
        if (!activeSlug) return;
        let alive = true;
        async function fetchSingle() {
            try {
                const res = await fetch(`/api/blogs/${encodeURIComponent(activeSlug)}`);
                if (res.ok) {
                    const json = await res.json();
                    if (alive && json.success && json.data) {
                        setFullBlogMap((prev) => ({ ...prev, [activeSlug]: json.data }));
                    }
                }
            } catch {
                // ignore
            }
        }
        fetchSingle();
        return () => {
            alive = false;
        };
    }, [activeSlug]);

    const activeBlog = useMemo(() => {
        if (activeSlug && fullBlogMap[activeSlug]) return fullBlogMap[activeSlug];
        if (!activeSlug && blogs.length > 0) return fullBlogMap[blogs[0].slug] || blogs[0];
        return blogs.find((b) => b.slug === activeSlug) || payload?.blog || blogs[0];
    }, [blogs, activeSlug, fullBlogMap, payload]);
    const handleCopyMarkdown = () => {
        if (!activeBlog) return;
        const rawContent = `# ${activeBlog.title || ''}\n\n${activeBlog.content || activeBlog.excerpt || ''}`;
        try {
            navigator.clipboard.writeText(rawContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore clipboard errors
        }
    };

    const handleOpenOnWeb = () => {
        if (!activeBlog) return;
        const targetUrl = activeBlog.route || `/blogs/${activeBlog.slug}`;
        if (activeBlog.external) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        if (openApp) {
            openApp('browser', { url: targetUrl, title: activeBlog.title || 'Page' });
        } else {
            window.open(targetUrl, '_blank');
        }
    };

    return (
        <div className="flex h-full w-full bg-[#fcfcfd] dark:bg-[#18181b] text-neutral-800 dark:text-neutral-200 select-none">
            {/* Left Sidebar */}
            {sidebarOpen && (
                <aside className="flex w-64 shrink-0 flex-col border-r border-black/10 dark:border-white/10 bg-[#f4f4f6] dark:bg-[#202023]">
                    {/* Sidebar Header */}
                    <div className="p-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            <BookOpen className="h-4 w-4 text-blue-500" />
                            <span>Blogs & Menu Docs</span>
                        </div>
                        <span className="text-[10px] rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-blue-500 font-semibold">
                            {blogs.length}
                        </span>
                    </div>

                    {/* Search Bar & Category Filters */}
                    <div className="p-2.5 space-y-2 border-b border-black/10 dark:border-white/10">
                        <div className="relative flex items-center">
                            <Search className="absolute left-2.5 h-3.5 w-3.5 opacity-40" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search documents..."
                                className="w-full rounded-lg bg-black/5 dark:bg-white/5 pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                        </div>

                        <div className="flex items-center gap-1 text-[11px]">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'header', label: 'Header Links' },
                                { id: 'blogs', label: 'Blogs' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilterCategory(tab.id)}
                                    className={`flex-1 rounded py-1 font-medium transition text-center ${
                                        filterCategory === tab.id
                                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Document List */}
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-8 text-neutral-400 gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                <span className="text-xs">Loading docs...</span>
                            </div>
                        ) : filteredBlogs.length > 0 ? (
                            filteredBlogs.map((b) => {
                                const isActive = activeBlog?.slug === b.slug;
                                return (
                                    <button
                                        key={b._id || b.slug}
                                        onClick={() => setActiveSlug(b.slug)}
                                        className={`w-full flex items-start gap-2.5 rounded-xl p-2.5 text-left transition ${
                                            isActive
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'hover:bg-black/5 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300'
                                        }`}
                                    >
                                        <FileText className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? 'text-white' : 'text-blue-500'}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-semibold truncate leading-tight">{b.title}</div>
                                            <div className={`text-[10px] mt-1 flex items-center gap-2 ${isActive ? 'text-white/80' : 'text-neutral-400'}`}>
                                                <span>{b.date || 'Recent'}</span>
                                                {b.readingTime && <span>• {b.readingTime} min</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-6 text-center text-xs text-neutral-400">No documents match search.</div>
                        )}
                    </div>
                </aside>
            )}

            {/* Main Content Area */}
            <div className="flex flex-1 min-w-0 flex-col">
                {/* Top Toolbar */}
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e21] px-4 py-2 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setSidebarOpen((v) => !v)}
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
                            title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                        >
                            <PanelLeft className="h-4 w-4" />
                        </button>

                        <div className="h-4 w-px bg-black/10 dark:bg-white/10" />

                        <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="text-xs font-bold truncate max-w-[240px] sm:max-w-[360px]">
                                {activeBlog?.title || 'Markdown Document'}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleCopyMarkdown}
                            className="flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1.5 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10 transition"
                            title="Copy Markdown Source"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy MD'}</span>
                        </button>

                        <button
                            onClick={handleOpenOnWeb}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow"
                            title="Open actual blog post in Google Chrome"
                        >
                            <Globe className="h-3.5 w-3.5" />
                            <span>Open on Web</span>
                            <ExternalLink className="h-3 w-3 opacity-70" />
                        </button>
                    </div>
                </div>

                {/* Markdown Reader Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar select-text">
                    {activeBlog ? (
                        <div className="mx-auto max-w-3xl space-y-6">
                            {/* Article Header Card */}
                            <div className="border-b border-black/10 dark:border-white/10 pb-6 space-y-3">
                                {activeBlog.category && (
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">
                                        <Tag className="h-3 w-3" />
                                        <span>{activeBlog.category}</span>
                                    </div>
                                )}

                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-neutral-900 dark:text-white">
                                    {activeBlog.title}
                                </h1>

                                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                                    {activeBlog.date && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{activeBlog.date}</span>
                                        </div>
                                    )}
                                    {activeBlog.readingTime && (
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{activeBlog.readingTime} min read</span>
                                        </div>
                                    )}
                                </div>

                                {activeBlog.excerpt && (
                                    <p className="text-sm italic text-neutral-600 dark:text-neutral-300 bg-black/5 dark:bg-white/5 p-3 rounded-xl border-l-4 border-blue-500">
                                        {activeBlog.excerpt}
                                    </p>
                                )}
                            </div>

                            {/* Markdown Rendered Content */}
                            <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-500 prose-img:rounded-xl">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {activeBlog.content || activeBlog.excerpt || '*No markdown content available.*'}
                                </ReactMarkdown>
                            </article>
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-neutral-400 gap-3">
                            <BookOpen className="h-10 w-10 opacity-30" />
                            <span className="text-xs">No blog document selected.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
