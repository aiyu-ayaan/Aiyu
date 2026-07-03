"use client";

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FaArrowUpRightFromSquare, FaMagnifyingGlass } from 'react-icons/fa6';
import DeploymentDialog from '../DeploymentDialog';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx, refreshScrollTriggersSoon } from '../../landing/v2/gsap3d';

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

/**
 * /v2/apps — hosted services as a process table. Where v1 shows glass cards
 * with preview images, this reads like `ps aux` for the portfolio: one
 * hairline row per service with a pulsing status light, the name in display
 * type, provider/env/stack as mono annotations, and a direct launch link.
 * Clicking a row opens the shared DeploymentDialog.
 */
const DeploymentsV2 = ({ data }) => {
    const deployments = useMemo(() => (Array.isArray(data) ? data : []), [data]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedDeployment, setSelectedDeployment] = useState(null);

    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    const uniqueStatuses = useMemo(
        () => ['All', ...new Set(deployments.map((item) => normalizeStatus(item?.status)))],
        [deployments]
    );

    const filteredDeployments = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return deployments.filter((deployment) => {
            const searchableText = [
                deployment?.name,
                deployment?.description,
                deployment?.appType,
                deployment?.environment,
                deployment?.hostingProvider,
                deployment?.hostedUrl,
                ...(Array.isArray(deployment?.techStack) ? deployment.techStack : []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchesQuery = !query || searchableText.includes(query);
            const matchesStatus = selectedStatus === 'All' || normalizeStatus(deployment?.status) === selectedStatus;
            return matchesQuery && matchesStatus;
        });
    }, [deployments, searchQuery, selectedStatus]);

    const liveCount = useMemo(
        () => deployments.filter((item) => normalizeStatus(item?.status) === 'Live').length,
        [deployments]
    );
    const providerCount = useMemo(
        () => new Set(deployments.map((item) => item?.hostingProvider).filter(Boolean)).size,
        [deployments]
    );

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        dependencies: [filteredDeployments],
    });

    return (
        <div ref={sectionRef} className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                <div className="relative mb-14 sm:mb-20">
                    <span
                        data-v2-depth="-0.4"
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none text-[7rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[13rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: '1.5px color-mix(in srgb, var(--status-success) 20%, transparent)',
                            opacity: 0.8,
                        }}
                    >
                        ⏻
                    </span>

                    <p data-v2="line" className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--status-success)' }}>
                        ~/apps — running services
                    </p>
                    <h1
                        data-v2="line"
                        className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        Live, in production.
                    </h1>
                    <p data-v2="rise" className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        The apps and services this portfolio keeps online — what runs, where it runs, and how to reach it.
                    </p>

                    <p data-v2="rise" className="mt-8 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span data-counter={deployments.length}>{deployments.length}</span> services ·{' '}
                        <span style={{ color: 'var(--status-success)' }}>
                            <span data-counter={liveCount}>{liveCount}</span> live
                        </span>{' '}
                        · <span data-counter={providerCount}>{providerCount}</span> providers
                    </p>
                </div>

                {/* Command strip. */}
                <div data-v2="rise" className="mb-4 space-y-4 pb-6" style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <label className="flex items-center gap-3 font-mono text-sm" htmlFor="v2-apps-search">
                        <FaMagnifyingGlass aria-hidden="true" className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--status-success)' }} />
                        <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>$ ps aux | grep</span>
                        <input
                            id="v2-apps-search"
                            type="text"
                            value={searchQuery}
                            onChange={(event) => {
                                setSearchQuery(event.target.value);
                                refreshScrollTriggersSoon();
                            }}
                            placeholder="name, provider, stack…"
                            className="w-full min-w-0 bg-transparent pb-1 focus:outline-none"
                            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--hairline)' }}
                        />
                    </label>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 font-mono text-xs sm:text-sm">
                        <span className="uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>status:</span>
                        {uniqueStatuses.map((status) => {
                            const active = selectedStatus === status;
                            const accent = status === 'All' ? 'var(--accent-cyan)' : getStatusColor(status);
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStatus(status);
                                        refreshScrollTriggersSoon();
                                    }}
                                    className="cursor-pointer whitespace-nowrap underline-offset-4 hover:underline"
                                    style={{ color: active ? accent : 'var(--text-secondary)' }}
                                    aria-pressed={active}
                                >
                                    <span style={{ color: active ? accent : 'var(--text-muted)' }}>[</span>
                                    {status.toLowerCase()}
                                    <span style={{ color: active ? accent : 'var(--text-muted)' }}>]</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <p className="mb-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
                    → {filteredDeployments.length} of {deployments.length} processes
                </p>

                {/* The process table. */}
                {filteredDeployments.length > 0 ? (
                    <div style={{ perspective: '1600px' }}>
                        {filteredDeployments.map((deployment, index) => {
                            const status = normalizeStatus(deployment?.status);
                            const statusColor = getStatusColor(status);
                            const stack = Array.isArray(deployment?.techStack) ? deployment.techStack.slice(0, 4) : [];

                            return (
                                <div
                                    key={deployment?._id || `${deployment?.name}-${index}`}
                                    data-v2={index % 2 === 0 ? 'door-left' : 'door-right'}
                                    className="group grid grid-cols-12 items-center gap-4 py-8 sm:py-10"
                                    style={{ borderBottom: '1px solid var(--hairline)' }}
                                >
                                    <span className="col-span-2 font-mono text-sm sm:col-span-1" style={{ color: statusColor }}>
                                        {String(index + 1).padStart(2, '0')}
                                        <span className="relative mt-2 flex h-2 w-2" aria-hidden="true">
                                            {status === 'Live' && (
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: statusColor }} />
                                            )}
                                            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
                                        </span>
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedDeployment(deployment)}
                                        className="col-span-10 cursor-pointer text-left sm:col-span-8"
                                    >
                                        <h3
                                            className="text-3xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-5xl"
                                            style={{ color: 'var(--text-bright)' }}
                                        >
                                            {deployment?.name}
                                        </h3>
                                        <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
                                            {deployment?.description}
                                        </p>
                                        <p className="mt-3 font-mono text-xs uppercase tracking-[0.15em]" style={{ color: `color-mix(in srgb, ${statusColor} 70%, var(--text-secondary))` }}>
                                            {status} · {deployment?.hostingProvider || 'unknown host'} · {deployment?.environment || 'production'}
                                            {stack.length ? ` · ${stack.join(' / ')}` : ''}
                                        </p>
                                    </button>

                                    <span className="col-span-10 col-start-3 font-mono text-xs sm:col-span-3 sm:col-start-10 sm:justify-self-end sm:text-sm">
                                        {deployment?.hostedUrl ? (
                                            <Link
                                                href={deployment.hostedUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 whitespace-nowrap underline-offset-4 hover:underline"
                                                style={{ color: statusColor }}
                                            >
                                                open --app <FaArrowUpRightFromSquare className="h-3 w-3" aria-hidden="true" />
                                            </Link>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>no public url</span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        <p>$ ps aux | grep &quot;{searchQuery.trim() || selectedStatus.toLowerCase()}&quot;</p>
                        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>→ no matching processes.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedStatus('All');
                                refreshScrollTriggersSoon();
                            }}
                            className="mt-6 cursor-pointer underline-offset-4 hover:underline"
                            style={{ color: 'var(--accent-orange)' }}
                        >
                            [reset --filters]
                        </button>
                    </div>
                )}
            </div>

            <DeploymentDialog deployment={selectedDeployment} onClose={() => setSelectedDeployment(null)} isV2={true} />
        </div>
    );
};

export default DeploymentsV2;
