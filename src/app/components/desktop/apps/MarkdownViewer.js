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
    X,
} from 'lucide-react';
import { useDeviceMode } from '../../../context/DeviceModeContext';

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
    const { isMobile, isTablet } = useDeviceMode();
    const [blogs, setBlogs] = useState(ALL_FOLDER_FILES);
    const [loading, setLoading] = useState(true);
    const [activeSlug, setActiveSlug] = useState(() => payload?.slug || payload?.blog?.slug || 'about-me');
    const [query, setQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [isMobile]);

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
        if (!query.trim()) return blogs;
        const q = query.toLowerCase();
        return blogs.filter(
            (b) =>
                (b.title || '').toLowerCase().includes(q) ||
                (b.category || '').toLowerCase().includes(q) ||
                (b.slug || '').toLowerCase().includes(q) ||
                (b.fileName || '').toLowerCase().includes(q)
        );
    }, [blogs, query]);

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
                <aside className={`flex flex-col border-r border-black/10 dark:border-white/10 bg-[#f4f4f6] dark:bg-[#202023] ${isMobile ? 'absolute inset-0 z-10 w-full' : 'w-64 shrink-0'}`}>
                    {/* Sidebar Header */}
                    <div className="p-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            <BookOpen className="h-4 w-4 text-blue-500" />
                            <span>Documents</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-blue-500 font-semibold">
                                {blogs.length}
                            </span>
                            {isMobile && (
                                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="p-2.5 border-b border-black/10 dark:border-white/10">
                        <div className="relative flex items-center">
                            <Search className="absolute left-2.5 h-3.5 w-3.5 opacity-40" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search documents..."
                                className="w-full rounded-lg bg-black/5 dark:bg-white/5 pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
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
                                        onClick={() => {
                                            setActiveSlug(b.slug);
                                            if (isMobile) setSidebarOpen(false);
                                        }}
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
                            className={`flex items-center gap-1.5 rounded-lg bg-blue-600 ${isMobile ? 'px-2 py-1.5' : 'px-3 py-1.5'} text-xs font-bold text-white hover:bg-blue-500 transition shadow`}
                            title="Open actual blog post in Google Chrome"
                        >
                            <Globe className="h-3.5 w-3.5" />
                            {!isMobile && <span>Open on Web</span>}
                            <ExternalLink className="h-3 w-3 opacity-70" />
                        </button>
                    </div>
                </div>

                {/* Reader Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar select-text">
                    {activeBlog ? (
                        activeBlog.isPdf || activeBlog.fileName?.endsWith('.pdf') ? (
                            <div className="h-full w-full flex flex-col space-y-4">
                                <div className="flex items-center justify-between rounded-xl bg-blue-500/10 p-3 text-xs font-medium text-blue-600 dark:text-blue-300">
                                    <span>Viewing Embedded PDF: {activeBlog.fileName || 'resume.pdf'}</span>
                                    <button
                                        onClick={handleOpenOnWeb}
                                        className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500 transition"
                                    >
                                        Open Full PDF
                                    </button>
                                </div>
                                <iframe
                                    src={activeBlog.pdfUrl || activeBlog.route || '/api/resume'}
                                    title={activeBlog.title || 'PDF Document'}
                                    className="flex-1 w-full border-none rounded-xl bg-neutral-900 min-h-[500px]"
                                />
                            </div>
                        ) : (
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
                        )
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
