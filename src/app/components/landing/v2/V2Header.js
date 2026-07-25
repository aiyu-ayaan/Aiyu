"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import ThemeToggle from '../../ThemeToggle';
import TerminalPath from '../../admin/TerminalPath';
import { v2PublicPath } from '@/lib/siteVersion';

/**
 * V2 chrome: a hairline command bar. Mono wordmark, bracketed nav links,
 * theme toggle, an accent contact link — and the same interactive
 * TerminalPath as the classic header on a second row, so `cd`, `ls`,
 * `theme`, and friends keep working inside /v2.
 *
 * Below `md` the link strip collapses into a bracketed [menu] trigger that
 * opens a full-screen terminal-styled overlay (`$ ls ./nav`) listing every
 * link plus the contact pill, which is otherwise unreachable on phones.
 */
const V2Header = ({ logoText = '< aiyu />', data, config, socialData }) => {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDesktopFrame, setIsDesktopFrame] = useState(false);
    const overflowRestoreRef = useRef({ body: null, html: null });

    useEffect(() => {
        if (typeof window !== 'undefined' && window.self !== window.top) {
            setIsDesktopFrame(true);
        }
    }, []);

    // Reading surfaces stay quiet — no terminal row on the blog index/details.
    // Blogs answer at /v2/blogs normally and at /blogs when v2 is the admin
    // default (proxy rewrite keeps the classic URL), so match both.
    const showTerminal = !pathname.startsWith('/v2/blogs') && !pathname.startsWith('/blogs');

    const getV2Href = (href) => {
        if (!href || typeof href !== 'string') return href;
        if (!href.startsWith('/') || href.startsWith('//')) return href;
        if (href === '/v2' || href.startsWith('/v2/')) return href;
        if (href === '/v1' || href.startsWith('/v1/')) return href;

        const normalizedPath = href === '/' ? '' : href;
        return v2PublicPath(config, normalizedPath);
    };

    const sourceLinks = (data && data.navLinks && data.navLinks.length > 0)
        ? data.navLinks.filter(link => link.visible !== false).map(link => ({
            href: getV2Href(link.href),
            label: link.name,
            beta: link.beta,
            target: link.target
        }))
        : [
            { href: getV2Href('/'), label: 'home' },
            { href: getV2Href('/about-me'), label: 'about' },
            { href: getV2Href('/projects'), label: 'projects' },
            { href: getV2Href('/gallery'), label: 'gallery' },
            { href: getV2Href('/apps'), label: 'apps' },
            { href: getV2Href('/blogs'), label: 'blogs' },
            { href: getV2Href('/github'), label: 'github' },
        ];

    const showClassic = data?.showClassic !== false;

    const navLinks = [...sourceLinks];
    if (showClassic) {
        navLinks.push({ href: '/v1', label: 'classic' });
    }

    const contactLink = data?.contactLink || { name: 'contact --me', href: '/contact-us' };
    const contactLabel = contactLink.name || 'contact --me';
    const contactHref = getV2Href(contactLink.href || '/contact-us');

    // Close on navigation so the overlay never lingers over a new page.
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // Lock body scroll while the overlay is open, restoring whatever the
    // page had set before (same pattern as the classic Header).
    useEffect(() => {
        if (!isMenuOpen) {
            if (overflowRestoreRef.current.body !== null) {
                document.body.style.overflow = overflowRestoreRef.current.body;
                document.documentElement.style.overflow = overflowRestoreRef.current.html;
                overflowRestoreRef.current = { body: null, html: null };
            }
            return;
        }

        overflowRestoreRef.current = {
            body: document.body.style.overflow,
            html: document.documentElement.style.overflow,
        };
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        const onKeyDown = (event) => {
            if (event.key === 'Escape') setIsMenuOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            if (overflowRestoreRef.current.body !== null) {
                document.body.style.overflow = overflowRestoreRef.current.body;
                document.documentElement.style.overflow = overflowRestoreRef.current.html;
                overflowRestoreRef.current = { body: null, html: null };
            }
        };
    }, [isMenuOpen]);

    const brackets = (active) => ({ color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' });

    if (isDesktopFrame) return null;

    return (
        <>
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

                    <nav className="flex min-w-0 items-center gap-3 md:gap-4" aria-label="V2 navigation">
                        <div className="hidden min-w-0 items-center gap-4 font-mono text-sm md:flex">
                            {navLinks.map((link) => {
                                // `classic` is an opt-out action, not a location — when v2 is
                                // the admin default it shares `/` with home, so never mark it.
                                const active = link.label !== 'classic' && pathname === link.href;
                                return (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        target={link.target}
                                        className="group whitespace-nowrap transition-colors duration-200"
                                        style={{ color: active ? 'var(--text-bright)' : 'var(--text-secondary)' }}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        <span style={brackets(active)}>[</span>
                                        <span className="mx-1 underline-offset-4 group-hover:underline">{link.label}</span>
                                        {link.beta === true && (
                                            <span 
                                                className="mr-1 rounded border px-1 py-0.5 text-[9px] font-mono uppercase tracking-wide"
                                                style={{
                                                    borderColor: 'color-mix(in srgb, var(--accent-orange) 55%, var(--border-secondary))',
                                                    color: 'var(--accent-orange-bright)',
                                                    backgroundColor: 'color-mix(in srgb, var(--accent-orange) 12%, transparent)'
                                                }}
                                            >
                                                beta
                                            </span>
                                        )}
                                        <span style={brackets(active)}>]</span>
                                    </Link>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-transform duration-200 hover:scale-[1.03] active:scale-95"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
                            }}
                            aria-label="Open search"
                            title="Search (Ctrl + K)"
                        >
                            <Search size={14} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
                        </button>

                        <ThemeToggle compact />

                        <Link
                            href={contactHref}
                            className="hidden whitespace-nowrap rounded-full border px-4 py-1.5 font-mono text-xs font-semibold transition-colors duration-200 md:inline-block"
                            style={{
                                color: 'var(--accent-cyan)',
                                borderColor: 'color-mix(in srgb, var(--accent-cyan) 45%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 8%, transparent)',
                            }}
                        >
                            {contactLabel}
                        </Link>

                        <button
                            type="button"
                            onClick={() => setIsMenuOpen(true)}
                            className="font-mono text-sm transition-colors duration-200 md:hidden"
                            style={{ color: 'var(--text-secondary)' }}
                            aria-expanded={isMenuOpen}
                            aria-controls="v2-mobile-menu"
                            aria-label="Open navigation menu"
                        >
                            <span style={{ color: 'var(--text-muted)' }}>[</span>
                            <span className="mx-1">menu</span>
                            <span style={{ color: 'var(--text-muted)' }}>]</span>
                        </button>
                    </nav>
                </div>

                {/* Interactive terminal row — same component as the classic header. */}
                {showTerminal && (
                    <div className="relative" style={{ borderTop: '1px solid var(--hairline)' }}>
                        <TerminalPath socialData={socialData} config={config} />
                    </div>
                )}
            </header>

            {/* Mobile overlay — terminal-styled directory listing of the nav. */}
            <div
                id="v2-mobile-menu"
                className="fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain transition-[opacity,transform] duration-300 md:hidden"
                style={{
                    transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-primary) 94%, transparent)',
                    backdropFilter: 'blur(18px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                    opacity: isMenuOpen ? 1 : 0,
                    transform: isMenuOpen ? 'translateY(0)' : 'translateY(-2%)',
                    pointerEvents: isMenuOpen ? 'auto' : 'none',
                }}
                aria-hidden={!isMenuOpen}
            >
                <div
                    className="flex items-center justify-between px-4 py-3.5"
                    style={{ borderBottom: '1px solid var(--hairline)' }}
                >
                    <span className="font-mono text-sm font-bold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                        {logoText}
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(false)}
                        className="font-mono text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                        aria-label="Close navigation menu"
                    >
                        <span style={{ color: 'var(--text-muted)' }}>[</span>
                        <span className="mx-1">x</span>
                        <span style={{ color: 'var(--text-muted)' }}>]</span>
                        {' '}close
                    </button>
                </div>

                <nav className="flex flex-1 flex-col px-6 py-6 font-mono" aria-label="V2 mobile navigation">
                    <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--accent-cyan)' }}>$</span> ls ./nav
                    </p>

                    <ul className="flex flex-col">
                        {navLinks.map((link) => {
                            const active = link.label !== 'classic' && pathname === link.href;
                            return (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        target={link.target}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex min-h-12 items-center gap-3 text-lg transition-colors duration-200"
                                        style={{ color: active ? 'var(--text-bright)' : 'var(--text-secondary)' }}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        <span
                                            className="w-5 text-base"
                                            style={{ color: 'var(--accent-cyan)' }}
                                            aria-hidden="true"
                                        >
                                            {active ? '→' : ''}
                                        </span>
                                        {link.label}
                                        {link.beta === true && (
                                            <span 
                                                className="ml-2 rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide"
                                                style={{
                                                    borderColor: 'color-mix(in srgb, var(--accent-orange) 55%, var(--border-secondary))',
                                                    color: 'var(--accent-orange-bright)',
                                                    backgroundColor: 'color-mix(in srgb, var(--accent-orange) 12%, transparent)'
                                                }}
                                            >
                                                beta
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    <Link
                        href={contactHref}
                        onClick={() => setIsMenuOpen(false)}
                        className="mt-8 block rounded-full border px-4 py-3 text-center text-sm font-semibold transition-colors duration-200"
                        style={{
                            color: 'var(--accent-cyan)',
                            borderColor: 'color-mix(in srgb, var(--accent-cyan) 45%, transparent)',
                            backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 8%, transparent)',
                        }}
                    >
                        {contactLabel}
                    </Link>
                </nav>
            </div>
        </>
    );
};

export default V2Header;
