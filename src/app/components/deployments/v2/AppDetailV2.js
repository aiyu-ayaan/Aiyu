"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { FaArrowUpRightFromSquare, FaArrowLeftLong } from 'react-icons/fa6';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';

const toTitleCase = (value) => {
    if (!value) return '';
    return String(value)
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

const normalizeStatus = (status) => {
    const safeStatus = String(status || '').trim().toLowerCase();
    if (safeStatus === 'live' || safeStatus === 'healthy' || safeStatus === 'online') return 'Live';
    if (safeStatus === 'maintenance' || safeStatus === 'updating') return 'Maintenance';
    if (safeStatus === 'private' || safeStatus === 'internal') return 'Private';
    if (safeStatus === 'archived' || safeStatus === 'retired') return 'Archived';
    return safeStatus ? toTitleCase(safeStatus) : 'Unknown';
};

const STATUS_COLORS = {
    Live: 'var(--status-success)',
    Maintenance: 'var(--accent-orange)',
    Private: 'var(--accent-purple)',
    Archived: 'var(--text-muted)',
};

const getStatusColor = (status) => STATUS_COLORS[normalizeStatus(status)] || 'var(--text-secondary)';

function isExternalHttpUrl(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return false;
    }
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * /v2/apps/[id] — a single service rendered in the same terminal/editorial
 * voice as the /v2/apps process table: ghost power glyph, mono eyebrow,
 * display-type name with a pulsing status light, then spec rows and stack
 * chips over hairline rules. Keeps readers inside the v2 shell instead of
 * dropping them onto the classic glass card.
 */
const AppDetailV2 = ({ deployment, backHref = '/apps' }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

    const status = normalizeStatus(deployment?.status);
    const statusColor = getStatusColor(status);
    const stackList = Array.isArray(deployment?.techStack) ? deployment.techStack : [];

    const specs = [
        ['status', status],
        ['type', deployment?.appType || 'Application'],
        ['provider', deployment?.hostingProvider || 'N/A'],
        ['environment', deployment?.environment || 'N/A'],
    ];

    return (
        <div ref={sectionRef} className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                <Link
                    href={backHref}
                    data-v2="rise"
                    className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] underline-offset-4 hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <FaArrowLeftLong className="h-3 w-3" aria-hidden="true" /> cd ../apps
                </Link>

                <div className="relative mb-14 mt-10 sm:mb-20">
                    <span
                        data-v2-depth="-0.4"
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none text-[7rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[13rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: `1.5px color-mix(in srgb, ${statusColor} 20%, transparent)`,
                            opacity: 0.8,
                        }}
                    >
                        ⏻
                    </span>

                    <p data-v2="line" className="mb-4 flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: statusColor }}>
                        <span className="relative flex h-2 w-2" aria-hidden="true">
                            {status === 'Live' && (
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: statusColor }} />
                            )}
                            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
                        </span>
                        ~/apps — service
                    </p>
                    <h1
                        data-v2="line"
                        className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        {deployment?.name}
                    </h1>
                    <p data-v2="rise" className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        {deployment?.description || 'No description provided.'}
                    </p>

                    <div data-v2="rise" className="mt-8 flex flex-wrap gap-3">
                        {isExternalHttpUrl(deployment?.hostedUrl) ? (
                            <Link
                                href={deployment.hostedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-sm font-semibold transition-transform hover:-translate-y-0.5"
                                style={{ backgroundColor: statusColor, color: 'var(--bg-primary, #05070d)' }}
                            >
                                open --app <FaArrowUpRightFromSquare className="h-3 w-3" aria-hidden="true" />
                            </Link>
                        ) : null}

                        {isExternalHttpUrl(deployment?.blogLink) ? (
                            <Link
                                href={deployment.blogLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-sm font-semibold underline-offset-4 transition-colors hover:underline"
                                style={{ border: '1px solid var(--hairline)', color: 'var(--accent-purple)' }}
                            >
                                read --blog <FaArrowUpRightFromSquare className="h-3 w-3" aria-hidden="true" />
                            </Link>
                        ) : null}
                    </div>
                </div>

                {deployment?.image ? (
                    <div
                        data-v2="float"
                        className="mb-16 overflow-hidden rounded-2xl border"
                        style={{ borderColor: 'var(--hairline)' }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={deployment.image}
                            alt={deployment?.name || 'App image'}
                            className="h-64 w-full object-cover sm:h-96"
                            loading="eager"
                            decoding="async"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                ) : null}

                {/* Spec table — one hairline row per attribute. */}
                <div data-v2="rise" className="mb-16">
                    <h2 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                        // specs
                    </h2>
                    <dl>
                        {specs.map(([label, value]) => (
                            <div
                                key={label}
                                className="flex items-baseline justify-between gap-4 py-4 font-mono text-sm"
                                style={{ borderBottom: '1px solid var(--hairline)' }}
                            >
                                <dt className="uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                                <dd className="text-right" style={{ color: label === 'status' ? statusColor : 'var(--text-secondary)' }}>
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {stackList.length > 0 ? (
                    <div data-v2="rise">
                        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                            // stack
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {stackList.map((tech) => (
                                <span
                                    key={`${deployment?._id}-${tech}`}
                                    className="rounded-full px-3 py-1 font-mono text-xs"
                                    style={{
                                        border: '1px solid var(--hairline)',
                                        color: 'var(--text-secondary)',
                                        backgroundColor: 'color-mix(in srgb, var(--status-success) 5%, transparent)',
                                    }}
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default AppDetailV2;
