"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBars, FaMagnifyingGlass, FaChevronRight } from "react-icons/fa6";
import { findActiveItem } from "./navConfig";

/**
 * Sticky top bar for the admin shell: mobile menu trigger, breadcrumb trail
 * derived from the active nav item, and a command-palette search launcher.
 */
export default function AdminTopbar({ onOpenMobile, onOpenSearch }) {
    const pathname = usePathname();
    const active = findActiveItem(pathname);
    const isDashboard = pathname === "/admin";

    return (
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 md:px-6 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
            {/* Mobile menu */}
            <button
                onClick={onOpenMobile}
                className="md:hidden p-2 -ml-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
                aria-label="Open menu"
            >
                <FaBars />
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 min-w-0 text-sm">
                <Link
                    href="/admin"
                    className={`font-mono uppercase tracking-wider text-xs transition-colors ${isDashboard ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                    Command Center
                </Link>
                {!isDashboard && active && (
                    <>
                        <FaChevronRight className="text-slate-600 text-[10px] shrink-0" />
                        <span className="text-white font-semibold truncate">{active.label}</span>
                    </>
                )}
            </nav>

            {/* Search launcher */}
            <button
                onClick={onOpenSearch}
                className="ml-auto group flex items-center gap-2 md:gap-3 h-9 px-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 text-slate-400 hover:text-slate-200 transition-colors"
            >
                <FaMagnifyingGlass className="text-[13px]" />
                <span className="hidden sm:inline text-sm">Search…</span>
                <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 text-[10px] font-mono text-slate-500 group-hover:text-slate-300">
                    Ctrl K
                </kbd>
            </button>
        </header>
    );
}
