"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '../../ThemeToggle';
import TerminalPath from '../../admin/TerminalPath';
import { v2PublicPath } from '@/lib/siteVersion';

/**
 * V2 chrome: a hairline command bar. Mono wordmark, bracketed nav links,
 * theme toggle, an accent contact link — and the same interactive
 * TerminalPath as the classic header on a second row, so `cd`, `ls`,
 * `theme`, and friends keep working inside /v2.
 */
const V2Header = ({ logoText = '< aiyu />', config, socialData }) => {
    const pathname = usePathname();
    // Reading surfaces stay quiet — no terminal row on the blog index/details.
    // Blogs answer at /v2/blogs normally and at /blogs when v2 is the admin
    // default (proxy rewrite keeps the classic URL), so match both.
    const showTerminal = !pathname.startsWith('/v2/blogs') && !pathname.startsWith('/blogs');

    const navLinks = [
        { href: v2PublicPath(config, ''), label: 'home' },
        { href: v2PublicPath(config, '/about-me'), label: 'about' },
        { href: v2PublicPath(config, '/projects'), label: 'projects' },
        { href: v2PublicPath(config, '/gallery'), label: 'gallery' },
        { href: v2PublicPath(config, '/apps'), label: 'apps' },
        { href: v2PublicPath(config, '/blogs'), label: 'blogs' },
        { href: '/', label: 'classic' },
    ];

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
                <Link href={v2PublicPath(config, '')} className="flex min-w-0 items-baseline gap-3 font-mono text-sm">
                    <span className="font-bold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                        {logoText}
                    </span>
                </Link>

                <nav className="flex min-w-0 items-center gap-2 sm:gap-4" aria-label="V2 navigation">
                    <div
                        className="flex min-w-0 items-center gap-2 overflow-x-auto font-mono text-xs sm:gap-4 sm:text-sm"
                        style={{ scrollbarWidth: 'none' }}
                    >
                        {navLinks.map((link) => {
                            const active = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={link.label === 'classic' ? () => {
                                        // Opting out of v2: remember it so classic pages stop
                                        // redirecting here when v2 is the admin default.
                                        document.cookie = 'site-version=classic; path=/; max-age=31536000';
                                    } : undefined}
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
                        href={v2PublicPath(config, '/contact-us')}
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

            {/* Interactive terminal row — same component as the classic header. */}
            {showTerminal && (
                <div className="relative" style={{ borderTop: '1px solid var(--hairline)' }}>
                    <TerminalPath socialData={socialData} config={config} />
                </div>
            )}
        </header>
    );
};

export default V2Header;
