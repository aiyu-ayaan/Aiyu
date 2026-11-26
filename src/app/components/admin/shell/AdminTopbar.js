"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBars, FaMagnifyingGlass } from "react-icons/fa6";
import ThemeToggle from "@/app/components/ThemeToggle";
import { findActiveItem } from "./navConfig";

/**
 * Sticky top bar for the admin shell: mobile menu trigger, breadcrumb trail
 * derived from the active nav item, a command-palette search launcher and the
 * site's theme toggle.
 */
export default function AdminTopbar({ onOpenMobile, onOpenSearch }) {
    const pathname = usePathname();
    const active = findActiveItem(pathname);
    const isDashboard = pathname === "/admin";

    return (
        <header className="sticky top-0 z-30 h-16 flex items-center gap-2 px-4 md:px-6 border-b border-[var(--hairline)] bg-[color-mix(in_srgb,var(--bg-primary)_94%,transparent)] backdrop-blur-[14px]">
            {/* Mobile menu */}
            <button
                type="button"
                onClick={onOpenMobile}
                className="adm-icon-btn md:!hidden -ml-2"
                aria-label="Open menu"
            >
                <FaBars />
            </button>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 min-w-0 font-mono text-sm lowercase">
                <Link
                    href="/admin"
                    className={`inline-flex min-h-11 sm:min-h-8 items-center transition-colors ${isDashboard ? "text-[var(--text-bright)]" : "text-[var(--adm-hint)] hover:text-[var(--text-bright)]"}`}
                >
                    admin
                </Link>
                {!isDashboard && active && (
                    <>
                        <span aria-hidden="true" className="text-[var(--text-muted)]">/</span>
                        <span aria-current="page" className="text-[var(--text-bright)] truncate">{active.label}</span>
                    </>
                )}
            </nav>

            {/* Search launcher */}
            <button type="button" onClick={onOpenSearch} aria-label="Search" className="adm-btn ml-auto">
                <FaMagnifyingGlass className="text-[13px] text-[var(--accent-cyan)]" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="adm-code hidden md:inline-block !text-[11px] !py-0">Ctrl K</kbd>
            </button>

            <div className="shrink-0 max-sm:[&>*]:h-11 max-sm:[&>*]:w-11">
                <ThemeToggle compact />
            </div>
        </header>
    );
}
