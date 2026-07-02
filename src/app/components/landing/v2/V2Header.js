"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '../../ThemeToggle';

const NAV_LINKS = [
    { href: '/v2', label: 'home' },
    { href: '/v2/about-me', label: 'about' },
    { href: '/', label: 'classic' },
];

/**
 * V2 chrome: a hairline command bar. Mono wordmark with the current path as
 * a breadcrumb, bracketed nav links, theme toggle, and an accent contact
 * link — the same editorial-terminal language as the chapters below it.
 */
const V2Header = ({ logoText = '< aiyu />' }) => {
    const pathname = usePathname();
    const crumb = pathname === '/v2' ? '~/v2' : `~${pathname}`;

    return (
        <header
            className="fixed inset-x-0 top-0 z-50"
            style={{
                borderBottom: '1px solid var(--hairline)',
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 78%, transparent)',
                backdropFilter: 'blur(14px) saturate(140%)',
                WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            }}
        >
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-10">
                <Link href="/v2" className="flex min-w-0 items-baseline gap-3 font-mono text-sm">
                    <span className="font-bold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                        {logoText}
                    </span>
                    <span className="hidden truncate text-xs md:inline" style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>
                        {crumb} <span style={{ color: 'var(--accent-cyan)' }}>git:(v2)</span>
                    </span>
                </Link>

                <nav className="flex items-center gap-2 sm:gap-4" aria-label="V2 navigation">
                    <div className="flex items-center gap-2 font-mono text-xs sm:gap-4 sm:text-sm">
                        {NAV_LINKS.map((link) => {
                            const active = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="group whitespace-nowrap transition-colors duration-200"
                                    style={{ color: active ? 'var(--text-bright)' : 'var(--text-secondary)' }}
                                    aria-current={active ? 'page' : undefined}
                                >
                                    <span style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>[</span>
                                    <span className="mx-0.5 underline-offset-4 group-hover:underline sm:mx-1">{link.label}</span>
                                    <span style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>]</span>
                                </Link>
                            );
                        })}
                    </div>

                    <ThemeToggle compact />

                    <Link
                        href="/contact-us"
                        className="hidden whitespace-nowrap rounded-full border px-4 py-1.5 font-mono text-xs font-semibold transition-colors duration-200 sm:inline-block"
                        style={{
                            color: 'var(--accent-cyan)',
                            borderColor: 'color-mix(in srgb, var(--accent-cyan) 45%, transparent)',
                            backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 8%, transparent)',
                        }}
                    >
                        contact --me
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default V2Header;
