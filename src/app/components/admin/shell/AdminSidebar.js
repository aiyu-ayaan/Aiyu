"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaAnglesLeft, FaArrowUpRightFromSquare, FaRightFromBracket, FaXmark } from "react-icons/fa6";
import { NAV_GROUPS, ACCENT, findActiveItem } from "./navConfig";

/**
 * Site brand mark. Steps through favicon sources — a custom favicon served at
 * /api/favicon, then the static /favicon.ico — and if both fail, renders a
 * gradient monogram so the brand is never a broken image.
 */
const FAVICON_SOURCES = ["/api/favicon", "/favicon.ico"];

function BrandMark() {
    const [stage, setStage] = useState(0);
    const base = "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.25)]";
    if (stage >= FAVICON_SOURCES.length) {
        return (
            <span className={`${base} bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950 font-black text-lg`}>
                A
            </span>
        );
    }
    return (
        <span className={`${base} bg-slate-900 ring-1 ring-white/10`}>
            <img
                src={FAVICON_SOURCES[stage]}
                alt="Site"
                className="h-full w-full object-contain"
                onError={() => setStage((s) => s + 1)}
            />
        </span>
    );
}

/**
 * Persistent navigation drawer for the admin CMS.
 *
 * Desktop: a fixed rail that collapses from a labelled 264px drawer to a 76px
 * icon rail. Mobile: an off-canvas panel toggled from the topbar. Active state
 * is resolved by longest-prefix match so deep routes (e.g. /admin/blogs/new)
 * still light up their parent section.
 */
export default function AdminSidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onLogout }) {
    const pathname = usePathname();
    const active = findActiveItem(pathname);

    return (
        <>
            {/* Mobile backdrop */}
            <div
                onClick={onCloseMobile}
                className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            />

            <aside
                className={[
                    "fixed inset-y-0 left-0 z-50 flex flex-col",
                    "bg-slate-950/80 backdrop-blur-2xl border-r border-white/5",
                    "transition-[width,transform] duration-300 ease-out",
                    collapsed ? "md:w-[76px]" : "md:w-[264px]",
                    "w-[280px]",
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                ].join(" ")}
            >
                {/* Brand */}
                <div className="flex items-center gap-3 h-16 px-4 border-b border-white/5 shrink-0">
                    <Link href="/admin" className="flex items-center gap-3 min-w-0" onClick={onCloseMobile}>
                        <BrandMark />
                        {!collapsed && (
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-white leading-tight truncate">Aiyu CMS</span>
                                <span className="block text-[10px] font-mono uppercase tracking-widest text-cyan-400/70">Command Center</span>
                            </span>
                        )}
                    </Link>
                    {/* Mobile close */}
                    <button
                        onClick={onCloseMobile}
                        className="ml-auto md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                        aria-label="Close menu"
                    >
                        <FaXmark />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.id}>
                            {!collapsed && (
                                <p className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                                    {group.label}
                                </p>
                            )}
                            <ul className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const accent = ACCENT[item.accent] || ACCENT.slate;
                                    const isActive = active?.path === item.path;
                                    return (
                                        <li key={item.path}>
                                            <Link
                                                href={item.path}
                                                onClick={onCloseMobile}
                                                title={collapsed ? item.label : undefined}
                                                className={[
                                                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                                                    collapsed ? "justify-center" : "",
                                                    isActive
                                                        ? "bg-white/[0.07] text-white"
                                                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]",
                                                ].join(" ")}
                                            >
                                                {/* Active accent bar */}
                                                <span
                                                    className={[
                                                        "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full transition-all",
                                                        isActive ? accent.dot : "bg-transparent",
                                                        isActive ? "opacity-100" : "opacity-0",
                                                    ].join(" ")}
                                                />
                                                <Icon
                                                    className={`shrink-0 text-[15px] transition-colors ${isActive ? accent.text : "text-slate-500 " + accent.ring}`}
                                                />
                                                {!collapsed && (
                                                    <span className="text-sm font-medium truncate">{item.label}</span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Footer actions */}
                <div className="shrink-0 border-t border-white/5 p-3 space-y-1">
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={collapsed ? "View site" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors ${collapsed ? "justify-center" : ""}`}
                    >
                        <FaArrowUpRightFromSquare className="shrink-0 text-[14px]" />
                        {!collapsed && <span className="font-medium">View site</span>}
                    </a>
                    <button
                        onClick={onLogout}
                        title={collapsed ? "Log out" : undefined}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors ${collapsed ? "justify-center" : ""}`}
                    >
                        <FaRightFromBracket className="shrink-0 text-[14px]" />
                        {!collapsed && <span className="font-medium">Log out</span>}
                    </button>

                    {/* Collapse toggle (desktop only) */}
                    <button
                        onClick={onToggleCollapse}
                        className="hidden md:flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:text-white hover:bg-white/[0.04] transition-colors"
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <FaAnglesLeft className={`shrink-0 text-[14px] transition-transform ${collapsed ? "rotate-180" : ""}`} />
                        {!collapsed && <span className="font-medium">Collapse</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
