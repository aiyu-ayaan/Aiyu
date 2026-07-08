"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command, Search, Terminal, FileCode, Hash, ArrowRight, BookOpen, Briefcase, Server } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SHORTCUT_KEY = "k";

const MOCK_PAGES = [
    { title: "Home", path: "/", type: "page", icon: <Command size={16} /> },
    { title: "About", path: "/about-me", type: "page", icon: <Hash size={16} /> },
    { title: "Projects", path: "/projects", type: "page", icon: <FileCode size={16} /> },
    { title: "Apps", path: "/apps", type: "page", icon: <Server size={16} /> },
    { title: "Blogs", path: "/blogs", type: "page", icon: <BookOpen size={16} /> },
    { title: "Contact", path: "/contact-us", type: "page", icon: <Hash size={16} /> },
    { title: "GitHub", path: "/github", type: "page", icon: <FileCode size={16} /> },
];


export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [apiResults, setApiResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const router = useRouter();
    const searchTimeout = useRef(null);

    // Handle Ctrl+K / Cmd+K toggle
    useEffect(() => {
        const handleOpenCommandPalette = () => setIsOpen(true);

        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === SHORTCUT_KEY) {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            } else if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("open-command-palette", handleOpenCommandPalette);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("open-command-palette", handleOpenCommandPalette);
        };
    }, []);

    // Determine mode based on query prefix
    const cleanQuery = query.trim();

    // Debounced API Search
    useEffect(() => {
        if (!cleanQuery) {
            setApiResults([]);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        const controller = new AbortController();

        setIsSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/global-search?q=${encodeURIComponent(cleanQuery)}`, {
                    signal: controller.signal,
                });
                const data = await res.json();
                setApiResults(data.results || []);
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Search failed", error);
                }
                setApiResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce

        return () => {
            clearTimeout(searchTimeout.current);
            controller.abort();
        };
    }, [cleanQuery]);

    // Combined Results
    const filteredItems = useMemo(() => {
        // 1. Local Pages Search (Local)
        const localMatches = MOCK_PAGES.filter(item =>
            item.title.toLowerCase().includes(cleanQuery.toLowerCase())
        );

        // 3. API Results (Remote) with Icon mapping
        const remoteMatches = apiResults.map(item => {
            let icon = <Hash size={16} />;
            if (item.type === 'blog') icon = <BookOpen size={16} />;
            else if (item.type === 'project') icon = <Briefcase size={16} />;
            else if (item.path === '/apps') icon = <Server size={16} />;
            else if (item.title === 'Home') icon = <Command size={16} />;

            return {
                ...item,
                icon
            };
        });

        // If no query, show standard pages
        if (!cleanQuery) return MOCK_PAGES;

        return [...localMatches, ...remoteMatches];
    }, [cleanQuery, apiResults]);

    // Reset active index on query change
    useEffect(() => {
        setActiveIndex(0);
    }, [filteredItems]);

    // Handle navigation
    const handleSelect = (item) => {
        if (!item) return;

        if (item.type === "page" || item.type === "blog" || item.type === "project") {
            if (item.path.startsWith('http')) {
                window.open(item.path, '_blank');
            } else {
                router.push(item.path);
            }
            setIsOpen(false);
            setQuery("");
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setQuery("");
            setApiResults([]); // Clear previous results
            setActiveIndex(0);
        }
    }, [isOpen]);

    const handleInputKeyDown = (e) => {
        if (filteredItems.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % filteredItems.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            handleSelect(filteredItems[activeIndex]);
        }
    };

    // Prevent scroll when open. Only touch body overflow while actually
    // open — the palette mounts lazily, and writing "unset" on mount would
    // clobber a scroll lock another overlay (header menus, dialogs) holds.
    useEffect(() => {
        if (!isOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[14vh] font-mono"
                    style={{
                        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 55%, transparent)',
                        backdropFilter: 'blur(10px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsOpen(false);
                    }}
                >
                    <motion.div
                        data-lenis-prevent
                        initial={{ scale: 0.98, opacity: 0, y: -16 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0, y: -16 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl"
                        style={{
                            borderColor: 'var(--hairline-strong)',
                            backgroundColor: 'color-mix(in srgb, var(--bg-surface) 96%, transparent)',
                            boxShadow: '0 24px 60px -20px rgba(0, 0, 0, 0.55)',
                        }}
                    >
                        {/* Input Area — terminal-style prompt */}
                        <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'var(--hairline)' }}>
                            <span aria-hidden="true" className="text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>$</span>
                            <Search size={15} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="search pages, blogs, projects, apps…"
                                className="flex-1 bg-transparent text-base placeholder:text-[color:var(--text-muted)] focus:outline-none"
                                style={{ color: 'var(--text-bright)' }}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleInputKeyDown}
                            />
                            <div className="flex items-center gap-2">
                                {isSearching && (
                                    <span className="hidden animate-pulse text-xs sm:inline" style={{ color: 'var(--accent-cyan)' }}>
                                        searching…
                                    </span>
                                )}
                                <kbd
                                    className="hidden rounded border px-1.5 py-0.5 text-[11px] md:inline-block"
                                    style={{ borderColor: 'var(--hairline-strong)', color: 'var(--text-muted)' }}
                                >
                                    esc
                                </kbd>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[58vh] overflow-y-auto p-2">
                            {filteredItems.length === 0 ? (
                                <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                    {cleanQuery ? "// no results found" : "// start typing to search"}
                                </div>
                            ) : (
                                <>
                                    <div className="mb-1 px-3 pt-1 text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        results
                                    </div>
                                    {filteredItems.map((item, index) => {
                                        const active = index === activeIndex;
                                        return (
                                            <motion.button
                                                key={item.path || item.command}
                                                layout
                                                onClick={() => handleSelect(item)}
                                                onMouseEnter={() => setActiveIndex(index)}
                                                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                                                style={{
                                                    backgroundColor: active
                                                        ? 'color-mix(in srgb, var(--accent-cyan) 12%, transparent)'
                                                        : 'transparent',
                                                }}
                                            >
                                                <div className="flex w-full items-center gap-3 overflow-hidden">
                                                    <div
                                                        className="flex h-8 w-8 min-w-8 items-center justify-center rounded-md"
                                                        style={{
                                                            backgroundColor: active
                                                                ? 'color-mix(in srgb, var(--accent-cyan) 18%, transparent)'
                                                                : 'var(--surface-tile)',
                                                            color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
                                                        }}
                                                    >
                                                        {item.type === "command" ? <Terminal size={16} /> : item.icon}
                                                    </div>
                                                    <div className="flex w-full flex-col items-start gap-0.5 overflow-hidden">
                                                        <span
                                                            className="w-full truncate text-left text-sm font-medium"
                                                            style={{ color: active ? 'var(--text-bright)' : 'var(--text-secondary)' }}
                                                        >
                                                            {item.title}
                                                        </span>
                                                        <span className="w-full truncate text-left text-xs" style={{ color: 'var(--text-muted)' }}>
                                                            {item.description || item.path}
                                                        </span>
                                                    </div>
                                                </div>
                                                {active && (
                                                    <ArrowRight size={15} className="ml-2 flex-shrink-0" style={{ color: 'var(--accent-cyan)' }} />
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </>
                            )}
                        </div>

                        {/* Footer — bracketed key hints (desktop only) */}
                        <div
                            className="hidden items-center justify-between border-t px-4 py-2 text-[11px] lg:flex"
                            style={{ borderColor: 'var(--hairline)', color: 'var(--text-muted)' }}
                        >
                            <span>
                                <span style={{ color: 'var(--accent-cyan)' }}>$</span> aiyu search
                            </span>
                            <div className="flex gap-4">
                                <span><span style={{ color: 'var(--text-secondary)' }}>[↑↓]</span> navigate</span>
                                <span><span style={{ color: 'var(--text-secondary)' }}>[↵]</span> select</span>
                                <span><span style={{ color: 'var(--text-secondary)' }}>[esc]</span> close</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
