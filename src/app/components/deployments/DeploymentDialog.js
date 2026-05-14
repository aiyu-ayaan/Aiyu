"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { FaArrowUpRightFromSquare, FaGlobe, FaShieldHalved, FaScrewdriverWrench, FaXmark } from 'react-icons/fa6';
import { getPlaceholderGradient, getProjectInitials } from '../projects/projectPlaceholder';

const normalizeStatus = (status) => {
    const safeStatus = String(status || '').trim().toLowerCase();

    if (safeStatus === 'live' || safeStatus === 'healthy' || safeStatus === 'online') return 'Live';
    if (safeStatus === 'maintenance' || safeStatus === 'updating') return 'Maintenance';
    if (safeStatus === 'private' || safeStatus === 'internal') return 'Private';
    if (safeStatus === 'archived' || safeStatus === 'retired') return 'Archived';

    return safeStatus || 'Unknown';
};

export default function DeploymentDialog({ deployment, onClose }) {
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

    if (!deployment) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-6 backdrop-blur-md sm:py-10"
                style={{
                    background:
                        'radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--accent-cyan) 15%, transparent), transparent 45%), radial-gradient(circle at 80% 80%, color-mix(in srgb, var(--accent-purple) 15%, transparent), transparent 45%), var(--overlay-bg)',
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 16 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="relative w-full max-w-4xl overflow-hidden rounded-3xl border shadow-2xl"
                    style={{
                        maxHeight: '88vh',
                        background:
                            'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 95%, transparent), color-mix(in srgb, var(--bg-secondary) 96%, transparent))',
                        borderColor: 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
                    }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <div
                        className="h-1.5 w-full"
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

                    <div className="hide-scrollbar overflow-y-auto p-5 sm:p-7" style={{ maxHeight: 'calc(88vh - 6px)' }}>
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
                                        {normalizeStatus(deployment?.status)}
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

                                {Array.isArray(deployment?.techStack) && deployment.techStack.length > 0 && (
                                    <div>
                                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                                            <FaScrewdriverWrench />
                                            Stack
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {deployment.techStack.map((tech) => (
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
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
