"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    FaArrowUpRightFromSquare,
    FaGripVertical,
    FaMagnifyingGlass,
    FaPen,
    FaPlus,
    FaServer,
    FaTrash,
    FaXmark,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Loading, PageHeader, Panel, Stat } from '@/app/components/admin/ui';
import '@/app/styles/admin-projects.css';

const getStatusMeta = (status) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    if (normalizedStatus === 'live') {
        return { label: 'Live', tone: 'ok', key: 'live' };
    }

    if (normalizedStatus === 'maintenance') {
        return { label: 'Maintenance', tone: 'warn', key: 'maintenance' };
    }

    if (normalizedStatus === 'private') {
        return { label: 'Private', tone: 'info', key: 'private' };
    }

    return { label: 'Archived', tone: undefined, key: 'archived' };
};

export default function AdminApps() {
    const { confirm, toast } = useAdminFeedback();
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchApps();
    }, []);

    const fetchApps = async () => {
        try {
            const response = await fetch('/api/deployments');
            const data = await response.json();
            setDeployments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch apps', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (
            !(await confirm({
                title: 'Delete app?',
                message: 'Are you sure you want to delete this app? This action cannot be undone.',
                confirmText: 'Delete',
                danger: true,
            }))
        )
            return;

        try {
            const response = await fetch(`/api/deployments/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setDeployments((previous) => previous.filter((deployment) => deployment._id !== id));
            } else {
                toast.error('Failed to delete app');
            }
        } catch (error) {
            console.error('Error deleting app', error);
        }
    };

    const persistAppOrder = async (reorderedDeployments, previousDeployments) => {
        setDeployments(reorderedDeployments);
        setIsSavingOrder(true);

        try {
            const response = await fetch('/api/deployments/reorder', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderedIds: reorderedDeployments.map((deployment) => deployment._id),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save app order');
            }
        } catch (error) {
            console.error('Error reordering apps', error);
            setDeployments(previousDeployments);
            toast.error('Failed to save app order. Please try again.');
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleDragStart = (event, index) => {
        if (isSavingOrder) {
            event.preventDefault();
            return;
        }

        setDraggedIndex(index);
        setDragOverIndex(index);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragOver = (event, index) => {
        if (isSavingOrder) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = async (event, dropIndex) => {
        event.preventDefault();

        if (isSavingOrder) return;

        const sourceIndex = draggedIndex;
        if (sourceIndex === null || sourceIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const previousDeployments = deployments;
        const reorderedDeployments = [...deployments];
        const [movedDeployment] = reorderedDeployments.splice(sourceIndex, 1);
        reorderedDeployments.splice(dropIndex, 0, movedDeployment);

        setDraggedIndex(null);
        setDragOverIndex(null);
        await persistAppOrder(reorderedDeployments, previousDeployments);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const counts = useMemo(() => {
        let live = 0;
        let maintenance = 0;
        let privateCount = 0;
        let archived = 0;
        for (const d of deployments) {
            const meta = getStatusMeta(d.status);
            if (meta.key === 'live') live++;
            else if (meta.key === 'maintenance') maintenance++;
            else if (meta.key === 'private') privateCount++;
            else archived++;
        }
        return { total: deployments.length, live, maintenance, privateCount, archived };
    }, [deployments]);

    const filteredDeployments = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return deployments.filter((d) => {
            const matchesSearch =
                !q ||
                (d.name || '').toLowerCase().includes(q) ||
                (d.appType || '').toLowerCase().includes(q) ||
                (d.hostingProvider || '').toLowerCase().includes(q) ||
                (d.environment || '').toLowerCase().includes(q);
            const matchesStatus = statusFilter === 'all' || getStatusMeta(d.status).key === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [deployments, searchQuery, statusFilter]);

    return (
        <div className="adm-page">
            <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
            >
                <Link href="/admin/projects" className="adm-link inline-flex min-h-11 items-center">
                    Projects
                </Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">Apps</span>
            </nav>
            <PageHeader
                command="ls"
                title="Apps"
                description="Manage hosted applications, services, and active environments."
                actions={
                    <Link href="/admin/apps/new" className="adm-btn adm-btn-primary">
                        <FaPlus aria-hidden="true" /> New app
                    </Link>
                }
            />

            <div className="adm-stats">
                <Stat label="Total apps" value={counts.total} hint={`${counts.archived} archived`} />
                <Stat label="Live" value={counts.live} hint="Serving traffic" />
                <Stat label="Maintenance" value={counts.maintenance} hint="Scheduled windows" />
                <Stat label="Private" value={counts.privateCount} hint="Internal only" />
            </div>

            <Panel
                title="All apps"
                actions={
                    <div className="flex items-center gap-2">
                        {isSavingOrder && <Badge tone="info">Saving order...</Badge>}
                        <Badge>{filteredDeployments.length} shown</Badge>
                    </div>
                }
                flush
            >
                <div className="adm-prj-toolbar">
                    <div className="adm-prj-search">
                        <FaMagnifyingGlass aria-hidden="true" className="adm-prj-search-icon" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search apps by name, type, provider, or environment..."
                            aria-label="Search apps"
                            className="adm-input pr-12"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="adm-icon-btn absolute right-1 top-1/2 min-h-11 min-w-11 -translate-y-1/2"
                                aria-label="Clear app search"
                                title="Clear search"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        )}
                    </div>
                    <div role="group" aria-label="Filter apps by status" className="flex flex-wrap gap-1">
                        {[
                            ['all', 'All'],
                            ['live', 'Live'],
                            ['maintenance', 'Maintenance'],
                            ['private', 'Private'],
                            ['archived', 'Archived'],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={statusFilter === key}
                                onClick={() => setStatusFilter(key)}
                                className="adm-tab"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <Loading label="Loading apps" rows={5} />
                ) : filteredDeployments.length === 0 ? (
                    <EmptyState
                        title={deployments.length === 0 ? 'No apps added yet' : 'No matching apps'}
                        description={
                            deployments.length === 0
                                ? 'Create your first hosted application or service entry.'
                                : 'Try adjusting your search query or status filter.'
                        }
                        action={
                            deployments.length === 0 ? (
                                <Link href="/admin/apps/new" className="adm-btn adm-btn-primary">
                                    <FaPlus aria-hidden="true" /> New app
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStatusFilter('all');
                                    }}
                                    className="adm-btn"
                                >
                                    Clear filters
                                </button>
                            )
                        }
                    />
                ) : (
                    <ul className="adm-list">
                        {filteredDeployments.map((deployment, index) => {
                            const statusMeta = getStatusMeta(deployment.status);
                            const isDragging = draggedIndex === index;
                            const isDragTarget = dragOverIndex === index && draggedIndex !== index;

                            return (
                                <li
                                    key={deployment._id}
                                    onDragOver={(event) => handleDragOver(event, index)}
                                    onDrop={(event) => handleDrop(event, index)}
                                    className={`adm-row grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${
                                        isDragging ? 'adm-prj-row-dragging' : ''
                                    } ${isDragTarget ? 'adm-prj-row-over' : ''}`}
                                >
                                    <div className="row-span-2 inline-flex items-center gap-1.5 self-start sm:row-span-1">
                                        <button
                                            type="button"
                                            draggable={!isSavingOrder}
                                            onDragStart={(event) => handleDragStart(event, index)}
                                            onDragEnd={handleDragEnd}
                                            disabled={isSavingOrder}
                                            aria-label={`Reorder ${deployment.name}`}
                                            title="Drag to reorder"
                                            className="adm-icon-btn adm-prj-drag min-h-11 min-w-11"
                                        >
                                            <FaGripVertical aria-hidden="true" />
                                        </button>
                                        <span className="adm-num text-[var(--text-secondary)]">{index + 1}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="adm-prj-thumb" aria-hidden="true">
                                                {deployment.image ? (
                                                    <img src={deployment.image} alt="" loading="lazy" />
                                                ) : (
                                                    <FaServer />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/admin/apps/${deployment._id}`}
                                                    className="block truncate font-semibold text-[var(--text-bright)] hover:underline"
                                                >
                                                    {deployment.name}
                                                </Link>
                                                <p className="adm-help truncate font-mono">
                                                    {deployment.hostedUrl ||
                                                        (deployment.slug ? `/apps/${deployment.slug}` : '—')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <Badge title="App type">
                                                <span className="sr-only">Type: </span>
                                                {deployment.appType || 'Unspecified'}
                                            </Badge>
                                            {deployment.hostingProvider && (
                                                <Badge title="Hosting provider">
                                                    <span className="sr-only">Provider: </span>
                                                    {deployment.hostingProvider}
                                                </Badge>
                                            )}
                                            <Badge>
                                                <span className="sr-only">Environment: </span>
                                                {deployment.environment || 'Production'}
                                            </Badge>
                                            <Badge tone={statusMeta.tone}>
                                                <span className="sr-only">Status: </span>
                                                {statusMeta.label}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="col-start-2 flex flex-wrap justify-end gap-1 sm:col-start-3 sm:flex-nowrap">
                                        {deployment.hostedUrl && (
                                            <a
                                                href={deployment.hostedUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="adm-icon-btn min-h-11 min-w-11"
                                                aria-label={`Open live URL for ${deployment.name}`}
                                                title="Open hosted URL"
                                            >
                                                <FaArrowUpRightFromSquare aria-hidden="true" />
                                            </a>
                                        )}
                                        <Link
                                            href={`/admin/apps/${deployment._id}`}
                                            className="adm-icon-btn min-h-11 min-w-11"
                                            aria-label={`Edit ${deployment.name}`}
                                            title={`Edit ${deployment.name}`}
                                        >
                                            <FaPen aria-hidden="true" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(deployment._id)}
                                            className="adm-icon-btn min-h-11 min-w-11 hover:!text-[var(--adm-error-ink)]"
                                            aria-label={`Delete ${deployment.name}`}
                                            title={`Delete ${deployment.name}`}
                                        >
                                            <FaTrash aria-hidden="true" />
                                        </button>
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
