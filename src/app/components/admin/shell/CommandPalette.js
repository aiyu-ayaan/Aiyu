"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaMagnifyingGlass, FaArrowRight } from "react-icons/fa6";
import { NAV_GROUPS, NAV_ITEMS, ACCENT } from "./navConfig";

/**
 * ⌘/Ctrl-K command palette. Fuzzily filters every nav destination by label,
 * description and group, with full keyboard navigation. Purely a fast router —
 * selecting an entry pushes its route and closes the overlay.
 */
export default function CommandPalette({ open, onClose }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);

    // Precompute a searchable index once.
    const index = useMemo(() => {
        const groupOf = {};
        for (const g of NAV_GROUPS) for (const it of g.items) groupOf[it.path] = g.label;
        return NAV_ITEMS.map((it) => ({
            ...it,
            group: groupOf[it.path] || "",
            haystack: `${it.label} ${it.description} ${groupOf[it.path] || ""}`.toLowerCase(),
        }));
    }, []);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return index;
        return index.filter((it) => q.split(/\s+/).every((t) => it.haystack.includes(t)));
    }, [index, query]);

    useEffect(() => {
        if (open) {
            setQuery("");
            setActiveIndex(0);
            // Focus after the overlay paints.
            const t = setTimeout(() => inputRef.current?.focus(), 20);
            return () => clearTimeout(t);
        }
    }, [open]);

    useEffect(() => setActiveIndex(0), [query]);

    if (!open) return null;

    const go = (item) => {
        if (!item) return;
        onClose();
        router.push(item.path);
    };

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[activeIndex]);
        } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                {/* Input */}
                <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5">
                    <FaMagnifyingGlass className="text-slate-500 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Jump to a section…"
                        className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 text-[15px]"
                    />
                    <kbd className="text-[10px] font-mono text-slate-500 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[52vh] overflow-y-auto p-2">
                    {results.length === 0 && (
                        <p className="text-center text-sm text-slate-500 py-8">No sections match “{query}”.</p>
                    )}
                    {results.map((item, i) => {
                        const Icon = item.icon;
                        const accent = ACCENT[item.accent] || ACCENT.slate;
                        const isActive = i === activeIndex;
                        return (
                            <button
                                key={item.path}
                                onClick={() => go(item)}
                                onMouseMove={() => setActiveIndex(i)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${isActive ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}`}
                            >
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.bgSoft} ${accent.text}`}>
                                    <Icon className="text-[14px]" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-white truncate">{item.label}</span>
                                    <span className="block text-xs text-slate-500 truncate">{item.description}</span>
                                </span>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 shrink-0">{item.group}</span>
                                {isActive && <FaArrowRight className="text-slate-400 text-xs shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
