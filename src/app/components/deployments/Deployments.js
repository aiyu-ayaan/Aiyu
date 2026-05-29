"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    FaArrowUpRightFromSquare,
    FaCircleCheck,
    FaExpand,
    FaFilter,
    FaGlobe,
    FaMagnifyingGlass,
    FaNetworkWired,
    FaServer,
    FaShieldHalved,
    FaScrewdriverWrench,
} from 'react-icons/fa6';
import TypewriterEffect from '../shared/TypewriterEffect';
import RouteBetaBadge from '../shared/RouteBetaBadge';
import { getPlaceholderGradient, getProjectInitials } from '../projects/projectPlaceholder';
import DeploymentDialog from './DeploymentDialog';

const heroCardStyle = {
    background:
        'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
    border: '1px solid color-mix(in srgb, var(--border-secondary) 75%, transparent)',
    boxShadow: '0 16px 36px var(--shadow-sm)',
};

const multiLineClampStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
};

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

const getStatusStyles = (status) => {
    const normalized = normalizeStatus(status);

    if (normalized === 'Live') {
        return {
            badge: 'color-mix(in srgb, var(--status-success) 14%, transparent)',
            border: 'color-mix(in srgb, var(--status-success) 45%, var(--border-secondary))',
            text: 'var(--status-success)',
        };
    }

    if (normalized === 'Maintenance') {
        return {
            badge: 'color-mix(in srgb, var(--accent-orange) 12%, transparent)',
            border: 'color-mix(in srgb, var(--accent-orange) 45%, var(--border-secondary))',
            text: 'var(--accent-orange)',
        };
    }

    if (normalized === 'Private') {
        return {
            badge: 'color-mix(in srgb, var(--accent-purple) 12%, transparent)',
            border: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
            text: 'var(--accent-purple)',
        };
    }

    return {
        badge: 'color-mix(in srgb, var(--text-secondary) 12%, transparent)',
        border: 'color-mix(in srgb, var(--border-secondary) 78%, transparent)',
        text: 'var(--text-secondary)',
    };
};

export default function Deployments({ data, config }) {
    const deployments = useMemo(() => (Array.isArray(data) ? data : []), [data]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedType, setSelectedType] = useState('All');
    const [selectedProvider, setSelectedProvider] = useState('All');
    const [selectedDeployment, setSelectedDeployment] = useState(null);

    const siteLabel = config?.logoText || config?.siteTitle || 'Portfolio';
    const roles = [
        `Hosted apps, services, and environments currently online for ${siteLabel}`,
        'Track what is live, where it runs, and how to reach it',
    ];

    const heroTitle = 'Hosted Services & Apps';

    const uniqueStatuses = useMemo(() => ['All', ...new Set(deployments.map((item) => normalizeStatus(item?.status)))], [deployments]);

    const uniqueTypes = useMemo(() => {
        return ['All', ...new Set(deployments.map((item) => item?.appType).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    }, [deployments]);

    const uniqueProviders = useMemo(() => {
        return ['All', ...new Set(deployments.map((item) => item?.hostingProvider).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    }, [deployments]);

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

            const normalizedStatus = normalizeStatus(deployment?.status);

            const matchesQuery = !query || searchableText.includes(query);
            const matchesStatus = selectedStatus === 'All' || normalizedStatus === selectedStatus;
            const matchesType = selectedType === 'All' || deployment?.appType === selectedType;
            const matchesProvider = selectedProvider === 'All' || deployment?.hostingProvider === selectedProvider;

            return matchesQuery && matchesStatus && matchesType && matchesProvider;
        });
    }, [deployments, searchQuery, selectedStatus, selectedType, selectedProvider]);

    const liveCount = useMemo(() => deployments.filter((item) => normalizeStatus(item?.status) === 'Live').length, [deployments]);
    const providerCount = useMemo(() => new Set(deployments.map((item) => item?.hostingProvider).filter(Boolean)).size, [deployments]);

    const statCards = [
        { label: 'Apps', value: deployments.length, icon: FaServer, accent: 'var(--accent-cyan)' },
        { label: 'Live Now', value: liveCount, icon: FaCircleCheck, accent: 'var(--status-success)' },
        { label: 'Providers', value: providerCount, icon: FaNetworkWired, accent: 'var(--accent-purple)' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative min-h-screen overflow-hidden p-4 lg:p-8"
            style={{ color: 'var(--text-primary)' }}
        >
            <div
                className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full blur-3xl"
                style={{
                    background:
                        'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 34%, transparent), transparent 70%)',
                }}
            />
            <div
                className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full blur-3xl"
                style={{
                    background:
                        'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 30%, transparent), transparent 70%)',
                }}
            />

            <div className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%]">
                <motion.section
                    initial={{ y: 22, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="rounded-3xl p-6 sm:p-8"
                    style={heroCardStyle}
                >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <p
                            className="inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--accent-cyan) 40%, var(--border-secondary))',
                                color: 'var(--accent-cyan)',
                            }}
                        >
                            Apps
                        </p>
                        <RouteBetaBadge />
                    </div>

                    <h1
                        className="mb-1 pb-2 leading-tight bg-linear-to-r bg-clip-text text-4xl font-bold text-transparent sm:text-5xl lg:text-6xl"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-orange-bright))',
                        }}
                    >
                        {heroTitle}
                    </h1>
                    <TypewriterEffect roles={roles} />

                    <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {statCards.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.label}
                                    className="rounded-xl border p-3"
                                    style={{
                                        borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                                        backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                                    }}
                                >
                                    <div
                                        className="mb-2 inline-flex rounded-lg p-2"
                                        style={{ backgroundColor: `color-mix(in srgb, ${item.accent} 14%, transparent)` }}
                                    >
                                        <Icon size={14} style={{ color: item.accent }} />
                                    </div>
                                    <p className="text-2xl font-bold">{item.value}</p>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {item.label}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </motion.section>

                <motion.section
                    initial={{ y: 22, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.12 }}
                    className="mt-6 rounded-2xl border p-4 sm:p-5"
                    style={heroCardStyle}
                >
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        <FaFilter style={{ color: 'var(--accent-orange)' }} />
                        Filter + Search
                    </div>

                    <div className="mb-4">
                        <label htmlFor="deploymentSearch" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Search Apps
                        </label>
                        <div className="relative">
                            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }} />
                            <input
                                id="deploymentSearch"
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search apps by name, provider, stack, or environment"
                                className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none"
                                style={{
                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label htmlFor="deploymentTypeFilter" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Deployment Type
                            </label>
                            <select
                                id="deploymentTypeFilter"
                                className="w-full rounded-lg border px-3 py-2.5 focus:outline-none"
                                style={{
                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                    color: 'var(--text-primary)',
                                }}
                                value={selectedType}
                                onChange={(event) => setSelectedType(event.target.value)}
                            >
                                {uniqueTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type === 'All' ? type : toTitleCase(type)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="deploymentProviderFilter" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Hosting Provider
                            </label>
                            <select
                                id="deploymentProviderFilter"
                                className="w-full rounded-lg border px-3 py-2.5 focus:outline-none"
                                style={{
                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                    color: 'var(--text-primary)',
                                }}
                                value={selectedProvider}
                                onChange={(event) => setSelectedProvider(event.target.value)}
                            >
                                {uniqueProviders.map((provider) => (
                                    <option key={provider} value={provider}>
                                        {provider}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {uniqueStatuses.map((status) => {
                            const isActive = selectedStatus === status;
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setSelectedStatus(status)}
                                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors duration-200"
                                    style={{
                                        borderColor: isActive
                                            ? 'color-mix(in srgb, var(--accent-cyan) 55%, var(--border-secondary))'
                                            : 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                        color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                                        backgroundColor: isActive
                                            ? 'color-mix(in srgb, var(--accent-cyan) 11%, transparent)'
                                            : 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                    }}
                                >
                                    {status}
                                </button>
                            );
                        })}
                    </div>
                </motion.section>

                <motion.section
                    initial={{ y: 22, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mt-8"
                >
                    {filteredDeployments.length > 0 ? (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
                            {filteredDeployments.map((deployment, index) => {
                                const statusStyles = getStatusStyles(deployment?.status);
                                const stackList = Array.isArray(deployment?.techStack) ? deployment.techStack : [];
                                const previewStack = stackList.slice(0, 3);
                                const placeholderGradient = getPlaceholderGradient(deployment?.name);

                                return (
                                    <motion.article
                                        key={deployment?._id || `${deployment?.name}-${index}`}
                                        layout
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.35, ease: 'easeOut' }}
                                        className="group relative cursor-pointer overflow-hidden rounded-2xl border flex flex-col h-full w-full"
                                        style={{
                                            borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                                        }}
                                        onClick={() => setSelectedDeployment(deployment)}
                                        whileHover={{ y: -5 }}
                                    >
                                        <div
                                            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 12%, transparent), color-mix(in srgb, var(--accent-purple) 10%, transparent))',
                                            }}
                                        />

                                        <div
                                            className="relative flex h-full flex-col flex-1"
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 95%, transparent), color-mix(in srgb, var(--bg-secondary) 95%, transparent))',
                                            }}
                                        >
                                            {/* Preview/Image Block */}
                                            <div
                                                className="relative h-32 overflow-hidden border-b flex items-center justify-center"
                                                style={{
                                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 86%, transparent)',
                                                }}
                                            >
                                                {deployment?.image ? (
                                                    <img
                                                        src={deployment.image}
                                                        alt={deployment.name}
                                                        className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                ) : (
                                                    <div
                                                        className="relative flex h-full w-full items-center justify-center overflow-hidden"
                                                        style={{ backgroundImage: placeholderGradient }}
                                                    >
                                                        <div
                                                            className="absolute -left-8 -top-8 h-28 w-28 rounded-full blur-2xl"
                                                            style={{ background: 'color-mix(in srgb, var(--accent-cyan) 35%, transparent)' }}
                                                        />
                                                        <div
                                                            className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-2xl"
                                                            style={{ background: 'color-mix(in srgb, var(--accent-purple) 35%, transparent)' }}
                                                        />
                                                        <div
                                                            className="absolute inset-0"
                                                            style={{
                                                                backgroundImage:
                                                                    'linear-gradient(color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px)',
                                                                backgroundSize: '22px 22px',
                                                                opacity: 0.35,
                                                            }}
                                                        />
                                                        <div
                                                            className="rounded-xl border px-3 py-1 text-lg font-bold"
                                                            style={{
                                                                borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                                                                color: 'var(--text-bright)',
                                                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                                                            }}
                                                        >
                                                            {getProjectInitials(deployment?.name)}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Top-Left: Status Badge */}
                                                <div className="absolute left-2.5 top-2.5">
                                                    <span
                                                        className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                                                        style={{
                                                            backgroundColor: statusStyles.badge,
                                                            borderColor: statusStyles.border,
                                                            color: statusStyles.text,
                                                        }}
                                                    >
                                                        {normalizeStatus(deployment?.status)}
                                                    </span>
                                                </div>

                                                {/* Top-Right: Env Badge */}
                                                <div className="absolute right-2.5 top-2.5">
                                                    <span
                                                        className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                                                        style={{
                                                            borderColor: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
                                                            color: 'var(--accent-purple)',
                                                            backgroundColor: 'color-mix(in srgb, var(--accent-purple) 10%, transparent)',
                                                        }}
                                                    >
                                                        {deployment?.environment || 'Production'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Body Area */}
                                            <div className="flex flex-col flex-1 p-4">
                                                <div className="mb-2">
                                                    <h3
                                                        className="text-base font-bold leading-tight"
                                                        style={{
                                                            background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                                                            WebkitBackgroundClip: 'text',
                                                            WebkitTextFillColor: 'transparent',
                                                            backgroundClip: 'text',
                                                        }}
                                                    >
                                                        {deployment?.name}
                                                    </h3>
                                                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-tertiary)' }}>
                                                        {deployment?.appType || 'Application'}
                                                    </p>
                                                </div>

                                                <p className="mb-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                                    <span style={multiLineClampStyle}>
                                                        {deployment?.description}
                                                    </span>
                                                </p>

                                                {/* Hosting Info Row */}
                                                <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <FaServer className="text-[10px]" style={{ color: 'var(--accent-orange)' }} />
                                                        <span>{deployment?.hostingProvider || 'Unknown Host'}</span>
                                                    </span>
                                                </div>

                                                {/* Tech Stack Row */}
                                                {stackList.length > 0 && (
                                                    <div className="mb-3 flex flex-wrap gap-1">
                                                        {previewStack.map((tech) => (
                                                            <span
                                                                key={`${deployment?._id || deployment?.name}-${tech}`}
                                                                className="rounded-md border px-1.5 py-0.5 text-[9px] font-medium"
                                                                style={{
                                                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                                                    color: 'var(--accent-cyan)',
                                                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                                                }}
                                                            >
                                                                {tech}
                                                            </span>
                                                        ))}
                                                        {stackList.length > previewStack.length && (
                                                            <span
                                                                className="rounded-md border px-1.5 py-0.5 text-[9px] font-medium"
                                                                style={{
                                                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                                                    color: 'var(--text-secondary)',
                                                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                                                }}
                                                            >
                                                                +{stackList.length - previewStack.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Footer Actions */}
                                                <div
                                                    className="mt-auto flex items-center justify-between border-t pt-3 text-[11px]"
                                                    style={{
                                                        borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                                                        color: 'var(--text-tertiary)',
                                                    }}
                                                >
                                                    <span className="inline-flex items-center gap-1.5 transition-colors group-hover:text-[var(--accent-cyan)] font-medium">
                                                        <FaExpand className="text-[10px]" />
                                                        Open Details
                                                    </span>

                                                    {deployment?.hostedUrl && (
                                                        <Link
                                                            href={deployment.hostedUrl}
                                                            target="_blank"
                                                            onClick={(event) => event.stopPropagation()}
                                                            className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[9px] hover:underline"
                                                            style={{ color: 'var(--accent-cyan)' }}
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                <FaGlobe className="text-[9px]" />
                                                                Launch App
                                                                <FaArrowUpRightFromSquare className="text-[8px]" />
                                                            </span>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border p-10 text-center" style={heroCardStyle}>
                            <h3 className="mb-2 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                                No Apps Match These Filters
                            </h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Try a different search term or clear one of the active filters.
                            </p>
                        </div>
                    )}
                </motion.section>
            </div>

            <DeploymentDialog deployment={selectedDeployment} onClose={() => setSelectedDeployment(null)} />
        </motion.div>
    );
}
