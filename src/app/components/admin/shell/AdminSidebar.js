"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaAnglesLeft, FaArrowUpRightFromSquare, FaRightFromBracket, FaXmark, FaGear } from "react-icons/fa6";
import { NAV_GROUPS, STAGE_META, SETTINGS_ITEM, findActiveItem } from "./navConfig";

/**
 * Site brand mark. Steps through favicon sources — the custom favicon at
 * /api/favicon (only when the config says one exists, so the admin does not
 * log a 404 on every page), then the static /favicon.ico — and if both fail,
 * renders a "~" glyph so the brand is never a broken image.
 */
function BrandMark({ custom }) {
    const FAVICON_SOURCES = custom ? ["/api/favicon", "/favicon.ico"] : ["/favicon.ico"];
    const [mounted, setMounted] = useState(false);
    const [stage, setStage] = useState(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    // No favicon: the "~/aiyu" wordmark beside it is the brand; the collapsed rail shows "~".
    if (!mounted || stage >= FAVICON_SOURCES.length) {
        return <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center font-mono text-base font-bold text-[var(--accent-purple)]">~</span>;
    }
    return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <img
                src={FAVICON_SOURCES[stage]}
                alt="Site"
                className="h-full w-full object-contain"
                onError={() => setStage((s) => s + 1)}
            />
        </span>
    );
}

/** Mono nav text; the current entry is bracketed `[ blogs ]`, as in the public header. */
function NavLabel({ active, children }) {
    const bracket = (char) => active && <span aria-hidden="true" className="text-[var(--text-muted)]">{char}</span>;
    return (
        <span className="flex min-w-0 gap-1 lowercase">
            {bracket("[")}
            <span className="truncate">{children}</span>
            {bracket("]")}
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
export default function AdminSidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onLogout, stages = {}, customFavicon = false }) {
    const pathname = usePathname();
    const active = findActiveItem(pathname);
    const settingsActive = pathname === SETTINGS_ITEM.path;

    const row = `adm-nav-link ${collapsed ? "justify-center" : ""}`;

    return (
        <>
            {/* Mobile backdrop */}
            <div
                onClick={onCloseMobile}
                className={`fixed inset-0 z-40 bg-[var(--overlay-bg)] backdrop-blur-sm md:hidden transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            />

            <aside
                className={[
                    "fixed inset-y-0 left-0 z-50 flex flex-col",
                    "bg-[var(--bg-secondary)] border-r border-[var(--hairline)]",
                    "transition-[width,transform,visibility] duration-200 ease-out",
                    collapsed ? "md:w-[76px]" : "md:w-[264px]",
                    "w-[280px]",
                    // max-md:invisible keeps the closed drawer's links out of the tab order.
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 max-md:invisible",
                ].join(" ")}
            >
                {/* Brand */}
                <div className="flex items-center gap-3 h-16 px-4 border-b border-[var(--hairline)] shrink-0">
                    <Link href="/admin" aria-label="Admin dashboard" className="flex items-center gap-2 min-w-0" onClick={onCloseMobile}>
                        <BrandMark custom={customFavicon} />
                        {!collapsed && (
                            <span className="truncate font-mono text-sm font-bold text-[var(--text-bright)]">~/aiyu</span>
                        )}
                    </Link>
                    {/* Mobile close */}
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="adm-icon-btn ml-auto md:!hidden"
                        aria-label="Close menu"
                    >
                        <FaXmark />
                    </button>
                </div>

                {/* Nav */}
                <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-5">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.id}>
                            {!collapsed && (
                                <p className="px-3 mb-1 font-mono text-xs lowercase text-[var(--adm-hint)]">
                                    {group.label}
                                </p>
                            )}
                            <ul className="space-y-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = active?.path === item.path;
                                    const stage = STAGE_META[stages[item.path]];
                                    return (
                                        <li key={item.path}>
                                            <Link
                                                href={item.path}
                                                onClick={onCloseMobile}
                                                title={collapsed ? item.label : undefined}
                                                aria-label={collapsed ? item.label : undefined}
                                                aria-current={isActive ? "page" : undefined}
                                                className={`${row} ${isActive && collapsed ? "bg-[var(--bg-hover)]" : ""}`}
                                            >
                                                <span className="adm-nav-icon relative shrink-0">
                                                    <Icon className="text-[14px]" />
                                                    {collapsed && stage && (
                                                        <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${stage.dot} ring-2 ring-[var(--bg-secondary)]`} />
                                                    )}
                                                </span>
                                                {!collapsed && <NavLabel active={isActive}>{item.label}</NavLabel>}
                                                {!collapsed && stage && (
                                                    <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] lowercase ${stage.badge}`}>
                                                        {stage.label}
                                                    </span>
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
                <div className="shrink-0 border-t border-[var(--hairline)] p-3 space-y-0.5">
                    <Link
                        href={SETTINGS_ITEM.path}
                        onClick={onCloseMobile}
                        title={collapsed ? "Settings" : undefined}
                        aria-label={collapsed ? "Settings" : undefined}
                        aria-current={settingsActive ? "page" : undefined}
                        className={`${row} ${settingsActive && collapsed ? "bg-[var(--bg-hover)]" : ""}`}
                    >
                        <FaGear className="shrink-0 text-[14px]" />
                        {!collapsed && <NavLabel active={settingsActive}>Settings</NavLabel>}
                    </Link>
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={collapsed ? "View site" : undefined}
                        aria-label={collapsed ? "View site" : undefined}
                        className={row}
                    >
                        <FaArrowUpRightFromSquare className="shrink-0 text-[14px]" />
                        {!collapsed && <span className="lowercase">View site</span>}
                    </a>
                    <button
                        type="button"
                        onClick={onLogout}
                        title={collapsed ? "Log out" : undefined}
                        aria-label={collapsed ? "Log out" : undefined}
                        className={`${row} !text-[var(--adm-error-ink)]`}
                    >
                        <FaRightFromBracket className="shrink-0 text-[14px]" />
                        {!collapsed && <span className="lowercase">Log out</span>}
                    </button>

                    {/* Collapse toggle (desktop only) */}
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className={`${row} max-md:!hidden`}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-label={collapsed ? "Expand sidebar" : undefined}
                    >
                        <FaAnglesLeft className={`shrink-0 text-[14px] transition-transform ${collapsed ? "rotate-180" : ""}`} />
                        {!collapsed && <span className="lowercase">Collapse</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
