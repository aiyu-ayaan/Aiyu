"use client";
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Bot, Cpu, Zap, Code, Terminal, Folder } from 'lucide-react';
import { WIDGET_ITEMS, CATEGORIES } from './data/widgetItems';

const ITEMS_PER_PAGE = 6;

const ICON_MAP = { Bot, Cpu, Zap, Code, Terminal, Folder };

export default function WidgetsFeed({ openApp }) {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [page, setPage] = useState(1);

    const filteredItems = useMemo(() => {
        if (selectedCategory === 'All') return WIDGET_ITEMS;
        return WIDGET_ITEMS.filter((item) => item.category === selectedCategory);
    }, [selectedCategory]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredItems, currentPage]);

    const handleCategoryChange = (cat) => {
        setSelectedCategory(cat);
        setPage(1);
    };

    return (
        <div className="flex flex-col gap-3 h-full justify-between">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`whitespace-nowrap rounded-full px-3 py-1 transition-all ${
                            selectedCategory === cat
                                ? 'bg-blue-600 text-white font-medium shadow-sm'
                                : 'bg-white/10 text-neutral-300 hover:bg-white/15 hover:text-white'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Staggered 2-Column Masonry Grid */}
            <div className="grid grid-cols-2 gap-3 items-start flex-1 min-h-[360px]">
                {currentItems.map((item) => (
                    <WidgetCard key={item.id} item={item} openApp={openApp} />
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-neutral-300">
                <span className="text-[11px] text-neutral-400">
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

function WidgetCard({ item, openApp }) {
    switch (item.type) {
        case 'image':
            return (
                <div
                    onClick={() => openApp && openApp('photos', { src: item.src })}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2 transition-all hover:bg-white/10 hover:border-blue-500/40 hover:shadow-lg"
                >
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                        <img src={item.src} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-md">
                            {item.badge}
                        </span>
                    </div>
                    <div className="mt-2 px-0.5">
                        <h4 className="text-xs font-semibold leading-tight line-clamp-1 group-hover:text-blue-400">{item.title}</h4>
                        <p className="text-[10px] text-neutral-400 line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                </div>
            );

        case 'blog':
            return (
                <div
                    onClick={() => openApp && openApp('browser', { url: item.url })}
                    className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-blue-500/40 hover:shadow-lg flex flex-col justify-between min-h-[140px]"
                >
                    <div>
                        <div className="flex items-center justify-between text-[10px] text-blue-400 font-medium">
                            <span>{item.readTime}</span>
                            <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                        </div>
                        <h4 className="mt-1 text-xs font-semibold leading-snug line-clamp-2 group-hover:text-blue-300">{item.title}</h4>
                        <p className="mt-1 text-[10px] text-neutral-400 line-clamp-2">{item.excerpt}</p>
                    </div>
                    <span className="mt-2 text-[10px] text-neutral-500">{item.date}</span>
                </div>
            );

        case 'app': {
            const IconComponent = ICON_MAP[item.icon] || Code;
            return (
                <div
                    onClick={() => openApp && openApp(item.appKey)}
                    className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-blue-500/40 hover:shadow-lg flex items-start gap-2.5"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold leading-tight group-hover:text-blue-400">{item.title}</h4>
                        <p className="mt-0.5 text-[10px] text-neutral-400 line-clamp-2">{item.description}</p>
                    </div>
                </div>
            );
        }

        case 'project':
            return (
                <div
                    onClick={() => openApp && openApp(item.appKey || 'github')}
                    className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-blue-500/40 hover:shadow-lg flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-medium text-blue-400">{item.status}</span>
                        </div>
                        <h4 className="mt-1.5 text-xs font-semibold leading-tight group-hover:text-blue-300">{item.title}</h4>
                        <p className="mt-1 text-[10px] text-neutral-400 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                        {item.techStack.map((tech) => (
                            <span key={tech} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-neutral-300">
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            );

        case 'skill': {
            const IconComp = ICON_MAP[item.icon] || Zap;
            return (
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-3 transition-all hover:border-purple-500/40 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/20 text-purple-400">
                            <IconComp className="h-4 w-4" />
                        </div>
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-semibold text-purple-300">
                            {item.level}
                        </span>
                    </div>
                    <h4 className="mt-2 text-xs font-semibold text-white leading-tight">{item.title}</h4>
                    <p className="mt-1 text-[10px] text-neutral-400 leading-normal">{item.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.map((t) => (
                            <span key={t} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-neutral-300">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            );
        }

        default:
            return null;
    }
}
