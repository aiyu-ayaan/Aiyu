"use client";

import React from 'react';
import Link from 'next/link';
import { FaArrowUp } from 'react-icons/fa';
import { getIconByName } from '@/lib/icons';
import { v2PublicPath } from '@/lib/siteVersion';

const V2Footer = ({ name, config, socialData, packageVersion }) => {
    const sitemapLinks = [
        { href: v2PublicPath(config, ''), label: 'home' },
        { href: v2PublicPath(config, '/about-me'), label: 'about' },
        { href: v2PublicPath(config, '/projects'), label: 'projects' },
        { href: v2PublicPath(config, '/gallery'), label: 'gallery' },
        { href: v2PublicPath(config, '/apps'), label: 'apps' },
        { href: v2PublicPath(config, '/blogs'), label: 'writing' },
        { href: v2PublicPath(config, '/github'), label: 'github' },
        { href: v2PublicPath(config, '/sitemap'), label: 'sitemap' },
        { href: '/desktop', label: 'desktop mode' },
        { href: v2PublicPath(config, '/contact-us'), label: 'contact' },
    ];
    const socials = (socialData || [])
        .map((social) => ({ ...social, icon: getIconByName(social.iconName) }))
        .filter((social) => social.url && !social.isHidden && social.icon);

    const currentYear = new Date().getFullYear();
    const primaryText = config?.footerText || `Crafted with intent by ${name || 'the developer'}.`;
    const version = packageVersion ? `v${String(packageVersion).replace(/^v/, '')}` : null;

    const scrollToTop = () => {
        if (typeof window === 'undefined') return;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer id="site-footer" className="relative overflow-hidden" style={{ borderTop: '1px solid var(--hairline)' }}>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-10 right-2 select-none text-[8rem] font-black leading-none tracking-tighter sm:text-[13rem]"
                style={{
                    color: 'transparent',
                    WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-cyan) 16%, transparent)',
                }}
            >
                V2
            </span>

            <div className="relative mx-auto w-full max-w-7xl px-6 py-16 sm:py-20 lg:px-10">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
                    <div className="md:col-span-6">
                        <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-cyan)' }}>
                            /eof
                        </p>
                        <p className="mt-4 max-w-md text-2xl font-bold leading-snug tracking-tight sm:text-3xl" style={{ color: 'var(--text-bright)' }}>
                            {primaryText}
                        </p>
                    </div>

                    <div className="md:col-span-3">
                        <p className="mb-4 font-mono text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                            $ sitemap
                        </p>
                        <ul className="space-y-2 font-mono text-sm">
                            {sitemapLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="underline-offset-4 transition-colors duration-200 hover:underline"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        → {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="md:col-span-3">
                        <p className="mb-4 font-mono text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                            $ socials
                        </p>
                        <ul className="space-y-2 font-mono text-sm">
                            {socials.length ? socials.map((social) => {
                                const Icon = social.icon;
                                return (
                                    <li key={`${social.name}-${social.url}`}>
                                        <a
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2.5 underline-offset-4 transition-colors duration-200 hover:underline"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <Icon className="h-3.5 w-3.5" style={{ color: 'var(--accent-purple)' }} />
                                            {social.name}
                                        </a>
                                    </li>
                                );
                            }) : (
                                <li style={{ color: 'var(--text-tertiary)' }}>▸ links incoming…</li>
                            )}
                        </ul>
                    </div>
                </div>

                <div
                    className="mt-14 flex flex-wrap items-center justify-between gap-4 pt-6 font-mono text-xs"
                    style={{ borderTop: '1px solid var(--hairline)', color: 'var(--text-muted)' }}
                >
                    <p>
                        © {currentYear} {name || 'Portfolio'}
                        {version && <span className="ml-3" style={{ color: 'var(--accent-cyan)' }}>{version}</span>}
                        <span className="ml-3 hidden sm:inline">· built with next.js + gsap</span>
                    </p>
                    <button
                        type="button"
                        onClick={scrollToTop}
                        className="inline-flex cursor-pointer items-center gap-2 underline-offset-4 transition-colors duration-200 hover:underline"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        scroll --top <FaArrowUp className="h-3 w-3" style={{ color: 'var(--accent-cyan)' }} />
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default V2Footer;
