"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    FaPlus,
    FaArrowUpRightFromSquare,
    FaFileLines,
    FaLink,
    FaBox,
    FaMagnifyingGlass,
    FaShieldHalved,
    FaPen,
} from 'react-icons/fa6';
import { PageHeader, Panel, Stat, Badge, EmptyState, Loading } from '@/app/components/admin/ui';
import '@/app/styles/admin-blogs.css';

export default function AdminLegalPage() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch('/api/legal/apps')
            .then(async (r) => {
                const data = await r.json();
                if (!r.ok) throw new Error(data?.error || 'Failed to load');
                setApps(Array.isArray(data) ? data : []);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const stats = useMemo(() => {
        let totalDocs = 0;
        let publishedDocs = 0;
        let linkedApps = 0;
        for (const app of apps) {
            const docs = Array.isArray(app.documents) ? app.documents : [];
            totalDocs += docs.length;
            publishedDocs += docs.filter((d) => d.published).length;
            if (app.deploymentId) linkedApps += 1;
        }
        return {
            apps: apps.length,
            totalDocs,
            publishedDocs,
            linkedApps,
        };
    }, [apps]);

    const filteredApps = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return apps;
        return apps.filter((app) => {
            const name = (app.name || '').toLowerCase();
            const slug = (app.slug || '').toLowerCase();
            const pkg = (app.packageName || '').toLowerCase();
            const docs = (app.documents || []).map((d) => d.title || '').join(' ').toLowerCase();
            return name.includes(q) || slug.includes(q) || pkg.includes(q) || docs.includes(q);
        });
    }, [apps, searchQuery]);

    return (
        <div className="adm-page">
            <PageHeader
                command="ls"
                title="Legal"
                description="Privacy policies, terms, and legal pages per application, served at /<app>/<page>."
                actions={
                    <Link href="/admin/legal/new" className="adm-btn adm-btn-primary">
                        <FaPlus aria-hidden="true" /> New legal app
                    </Link>
                }
            />

            <div className="adm-stats">
                <Stat label="Applications" value={stats.apps} hint="Legal hubs configured" />
                <Stat label="Total pages" value={stats.totalDocs} hint="Policies, terms, and custom docs" />
                <Stat label="Published pages" value={stats.publishedDocs} hint="Live on public routes" />
                <Stat label="Linked to /apps" value={stats.linkedApps} hint="Connected to app directory" />
            </div>

            {error && (
                <div role="alert" className="adm-notice adm-notice-error">
                    Could not load legal applications: {error}
                </div>
            )}

            <Panel
                title="Legal applications"
                actions={<Badge tone="info">{apps.length} total</Badge>}
                flush
            >
                {apps.length > 0 && (
                    <div className="adm-toolbar">
                        <div className="adm-search-wrap">
                            <FaMagnifyingGlass aria-hidden="true" className="adm-search-icon w-3.5 h-3.5" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by app name, slug, package, or page..."
                                aria-label="Search legal applications"
                                className="adm-input adm-search-input"
                            />
                        </div>
                        <span className="adm-help adm-num">
                            Showing {filteredApps.length} of {apps.length} applications
                        </span>
                    </div>
                )}

                {loading ? (
                    <Loading label="Loading legal applications" rows={4} />
                ) : filteredApps.length === 0 ? (
                    <EmptyState
                        title={searchQuery ? 'No matching legal apps' : 'No legal apps yet'}
                        description={
                            searchQuery
                                ? 'Try clearing the search query.'
                                : 'Create an application first, then add its privacy policy, terms & conditions, or custom pages.'
                        }
                        action={
                            searchQuery ? (
                                <button type="button" onClick={() => setSearchQuery('')} className="adm-btn">
                                    Clear search
                                </button>
                            ) : (
                                <Link href="/admin/legal/new" className="adm-btn adm-btn-primary">
                                    <FaPlus aria-hidden="true" /> New legal app
                                </Link>
                            )
                        }
                    />
                ) : (
                    <ul className="adm-list">
                        {filteredApps.map((app) => {
                            const docs = Array.isArray(app.documents) ? app.documents : [];
                            const published = docs.filter((d) => d.published).length;
                            return (
                                <li key={app._id} className="adm-row flex-wrap justify-between gap-4 py-3.5">
                                    <div className="flex items-start gap-3 min-w-0 flex-1 basis-64">
                                        <div className="adm-thumb mt-0.5" aria-hidden="true">
                                            <FaShieldHalved className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link
                                                    href={`/admin/legal/${app._id}`}
                                                    className="font-semibold text-[var(--text-bright)] hover:text-[var(--adm-accent-ink)] truncate"
                                                >
                                                    {app.name}
                                                </Link>
                                                <span className="adm-code">/{app.slug}</span>
                                                <Badge tone={published > 0 ? 'ok' : 'warn'}>
                                                    {published}/{docs.length} live
                                                </Badge>
                                            </div>

                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                                                {app.packageName && (
                                                    <span className="inline-flex items-center gap-1.5 font-mono">
                                                        <FaBox aria-hidden="true" className="w-3 h-3 text-[var(--adm-hint)]" />
                                                        {app.packageName}
                                                    </span>
                                                )}
                                                {app.deploymentId && (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <FaLink aria-hidden="true" className="w-3 h-3 text-[var(--adm-hint)]" />
                                                        Linked to /apps
                                                    </span>
                                                )}
                                                {app.contactEmail && (
                                                    <span className="font-mono text-[var(--adm-hint)]">{app.contactEmail}</span>
                                                )}
                                            </div>

                                            {docs.length > 0 && (
                                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                    {docs.map((d) => (
                                                        <Link
                                                            key={d._id}
                                                            href={`/admin/legal/${app._id}/pages/${d._id}`}
                                                            className="inline-flex items-center"
                                                        >
                                                            <Badge tone={d.published ? 'info' : undefined}>
                                                                <FaFileLines aria-hidden="true" className="w-2.5 h-2.5" />
                                                                {d.title}
                                                                {!d.published && ' (draft)'}
                                                            </Badge>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <a
                                            href={`/${app.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="adm-icon-btn"
                                            aria-label={`View public hub for ${app.name}`}
                                            title={`Open /${app.slug}`}
                                        >
                                            <FaArrowUpRightFromSquare className="w-3.5 h-3.5" />
                                        </a>
                                        <Link
                                            href={`/admin/legal/${app._id}`}
                                            className="adm-btn"
                                        >
                                            <FaPen aria-hidden="true" /> Manage
                                        </Link>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Panel>
        </div>
    );
}
