"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ExternalLink, Bot, Cpu, Zap, Code, Terminal, Folder, Loader2, Newspaper, Image as ImageIcon, Rocket, AppWindow, MoreHorizontal, Sparkles, Globe } from 'lucide-react';
import { WIDGET_ITEMS as FALLBACK_ITEMS } from './data/widgetItems';

const BATCH_SIZE = 8;

const ICON_MAP = { Bot, Cpu, Zap, Code, Terminal, Folder };

export default function WidgetsFeed({ openApp }) {
    const [items, setItems] = useState(FALLBACK_ITEMS);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const sentinelRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchWidgetItems() {
            try {
                const res = await fetch('/api/desktop/widgets');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.items) && data.items.length > 0) {
                        if (isMounted) setItems(data.items);
                    }
                }
            } catch (err) {
                console.warn('[WARN] Failed to fetch widget items, using fallback:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchWidgetItems();
        return () => { isMounted = false; };
    }, []);

    // Infinite scroll — load more when sentinel enters viewport
    const loadMore = useCallback(() => {
        setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, items.length));
    }, [items.length]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { rootMargin: '200px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore, loading]);

    const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
    const hasMore = visibleCount < items.length;

    // Distribute into 2 columns for staggered masonry
    const { leftCol, rightCol } = useMemo(() => {
        const left = [];
        const right = [];
        visibleItems.forEach((item, i) => {
            if (i % 2 === 0) left.push(item);
            else right.push(item);
        });
        return { leftCol: left, rightCol: right };
    }, [visibleItems]);

    const handleCardClick = (item) => {
        if (item.url && openApp) {
            openApp('browser', { url: item.url, title: item.title });
        } else if (item.appKey && openApp) {
            openApp(item.appKey, item.payload);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-neutral-400 gap-3">
                <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 animate-pulse" />
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <span className="text-xs font-medium text-neutral-500">Loading Widgets…</span>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-neutral-500 gap-2">
                <Globe className="h-8 w-8 opacity-40" />
                <span className="text-xs">No widget items found.</span>
            </div>
        );
    }

    return (
        <div className="select-none pb-4">
            {/* Staggered Grid */}
            <div className="grid grid-cols-2 gap-2.5 items-start">
                    {/* Left column */}
                    <div className="flex flex-col gap-2.5">
                        {leftCol.map((item) => (
                            <WidgetCard key={item.id} item={item} onClick={() => handleCardClick(item)} />
                        ))}
                    </div>
                    {/* Right column — offset for stagger effect */}
                    <div className="flex flex-col gap-2.5 mt-5">
                        {rightCol.map((item) => (
                            <WidgetCard key={item.id} item={item} onClick={() => handleCardClick(item)} />
                        ))}
                    </div>
                </div>

                {/* Scroll sentinel — triggers loading next batch */}
                {hasMore && (
                    <div ref={sentinelRef} className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500/60" />
                    </div>
                )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Helper: get a valid image URL or null                               */
/* ------------------------------------------------------------------ */
function getImageUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    return url;
}

/* ------------------------------------------------------------------ */
/* Windows 11 Widget Card Shell                                        */
/* ------------------------------------------------------------------ */
function CardShell({ icon: Icon, label, accentColor = 'blue', onClick, children }) {
    const accents = {
        blue: 'text-blue-400 bg-blue-500/15 border-blue-500/25',
        purple: 'text-purple-400 bg-purple-500/15 border-purple-500/25',
        emerald: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
        amber: 'text-amber-400 bg-amber-500/15 border-amber-500/25',
        rose: 'text-rose-400 bg-rose-500/15 border-rose-500/25',
    };
    const accent = accents[accentColor] || accents.blue;

    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/8 bg-[#1e1e21]/90 backdrop-blur-xl transition-all duration-200 hover:bg-[#262629] hover:border-white/15 hover:shadow-lg hover:shadow-black/20"
        >
            {/* Card Header */}
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <div className="flex items-center gap-1.5">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${accent}`}>
                        <Icon className="h-3 w-3" />
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">{label}</span>
                </div>
                <div className="flex items-center gap-0.5">
                    <ExternalLink className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-80 transition-opacity" />
                    <MoreHorizontal className="h-3.5 w-3.5 text-neutral-500 opacity-0 group-hover:opacity-60 transition-opacity" />
                </div>
            </div>

            {/* Card Body */}
            <div className="px-3 pb-3">
                {children}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Widget Card Renderer                                                */
/* ------------------------------------------------------------------ */
function WidgetCard({ item, onClick }) {
    switch (item.type) {
        case 'blog': {
            const img = getImageUrl(item.image);
            return (
                <CardShell icon={Newspaper} label="Blog" accentColor="blue" onClick={onClick}>
                    {img && (
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg mb-2">
                            <img src={img} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                                {item.readTime || 'Article'}
                            </span>
                        </div>
                    )}
                    <h4 className="text-[11px] font-bold leading-snug text-white group-hover:text-blue-300 transition-colors line-clamp-2">{item.title}</h4>
                    {item.excerpt && <p className="mt-1 text-[10px] text-neutral-500 line-clamp-2 leading-relaxed">{item.excerpt}</p>}
                    <div className="mt-2 flex items-center justify-between text-[9px] text-neutral-500 pt-1.5 border-t border-white/5">
                        <span className="font-mono tabular-nums">{item.date}</span>
                        <span className="text-blue-400 font-semibold group-hover:underline">Read →</span>
                    </div>
                </CardShell>
            );
        }

        case 'image': {
            const src = getImageUrl(item.src);
            if (!src) return null;
            return (
                <CardShell icon={ImageIcon} label="Gallery" accentColor="emerald" onClick={onClick}>
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                        <img src={src} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                            <span className="inline-block rounded-md bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm mb-1">
                                {item.badge || 'Photo'}
                            </span>
                            <h4 className="text-[10px] font-semibold text-white leading-tight line-clamp-1">{item.title}</h4>
                        </div>
                    </div>
                </CardShell>
            );
        }

        case 'project': {
            const img = getImageUrl(item.image);
            return (
                <CardShell icon={Rocket} label="Project" accentColor="amber" onClick={onClick}>
                    {img && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-2">
                            <img src={img} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                            item.status === 'Active'
                                ? 'bg-green-500/15 text-green-400 border-green-500/25'
                                : item.status === 'Completed'
                                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                                    : 'bg-white/10 text-neutral-400 border-white/10'
                        }`}>
                            {item.status || 'Active'}
                        </span>
                    </div>
                    <h4 className="text-[11px] font-bold leading-tight text-white group-hover:text-amber-300 transition-colors line-clamp-1">{item.title}</h4>
                    {item.description && <p className="mt-0.5 text-[10px] text-neutral-500 line-clamp-2">{item.description}</p>}
                    {Array.isArray(item.techStack) && item.techStack.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {item.techStack.slice(0, 4).map((tech) => (
                                <span key={tech} className="rounded-md bg-white/8 px-1.5 py-0.5 text-[8px] font-medium text-neutral-400 border border-white/5">
                                    {tech}
                                </span>
                            ))}
                        </div>
                    )}
                </CardShell>
            );
        }

        case 'app': {
            const IconComponent = ICON_MAP[item.icon] || Code;
            const img = getImageUrl(item.image);
            return (
                <CardShell icon={AppWindow} label="App" accentColor="blue" onClick={onClick}>
                    <div className="flex items-start gap-2.5">
                        {img ? (
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10">
                                <img src={img} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                        ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <IconComponent className="h-5 w-5" />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h4 className="text-[11px] font-bold leading-tight text-white group-hover:text-blue-300 transition-colors line-clamp-1">{item.title}</h4>
                            {item.description && <p className="mt-0.5 text-[10px] text-neutral-500 line-clamp-2 leading-normal">{item.description}</p>}
                        </div>
                    </div>
                </CardShell>
            );
        }

        case 'skill': {
            const IconComp = ICON_MAP[item.icon] || Zap;
            return (
                <CardShell icon={Sparkles} label="AI Skill" accentColor="purple" onClick={onClick}>
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/25">
                            <IconComp className="h-4 w-4" />
                        </div>
                        <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[9px] font-bold text-purple-300 border border-purple-500/25">
                            {item.level}
                        </span>
                    </div>
                    <h4 className="text-[11px] font-bold text-white leading-tight group-hover:text-purple-300 transition-colors line-clamp-2">{item.title}</h4>
                    {item.description && <p className="mt-1 text-[10px] text-neutral-500 leading-normal line-clamp-2">{item.description}</p>}
                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {item.tags.map((t) => (
                                <span key={t} className="rounded-md bg-white/8 px-1.5 py-0.5 text-[8px] font-medium text-neutral-400 border border-white/5">
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </CardShell>
            );
        }

        default:
            return null;
    }
}
