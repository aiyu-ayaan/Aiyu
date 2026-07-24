"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Bot, Cpu, Zap, Code, Terminal, Folder, Loader2, Newspaper, Image as ImageIcon, Rocket, AppWindow, MoreHorizontal, Sparkles } from 'lucide-react';
import { WIDGET_ITEMS as FALLBACK_ITEMS, CATEGORIES } from './data/widgetItems';

const ITEMS_PER_PAGE = 8;

const ICON_MAP = { Bot, Cpu, Zap, Code, Terminal, Folder };

export default function WidgetsFeed({ openApp }) {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState(FALLBACK_ITEMS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchWidgetItems() {
            try {
                const res = await fetch('/api/desktop/widgets');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.items) && data.items.length > 0) {
                        if (isMounted) {
                            setItems(data.items);
                        }
                    }
                }
            } catch (err) {
                console.warn('[WARN] Failed to fetch database widget items, using fallback:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchWidgetItems();
        return () => {
            isMounted = false;
        };
    }, []);

    const filteredItems = useMemo(() => {
        if (selectedCategory === 'All') return items;
        return items.filter((item) => item.category === selectedCategory);
    }, [items, selectedCategory]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredItems, currentPage]);

    // Distribute into 2 columns for a true packed masonry layout
    const leftCol = useMemo(() => currentItems.filter((_, i) => i % 2 === 0), [currentItems]);
    const rightCol = useMemo(() => currentItems.filter((_, i) => i % 2 === 1), [currentItems]);

    const handleCategoryChange = (cat) => {
        setSelectedCategory(cat);
        setPage(1);
    };

    const handleCardClick = (item) => {
        if (item.url) {
            const targetUrl = item.url.startsWith('/') ? `${window.location.origin}${item.url}` : item.url;
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } else if (item.appKey && openApp) {
            openApp(item.appKey, item.payload);
        }
    };

    return (
        <div className="flex flex-col gap-3.5 h-full justify-between select-none">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`whitespace-nowrap rounded-full px-3 py-1 transition-all ${
                            selectedCategory === cat
                                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/40'
                                : 'bg-white/10 text-neutral-300 hover:bg-white/15 hover:text-white'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] text-neutral-400 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="text-xs font-medium">Loading Windows Widgets...</span>
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-3 min-h-[400px]">
                    {/* Integrated 2-Column Staggered Masonry Grid */}
                    <div className="grid grid-cols-2 gap-3 items-start">
                        <div className="flex flex-col gap-3">
                            {leftCol.map((item) => (
                                <WidgetCard key={item.id} item={item} onClick={() => handleCardClick(item)} />
                            ))}
                        </div>
                        <div className="flex flex-col gap-3">
                            {rightCol.map((item) => (
                                <WidgetCard key={item.id} item={item} onClick={() => handleCardClick(item)} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Windows Style Bottom Pagination Bar */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-neutral-300">
                <span className="text-[11px] text-neutral-400 font-medium">
                    Page {currentPage} of {totalPages} ({filteredItems.length} items)
                </span>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
                        aria-label="Previous Page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setPage(idx + 1)}
                                className={`h-2 rounded-full transition-all ${
                                    currentPage === idx + 1 ? 'w-4 bg-blue-500' : 'w-2 bg-white/30 hover:bg-white/50'
                                }`}
                                aria-label={`Page ${idx + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
                        aria-label="Next Page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Windows 11 Card Container Wrapper
function WindowsCard({ icon: HeaderIcon, title, onClick, children }) {
    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1f]/85 p-3 backdrop-blur-xl transition-all duration-200 hover:bg-[#242429] hover:border-blue-500/40 hover:shadow-xl"
        >
            {/* Windows Widget Card Header */}
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/5">
                <div className="flex items-center gap-1.5 text-neutral-300">
                    <HeaderIcon className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[11px] font-semibold tracking-wide text-neutral-300">{title}</span>
                </div>
                <div className="flex items-center gap-1 text-neutral-400">
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                    <MoreHorizontal className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            {children}
        </div>
    );
}

function WidgetCard({ item, onClick }) {
    switch (item.type) {
        case 'blog':
            return (
                <WindowsCard icon={Newspaper} title="Blogs & Articles" onClick={onClick}>
                    {/* Blog Cover Image if available */}
                    {item.image ? (
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl mb-2">
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <span className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md border border-white/10">
                                {item.readTime || 'Article'}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-[10px] text-blue-400 font-medium mb-1">
                            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-semibold text-blue-300">{item.readTime || '4 min read'}</span>
                        </div>
                    )}

                    <h4 className="text-xs font-bold leading-snug text-white group-hover:text-blue-300 line-clamp-2">{item.title}</h4>
                    {item.excerpt && <p className="mt-1 text-[10px] text-neutral-400 line-clamp-2 leading-normal">{item.excerpt}</p>}
                    
                    <div className="mt-2.5 flex items-center justify-between text-[9.5px] text-neutral-400 pt-1.5 border-t border-white/5">
                        <span className="font-mono">{item.date}</span>
                        <span className="text-blue-400 font-medium group-hover:underline">Read post →</span>
                    </div>
                </WindowsCard>
            );

        case 'image':
            return (
                <WindowsCard icon={ImageIcon} title="Portfolio Gallery" onClick={onClick}>
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                        <img src={item.src} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md border border-white/10">
                            {item.badge || 'Gallery'}
                        </span>
                    </div>
                    <div className="mt-2">
                        <h4 className="text-xs font-semibold leading-tight text-white group-hover:text-blue-300 line-clamp-1">{item.title}</h4>
                        {item.description && <p className="text-[10px] text-neutral-400 line-clamp-2 mt-0.5">{item.description}</p>}
                    </div>
                </WindowsCard>
            );

        case 'project':
            return (
                <WindowsCard icon={Rocket} title="Featured Project" onClick={onClick}>
                    {item.image && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl mb-2">
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-semibold text-blue-400 border border-blue-500/30">{item.status || 'Active'}</span>
                    </div>
                    <h4 className="text-xs font-bold leading-tight text-white group-hover:text-blue-300">{item.title}</h4>
                    {item.description && <p className="mt-1 text-[10px] text-neutral-400 line-clamp-2">{item.description}</p>}
                    
                    {Array.isArray(item.techStack) && item.techStack.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {item.techStack.map((tech) => (
                                <span key={tech} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-neutral-300">
                                    {tech}
                                </span>
                            ))}
                        </div>
                    )}
                </WindowsCard>
            );

        case 'app': {
            const IconComponent = ICON_MAP[item.icon] || Code;
            return (
                <WindowsCard icon={AppWindow} title="App Shortcut" onClick={onClick}>
                    <div className="flex items-start gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-500/30">
                            <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold leading-tight text-white group-hover:text-blue-400">{item.title}</h4>
                            {item.description && <p className="mt-0.5 text-[10px] text-neutral-400 line-clamp-2">{item.description}</p>}
                        </div>
                    </div>
                </WindowsCard>
            );
        }

        case 'skill': {
            const IconComp = ICON_MAP[item.icon] || Zap;
            return (
                <WindowsCard icon={Sparkles} title="AI Skill" onClick={onClick}>
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            <IconComp className="h-4 w-4" />
                        </div>
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-semibold text-purple-300 border border-purple-500/30">
                            {item.level}
                        </span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-tight group-hover:text-purple-300">{item.title}</h4>
                    {item.description && <p className="mt-1 text-[10px] text-neutral-400 leading-normal">{item.description}</p>}
                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {item.tags.map((t) => (
                                <span key={t} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-neutral-300">
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </WindowsCard>
            );
        }

        default:
            return null;
    }
}
