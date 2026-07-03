"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { FaArrowUpRightFromSquare, FaGlobe, FaShieldHalved, FaScrewdriverWrench, FaXmark } from 'react-icons/fa6';
import { getPlaceholderGradient, getProjectInitials } from '../projects/projectPlaceholder';
import { trackEntityView } from '@/lib/track';

const normalizeStatus = (status) => {
    const safeStatus = String(status || '').trim().toLowerCase();

    if (safeStatus === 'live' || safeStatus === 'healthy' || safeStatus === 'online') return 'Live';
    if (safeStatus === 'maintenance' || safeStatus === 'updating') return 'Maintenance';
    if (safeStatus === 'private' || safeStatus === 'internal') return 'Private';
    if (safeStatus === 'archived' || safeStatus === 'retired') return 'Archived';

    return safeStatus || 'Unknown';
};

const STATUS_COLORS = {
    Live: 'var(--status-success)',
    Maintenance: 'var(--accent-orange)',
    Private: 'var(--accent-purple)',
    Archived: 'var(--text-muted)',
};

const getStatusColor = (status) => STATUS_COLORS[normalizeStatus(status)] || 'var(--text-secondary)';

export default function DeploymentDialog({ deployment, onClose, isV2: propIsV2 }) {
    const pathname = usePathname();
    const [isV2, setIsV2] = useState(propIsV2 || false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (propIsV2 !== undefined) {
            setIsV2(propIsV2);
            return;
        }
        setIsV2(
            pathname?.startsWith('/v2') ||
            (typeof document !== 'undefined' && !!document.querySelector('[data-v2-shell="true"]')) ||
            (typeof window !== 'undefined' && window.location.pathname.startsWith('/v2'))
        );
    }, [pathname, propIsV2]);

    useEffect(() => {
        if (deployment) {
            trackEntityView({
                entityType: 'app',
                entityId: deployment._id || deployment.id,
                entitySlug: deployment.slug || deployment.name,
            });
        }
    }, [deployment]);

    useEffect(() => {
        if (!deployment) return undefined;

        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [deployment, onClose]);

    if (!mounted) return null;

    const normalizedStatus = normalizeStatus(deployment?.status);
    const statusColor = getStatusColor(deployment?.status);
    const techStack = Array.isArray(deployment?.techStack) ? deployment.techStack : [];

    return createPortal(
        <AnimatePresence>
            {deployment && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-6 backdrop-blur-md sm:py-10"
                    style={{
                        background: isV2
                            ? 'rgba(0, 0, 0, 0.85)'
                            : 'radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--accent-cyan) 15%, transparent), transparent 45%), radial-gradient(circle at 80% 80%, color-mix(in srgb, var(--accent-purple) 15%, transparent), transparent 45%), var(--overlay-bg)',
                    }}
                    onClick={onClose}
                >
                <motion.div
                    data-lenis-prevent
                    initial={{ scale: 0.96, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 16 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={
                        isV2
                            ? "relative w-full max-w-4xl overflow-hidden rounded-none border shadow-2xl flex flex-col"
                            : "relative w-full max-w-4xl overflow-hidden rounded-3xl border shadow-2xl flex flex-col"
                    }
                    style={{
                        maxHeight: 'min(88dvh, calc(100% - 2rem))',
                        background: isV2
                            ? 'var(--bg-primary)'
                            : 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 95%, transparent), color-mix(in srgb, var(--bg-secondary) 96%, transparent))',
                        borderColor: isV2
                            ? 'var(--hairline)'
                            : 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
                    }}
                    onClick={(event) => event.stopPropagation()}
                >
                    {isV2 ? (
                        <div className="flex items-center justify-between border-b px-5 py-4 shrink-0" style={{ borderColor: 'var(--hairline)' }}>
                            <span className="font-mono text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: 'var(--status-success)' }}>
                                ~/app-details
                            </span>
                            <button
                                onClick={onClose}
                                className="font-mono text-xs uppercase tracking-widest transition-colors hover:text-white flex items-center gap-1.5"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                [close] <FaXmark />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div
                                className="h-1.5 w-full shrink-0"
                                style={{
                                    background:
                                        'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple), var(--accent-orange), var(--accent-cyan))',
                                    backgroundSize: '220% 100%',
                                }}
                            />
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
                                style={{
                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
                                    color: 'var(--text-secondary)',
                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
                                }}
                                aria-label="Close app details"
                            >
                                <FaXmark />
                            </button>
                        </>
                    )}

                    <div className="hide-scrollbar overflow-y-auto p-5 sm:p-7 flex-1">
                        {isV2 ? (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
                                <div
                                    className="relative aspect-[16/10] overflow-hidden rounded-none border"
                                    style={{
                                        borderColor: 'var(--hairline)',
                                        backgroundColor: 'var(--bg-secondary)',
                                    }}
                                >
                                    {deployment?.image ? (
                                        <img
                                            src={deployment.image}
                                            alt={deployment.name}
                                            className="h-full w-full object-contain p-2"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div
                                            className="relative flex h-full w-full items-center justify-center"
                                            style={{ backgroundImage: getPlaceholderGradient(deployment?.name) }}
                                        >
                                            <span
                                                className="relative z-10 font-mono text-xl uppercase tracking-[0.25em]"
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                {getProjectInitials(deployment?.name)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs uppercase tracking-wider">
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            status: <span style={{ color: statusColor }}>[{normalizedStatus}]</span>
                                        </span>
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            env: <span style={{ color: 'var(--accent-purple)' }}>[{deployment?.environment || 'Production'}]</span>
                                        </span>
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            host: <span style={{ color: 'var(--accent-orange)' }}>[{deployment?.hostingProvider || 'Unknown'}]</span>
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-bright)' }}>{deployment?.name}</h2>
                                        <p className="mt-1 font-mono text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-tertiary)' }}>
                                            {deployment?.appType || 'Application'}
                                        </p>
                                    </div>

                                    <div className="py-4 border-t border-b" style={{ borderColor: 'var(--hairline)' }}>
                                        <p className="text-xs uppercase font-mono tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
                                            {"// Description"}
                                        </p>
                                        <p className="text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
                                            {deployment?.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    <div className="py-4 space-y-3 font-mono text-xs border-b" style={{ borderColor: 'var(--hairline)' }}>
                                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                            <span style={{ color: 'var(--text-muted)' }}>LIVE URL:</span>
                                            {deployment?.hostedUrl ? (
                                                <Link
                                                    href={deployment.hostedUrl}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1 hover:underline"
                                                    style={{ color: 'var(--accent-cyan)' }}
                                                >
                                                    [{deployment.hostedUrl}] <FaArrowUpRightFromSquare size={10} />
                                                </Link>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>[private/internal]</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between">
                                            <span style={{ color: 'var(--text-muted)' }}>RUNTIME:</span>
                                            <span style={{ color: 'var(--text-primary)' }}>
                                                {deployment?.environment || 'Production'} on {deployment?.hostingProvider || 'Unknown Host'}
                                            </span>
                                        </div>
                                        {deployment?.blogLink && (
                                            <div className="flex justify-between">
                                                <span style={{ color: 'var(--text-muted)' }}>RELATED POST:</span>
                                                <Link
                                                    href={deployment.blogLink}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1 hover:underline"
                                                    style={{ color: 'var(--accent-purple)' }}
                                                >
                                                    [view post] <FaArrowUpRightFromSquare size={10} />
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {techStack.length > 0 && (
                                        <div>
                                            <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                                                {"// Stack"}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {techStack.map((tech) => (
                                                    <span
                                                        key={`${deployment?._id || deployment?.name}-${tech}`}
                                                        className="font-mono text-xs uppercase tracking-wide border px-2 py-0.5"
                                                        style={{
                                                            borderColor: 'var(--hairline)',
                                                            color: 'var(--accent-cyan)',
                                                            backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 5%, transparent)',
                                                        }}
                                                    >
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-8 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="inline-flex items-center gap-2 border font-mono text-xs uppercase tracking-[0.15em] px-4 py-2 hover:bg-[var(--bg-secondary)] transition-colors"
                                            style={{ borderColor: 'var(--hairline)', color: 'var(--text-muted)' }}
                                        >
                                            <FaXmark />
                                            [Close]
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
                                <div
                                    className="relative aspect-[16/10] overflow-hidden rounded-2xl border"
                                    style={{
                                        borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                                        backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 86%, transparent)',
                                    }}
                                >
                                    {deployment?.image ? (
                                        <img
                                            src={deployment.image}
                                            alt={deployment.name}
                                            className="h-full w-full object-contain p-2"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div
                                            className="relative flex h-full w-full items-center justify-center"
                                            style={{ backgroundImage: getPlaceholderGradient(deployment?.name) }}
                                        >
                                            <div
                                                className="absolute inset-0"
                                                style={{
                                                    backgroundImage:
                                                        'linear-gradient(color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px)',
                                                    backgroundSize: '24px 24px',
                                                    opacity: 0.35,
                                                }}
                                            />
                                            <span
                                                className="relative z-10 rounded-xl border px-4 py-2 text-2xl font-bold tracking-wide"
                                                style={{
                                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                                                    color: 'var(--text-bright)',
                                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                                                }}
                                            >
                                                {getProjectInitials(deployment?.name)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                                            style={{
                                                borderColor: 'color-mix(in srgb, var(--accent-cyan) 45%, var(--border-secondary))',
                                                color: 'var(--accent-cyan)',
                                                backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
                                            }}
                                        >
                                            {normalizedStatus}
                                        </span>
                                        <span
                                            className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                                            style={{
                                                borderColor: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
                                                color: 'var(--accent-purple)',
                                                backgroundColor: 'color-mix(in srgb, var(--accent-purple) 10%, transparent)',
                                            }}
                                        >
                                            {deployment?.environment || 'Production'}
                                        </span>
                                        <span
                                            className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                                            style={{
                                                borderColor: 'color-mix(in srgb, var(--accent-orange) 45%, var(--border-secondary))',
                                                color: 'var(--accent-orange)',
                                                backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
                                            }}
                                        >
                                            {deployment?.hostingProvider || 'Hosting Provider'}
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className="text-3xl font-bold">{deployment?.name}</h2>
                                        <p className="mt-1 text-sm uppercase tracking-[0.22em]" style={{ color: 'var(--text-tertiary)' }}>
                                            {deployment?.appType || 'Application'}
                                        </p>
                                    </div>

                                    <div
                                        className="rounded-xl border p-4"
                                        style={{
                                            borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                                            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                        }}
                                    >
                                        <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                                            Description
                                        </p>
                                        <p className="text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
                                            {deployment?.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div
                                            className="rounded-xl border p-3"
                                            style={{
                                                borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                            }}
                                        >
                                            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                                                <FaGlobe />
                                                Live URL
                                            </div>
                                            {deployment?.hostedUrl ? (
                                                <Link
                                                    href={deployment.hostedUrl}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-2 break-all text-sm font-medium"
                                                    style={{ color: 'var(--accent-cyan)' }}
                                                >
                                                    <span>{deployment.hostedUrl}</span>
                                                    <FaArrowUpRightFromSquare className="shrink-0" />
                                                </Link>
                                            ) : (
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    Private or internal endpoint
                                                </span>
                                            )}
                                            {deployment?.blogLink && (
                                                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 50%, transparent)' }}>
                                                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                                                        <FaGlobe />
                                                        Blog Article
                                                    </div>
                                                    <Link
                                                        href={deployment.blogLink}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-2 break-all text-sm font-medium"
                                                        style={{ color: 'var(--accent-purple)' }}
                                                    >
                                                        <span>View Related Post</span>
                                                        <FaArrowUpRightFromSquare className="shrink-0" />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            className="rounded-xl border p-3"
                                            style={{
                                                borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                            }}
                                        >
                                            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                                                <FaShieldHalved />
                                                Runtime
                                            </div>
                                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {deployment?.environment || 'Production'} on {deployment?.hostingProvider || 'Unknown Host'}
                                            </span>
                                        </div>
                                    </div>

                                    {techStack.length > 0 && (
                                        <div>
                                            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                                                <FaScrewdriverWrench />
                                                Stack
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {techStack.map((tech) => (
                                                    <span
                                                        key={`${deployment?._id || deployment?.name}-${tech}`}
                                                        className="rounded-md border px-2.5 py-1 text-xs font-semibold"
                                                        style={{
                                                            borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                                            color: 'var(--accent-cyan)',
                                                            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                                        }}
                                                    >
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
