
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaArrowUp, FaGithub, FaPalette, FaTerminal } from 'react-icons/fa';
import { getIconByName } from '../../lib/icons';
import { useTheme } from '../context/ThemeContext';

export default function Footer({ socialData, name, config, packageVersion }) {
    const pathname = usePathname();
    const isBlogsRoute = pathname?.startsWith('/blogs');
    const { activeThemeData, mounted } = useTheme();
    const socials = socialData?.map(s => ({
        ...s,
        icon: getIconByName(s.iconName)
    })) || [];

    const visibleSocials = socials.filter((social) => social.url && !social.isHidden && social.icon);
    const currentYear = new Date().getFullYear();
    const footerPrimaryText = config?.footerText || `Crafted with intent by ${name || 'Ayaaan'}.`;
    const footerSecondaryText = config?.footerText2 || 'Designing meaningful products with clean engineering.';
    const normalizedPackageVersion = packageVersion
        ? (String(packageVersion).startsWith('v') ? String(packageVersion) : `v${packageVersion}`)
        : null;
    const footerVersionText = normalizedPackageVersion || config?.footerVersion || null;

    const scrollToTop = () => {
        if (typeof window === 'undefined') return;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer
            id="site-footer"
            className={`relative w-full px-4 pb-8 pt-12 sm:px-6 ${isBlogsRoute ? 'hidden' : ''}`}
            style={{ color: 'var(--text-primary)' }}
        >
            <div
                className="pointer-events-none absolute left-6 top-6 h-48 w-48 rounded-full blur-3xl"
                style={{
                    background:
                        'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 26%, transparent), transparent 70%)',
                }}
            />
            <div
                className="pointer-events-none absolute right-10 top-10 h-44 w-44 rounded-full blur-3xl"
                style={{
                    background:
                        'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 28%, transparent), transparent 70%)',
                }}
            />

            <div
                className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%] rounded-3xl border p-5 sm:p-7"
                style={{
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                    background:
                        'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
                    boxShadow: '0 14px 30px var(--shadow-sm)',
                    backdropFilter: 'blur(16px)',
                }}
            >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr_auto] lg:items-start">
                    <div>
                        <p
                            className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--accent-cyan) 42%, var(--border-secondary))',
                                color: 'var(--accent-cyan)',
                            }}
                        >
                            <FaTerminal size={11} />
                            End Of Session
                        </p>

                        <h3
                            className="mb-2 text-2xl font-bold sm:text-3xl"
                            style={{
                                backgroundImage:
                                    'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-orange))',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                color: 'transparent',
                            }}
                        >
                            {name || 'Ayaaan'}
                        </h3>

                        <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                            {footerPrimaryText}
                        </p>
                        <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                            {footerSecondaryText}
                        </p>

                        {config?.showWorkStatus && (
                            <div
                                className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                                style={{
                                    borderColor: 'color-mix(in srgb, var(--status-success) 46%, var(--border-secondary))',
                                    color: 'var(--status-success)',
                                    backgroundColor: 'color-mix(in srgb, var(--status-success) 12%, transparent)',
                                }}
                            >
                                <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--status-success)' }} />
                                {config?.workStatus || 'Available for work'}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                            Find Me Online
                        </p>

                        {visibleSocials.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {visibleSocials.map((social) => (
                                    <Link
                                        key={`${social.name}-${social.url}`}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.name}
                                        title={social.name}
                                    >
                                        <motion.div
                                            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
                                            style={{
                                                borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                                color: 'var(--text-secondary)',
                                            }}
                                            whileHover={{
                                                y: -2,
                                                borderColor: 'var(--accent-orange)',
                                                color: 'var(--accent-orange)',
                                            }}
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            <social.icon className="h-4 w-4" />
                                            <span className="text-xs sm:text-sm">{social.name}</span>
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div
                                className="rounded-xl border px-3 py-3 text-sm"
                                style={{
                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 78%, transparent)',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                Social links are coming soon.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-start gap-2 lg:items-end">
                        {footerVersionText && (
                            config?.footerVersionLink ? (
                                <Link
                                    href={config.footerVersionLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                                    style={{
                                        borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                        color: 'var(--text-secondary)',
                                        backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                    }}
                                >
                                    <FaGithub className="h-3.5 w-3.5" />
                                    {footerVersionText}
                                </Link>
                            ) : (
                                <span
                                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                                    style={{
                                        borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                        color: 'var(--text-secondary)',
                                        backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                    }}
                                >
                                    <FaGithub className="h-3.5 w-3.5" />
                                    {footerVersionText}
                                </span>
                            )
                        )}

                        {mounted && activeThemeData?.name && (
                            <div
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                                style={{
                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                    color: 'var(--text-secondary)',
                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                }}
                            >
                                <FaPalette className="h-3.5 w-3.5" />
                                {activeThemeData.name}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={scrollToTop}
                            className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--accent-cyan) 48%, var(--border-secondary))',
                                color: 'var(--accent-cyan)',
                                backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 11%, transparent)',
                            }}
                        >
                            <FaArrowUp className="h-3 w-3" />
                            Back To Top
                        </button>
                    </div>
                </div>

                <div
                    className="mt-6 flex flex-col gap-2 border-t pt-5 text-sm"
                    style={{
                        borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                    }}
                >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                        Site Navigation
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {[
                            { name: 'Home', href: '/' },
                            { name: 'Projects', href: '/projects' },
                            { name: 'Apps', href: '/apps' },
                            { name: 'Blogs', href: '/blogs' },
                            { name: 'Gallery', href: '/gallery' },
                            { name: 'GitHub', href: '/github' },
                            { name: 'Contact', href: '/contact-us' },
                            { name: 'Sitemap', href: '/sitemap' }
                        ].map(link => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="font-medium hover:underline transition-all"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>

                <div
                    className="mt-6 flex flex-col gap-2 border-t pt-4 text-xs sm:flex-row sm:items-center sm:justify-between"
                    style={{
                        borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                        color: 'var(--text-tertiary)',
                    }}
                >
                    <p>© {currentYear} {name || 'Ayaaan'}. All rights reserved.</p>
                    <p style={{ color: 'var(--text-muted)' }}>Built for speed, readability, and delightful UX.</p>
                </div>
            </div>
        </footer>
    );
}
