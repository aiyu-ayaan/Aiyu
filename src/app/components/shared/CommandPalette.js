"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command, Search, Terminal, FileCode, Hash, ArrowRight, BookOpen, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SHORTCUT_KEY = "k";

const MOCK_PAGES = [
    { title: "Home", path: "/", type: "page", icon: <Command size={16} /> },
    { title: "About", path: "/about-me", type: "page", icon: <Hash size={16} /> },
    { title: "Projects", path: "/projects", type: "page", icon: <FileCode size={16} /> },
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
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === SHORTCUT_KEY) {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            } else if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
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

        setIsSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/global-search?q=${encodeURIComponent(cleanQuery)}`);
                const data = await res.json();
                setApiResults(data.results || []);
            } catch (error) {
                console.error("Search failed", error);
                setApiResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(searchTimeout.current);
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
            else if (item.title === 'Home') icon = <Command size={16} />;

            return {
                ...item,
                icon
            };
        });

        // If no query, show standard pages
        if (!cleanQuery) return MOCK_PAGES;

        return [...localMatches, ...remoteMatches];

        return [...localMatches, ...remoteMatches];

    }, [query, cleanQuery, apiResults]);

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

    // Prevent scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-black/40"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsOpen(false);
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -20 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="w-full max-w-2xl flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-[#0d1117] shadow-2xl ring-1 ring-white/10"
                    >
                        {/* Input Area */}
                        <div className="flex items-center border-b border-gray-800 px-4 py-3">
                            <Search className="mr-3 h-5 w-5 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search pages, blogs, projects..."
                                className="flex-1 bg-transparent text-lg text-gray-200 placeholder-gray-500 focus:outline-none"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleInputKeyDown}
                            />
                            <div className="flex items-center gap-2">
                                {isSearching && <span className="text-xs text-gray-500 animate-pulse">Searching...</span>}
                                <span className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
                                    Esc
                                </span>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700">
                            {filteredItems.length === 0 ? (
                                <div className="py-12 text-center text-sm text-gray-500">
                                    {cleanQuery ? "No results found." : "Start typing to search..."}
                                </div>
                            ) : (
                                <>
                                    <div className="mb-2 px-2 text-xs font-semibold uppercase text-gray-500">
                                        Results
                                    </div>
                                    {filteredItems.map((item, index) => (
                                        <motion.button
                                            key={item.path || item.command}
                                            layout
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-3 transition-colors ${index === activeIndex
                                                ? "bg-blue-600/10 text-blue-400"
                                                : "text-gray-300 hover:bg-gray-800/50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 w-full overflow-hidden">
                                                <div className={`flex h-8 w-8 min-w-8 items-center justify-center rounded-md ${index === activeIndex ? "bg-blue-600/20 text-blue-400" : "bg-gray-800 text-gray-400"
                                                    }`}>
                                                    {item.type === "command" ? <Terminal size={18} /> : item.icon}
                                                </div>
                                                <div className="flex flex-col items-start gap-0.5 w-full overflow-hidden">
                                                    <span className={`text-sm font-medium truncate w-full text-left ${index === activeIndex ? "text-blue-200" : "text-gray-200"}`}>
                                                        {item.title}
                                                    </span>
                                                    <span className="text-xs text-gray-500 truncate w-full text-left">
                                                        {item.description || item.path}
                                                    </span>
                                                </div>
                                            </div>
                                            {index === activeIndex && (
                                                <ArrowRight size={16} className="text-blue-400 opacity-50 flex-shrink-0 ml-2" />
                                            )}
                                        </motion.button>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-800 bg-gray-900/50 px-4 py-2 text-xs text-gray-500 flex justify-end">
                            <div className="flex gap-4">
                                <span>Use arrows to navigate</span>
                                <span>Enter to select</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
