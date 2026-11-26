"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaMagnifyingGlass, FaArrowRight } from "react-icons/fa6";
import { NAV_GROUPS, NAV_ITEMS } from "./navConfig";

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
        <div className="adm-overlay !items-start !pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div role="dialog" aria-modal="true" aria-label="Jump to a section" className="adm-dialog !max-w-xl !overflow-hidden">
                {/* Input */}
                <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--hairline)] focus-within:border-[var(--accent-cyan)]">
                    <FaMagnifyingGlass className="text-[var(--adm-hint)] shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        aria-label="Search sections"
                        placeholder="Jump to a section…"
                        className="min-w-0 flex-1 h-full bg-transparent !outline-none font-mono text-base sm:text-sm text-[var(--text-bright)] placeholder:text-[var(--adm-hint)]"
                    />
                    <button type="button" onClick={onClose} className="adm-code cursor-pointer !text-[11px]">Esc</button>
                </div>

                {/* Results */}
                <div className="max-h-[52vh] overflow-y-auto p-2">
                    {results.length === 0 && (
                        <p className="text-center text-sm text-[var(--adm-hint)] py-8">No sections match “{query}”.</p>
                    )}
                    {results.map((item, i) => {
                        const Icon = item.icon;
                        const isActive = i === activeIndex;
                        return (
                            <button
                                key={item.path}
                                type="button"
                                onClick={() => go(item)}
                                onMouseMove={() => setActiveIndex(i)}
                                className={`w-full min-h-11 flex items-center gap-3 px-3 py-2 rounded-lg text-left cursor-pointer transition-colors ${isActive ? "bg-[var(--bg-hover)]" : ""}`}
                            >
                                <Icon className={`shrink-0 text-[14px] ${isActive ? "text-[var(--accent-cyan)]" : "text-[var(--adm-hint)]"}`} />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-mono text-sm lowercase text-[var(--text-bright)] truncate">{item.label}</span>
                                    <span className="block text-xs text-[var(--text-secondary)] truncate">{item.description}</span>
                                </span>
                                <span className="font-mono text-xs lowercase text-[var(--adm-hint)] shrink-0">{item.group}</span>
                                {isActive && <FaArrowRight aria-hidden="true" className="text-[var(--adm-hint)] text-xs shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
