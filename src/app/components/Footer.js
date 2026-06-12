
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaArrowUp, FaGithub, FaPalette } from 'react-icons/fa';
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
            className={`chapter-section relative w-full pb-10 ${isBlogsRoute ? 'hidden' : ''}`}
            style={{ color: 'var(--text-primary)' }}
        >
            <div
                className="pointer-events-none absolute left-6 top-6 h-48 w-48 rounded-full blur-3xl"
                style={{
                    background:
                        'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 10%, transparent), transparent 70%)',
                }}
            />

            <div className="glass-panel relative mx-auto w-full max-w-[95%] p-8 sm:p-12 lg:max-w-[80%] xl:max-w-7xl xl:p-16">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.35fr_1fr_auto] lg:items-start">
                    <div>
                        <p className="eyebrow mb-3">Thanks for visiting</p>

                        <h3
                            className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl"
                            style={{ color: 'var(--text-bright)' }}
                        >
                            {name || 'Ayaaan'}
                        </h3>

                        <p className="max-w-xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {footerPrimaryText}
                        </p>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
                            {footerSecondaryText}
                        </p>

                        {config?.showWorkStatus && (
                            <div
                                className="mt-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
                                style={{
                                    borderColor: 'var(--hairline-strong)',
                                    color: 'var(--text-primary)',
                                    backgroundColor: 'var(--surface-tile)',
                                }}
                            >
                                <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--status-success)' }} />
                                {config?.workStatus || 'Available for work'}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="eyebrow mb-4 !text-xs">Find Me Online</p>

                        {visibleSocials.length > 0 ? (
                            <div className="flex flex-wrap gap-2.5">
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
                                            className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors"
                                            style={{
                                                borderColor: 'var(--hairline)',
                                                backgroundColor: 'var(--surface-tile)',
                                                color: 'var(--text-secondary)',
                                            }}
                                            whileHover={{
                                                y: -2,
                                                borderColor: 'var(--border-secondary)',
                                                color: 'var(--text-bright)',
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
                                    borderColor: 'var(--hairline)',
                                    backgroundColor: 'var(--surface-tile)',
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
                                    className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
                                    style={{
                                        borderColor: 'var(--hairline)',
                                        color: 'var(--text-tertiary)',
                                        backgroundColor: 'var(--surface-tile)',
                                    }}
                                >
                                    <FaGithub className="h-3.5 w-3.5" />
                                    {footerVersionText}
                                </Link>
                            ) : (
                                <span
                                    className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
                                    style={{
                                        borderColor: 'var(--hairline)',
                                        color: 'var(--text-tertiary)',
                                        backgroundColor: 'var(--surface-tile)',
                                    }}
                                >
                                    <FaGithub className="h-3.5 w-3.5" />
                                    {footerVersionText}
                                </span>
                            )
                        )}

                        {mounted && activeThemeData?.name && (
                            <div
                                className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
                                style={{
                                    borderColor: 'var(--hairline)',
                                    color: 'var(--text-tertiary)',
                                    backgroundColor: 'var(--surface-tile)',
                                }}
                            >
                                <FaPalette className="h-3.5 w-3.5" />
                                {activeThemeData.name}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={scrollToTop}
                            className="mt-2 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
                            style={{
                                borderColor: 'var(--hairline-strong)',
                                color: 'var(--text-primary)',
                                backgroundColor: 'var(--surface-tile)',
                            }}
                        >
                            <FaArrowUp className="h-3 w-3" />
                            Back To Top
                        </button>
                    </div>
                </div>

                <div
                    className="mt-12 flex flex-col gap-4 border-t pt-7 text-sm"
                    style={{ borderColor: 'var(--hairline)' }}
                >
                    <p className="eyebrow !text-xs">Site Navigation</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
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
                                className="text-sm font-medium transition-colors hover:underline"
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>

                <div
                    className="mt-8 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
                    style={{
                        borderColor: 'var(--hairline)',
                        color: 'var(--text-muted)',
                    }}
                >
                    <p>© {currentYear} {name || 'Ayaaan'}. All rights reserved.</p>
                    <p>Built for speed, readability, and delightful UX.</p>
                </div>
            </div>
        </footer>
    );
}
