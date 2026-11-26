"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    FaArrowLeft,
    FaArrowUpRightFromSquare,
    FaCodeBranch,
    FaFolder,
    FaGripVertical,
    FaLock,
    FaMagnifyingGlass,
    FaPen,
    FaPlus,
    FaTrash,
    FaXmark,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Loading, PageHeader, Panel, Stat } from '@/app/components/admin/ui';
import '@/app/styles/admin-projects.css';

const getStatusMeta = (status) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    if (normalizedStatus === 'done' || normalizedStatus === 'completed') {
        return { label: 'Done', tone: 'ok', key: 'done' };
    }

    if (normalizedStatus === 'deferred' || normalizedStatus === 'deffered' || normalizedStatus === 'on hold') {
        return { label: 'Deferred', tone: undefined, key: 'deferred' };
    }

    return { label: 'In progress', tone: 'warn', key: 'in-progress' };
};

export default function AdminProjects() {
    const { confirm, toast } = useAdminFeedback();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            setProjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (
            !(await confirm({
                title: 'Delete project?',
                message: 'Are you sure you want to delete this project? This action cannot be undone.',
                confirmText: 'Delete',
                danger: true,
            }))
        )
            return;

        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setProjects((prev) => prev.filter((p) => p._id !== id));
            } else {
                toast.error('Failed to delete project');
            }
        } catch (error) {
            console.error('Error deleting project', error);
        }
    };

    const persistProjectOrder = async (reorderedProjects, previousProjects) => {
        setProjects(reorderedProjects);
        setIsSavingOrder(true);

        try {
            const response = await fetch('/api/projects/reorder', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderedIds: reorderedProjects.map((project) => project._id),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save project order');
            }
        } catch (error) {
            console.error('Error reordering projects', error);
            setProjects(previousProjects);
            toast.error('Failed to save project order. Please try again.');
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

        const previousProjects = projects;
        const reorderedProjects = [...projects];
        const [movedProject] = reorderedProjects.splice(sourceIndex, 1);
        reorderedProjects.splice(dropIndex, 0, movedProject);

        setDraggedIndex(null);
        setDragOverIndex(null);
        await persistProjectOrder(reorderedProjects, previousProjects);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const counts = useMemo(() => {
        let done = 0;
        let inProgress = 0;
        let deferred = 0;
        let synced = 0;
        for (const p of projects) {
            const meta = getStatusMeta(p.status);
            if (meta.key === 'done') done++;
            else if (meta.key === 'deferred') deferred++;
            else inProgress++;
            if (p.source === 'github') synced++;
        }
        return { total: projects.length, done, inProgress, deferred, synced };
    }, [projects]);

    const filteredProjects = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return projects.filter((p) => {
            const matchesSearch =
                !q ||
                (p.name || '').toLowerCase().includes(q) ||
                (p.projectType || '').toLowerCase().includes(q) ||
                (Array.isArray(p.techStack) ? p.techStack.join(' ') : '').toLowerCase().includes(q);
            const matchesStatus = statusFilter === 'all' || getStatusMeta(p.status).key === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [projects, searchQuery, statusFilter]);

    return (
        <div className="adm-page">
            <PageHeader
                command="ls"
                title="Projects"
                description="Manage, reorder, and publish portfolio projects."
                actions={
                    <>
                        <Link href="/admin/github#repository-sync" className="adm-btn">
                            <FaCodeBranch aria-hidden="true" /> Sync from GitHub
                        </Link>
                        <Link href="/admin/projects/new" className="adm-btn adm-btn-primary">
                            <FaPlus aria-hidden="true" /> New project
                        </Link>
                    </>
                }
            />

            <div className="adm-stats">
                <Stat label="Total projects" value={counts.total} hint={`${counts.deferred} deferred`} />
                <Stat label="Completed" value={counts.done} hint="Live in portfolio" />
                <Stat label="In progress" value={counts.inProgress} hint="Active builds" />
                <Stat label="Synced from GitHub" value={counts.synced} hint="Repository linked" />
            </div>

            <Panel
                title="All projects"
                actions={
                    <div className="flex items-center gap-2">
                        {isSavingOrder && <Badge tone="info">Saving order...</Badge>}
                        <Badge>{filteredProjects.length} shown</Badge>
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
                            placeholder="Search projects by name, category, or stack..."
                            aria-label="Search projects"
                            className="adm-input pr-12"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="adm-icon-btn absolute right-1 top-1/2 min-h-11 min-w-11 -translate-y-1/2"
                                aria-label="Clear project search"
                                title="Clear search"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        )}
                    </div>
                    <div role="group" aria-label="Filter projects by status" className="flex flex-wrap gap-1">
                        {[
                            ['all', 'All'],
                            ['done', 'Done'],
                            ['in-progress', 'In progress'],
                            ['deferred', 'Deferred'],
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
                    <Loading label="Loading projects" rows={5} />
                ) : filteredProjects.length === 0 ? (
                    <EmptyState
                        title={projects.length === 0 ? 'No projects yet' : 'No matching projects'}
                        description={
                            projects.length === 0
                                ? 'Create your first portfolio project or sync repositories from GitHub.'
                                : 'Try adjusting your search query or status filter.'
                        }
                        action={
                            projects.length === 0 ? (
                                <Link href="/admin/projects/new" className="adm-btn adm-btn-primary">
                                    <FaPlus aria-hidden="true" /> New project
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
                        {filteredProjects.map((project, index) => {
                            const statusMeta = getStatusMeta(project.status);
                            const isDragging = draggedIndex === index;
                            const isDragTarget = dragOverIndex === index && draggedIndex !== index;
                            const stack = Array.isArray(project.techStack) ? project.techStack : [];

                            return (
                                <li
                                    key={project._id}
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
                                            aria-label={`Reorder ${project.name}`}
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
                                                {project.image ? (
                                                    <img src={project.image} alt="" loading="lazy" />
                                                ) : (
                                                    <FaFolder />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Link
                                                        href={`/admin/projects/${project._id}`}
                                                        className="truncate font-semibold text-[var(--text-bright)] hover:underline"
                                                    >
                                                        {project.name}
                                                    </Link>
                                                    {project.source === 'github' && (
                                                        <Badge
                                                            tone="info"
                                                            title={project.repoFullName || 'Synced from GitHub'}
                                                        >
                                                            <FaCodeBranch aria-hidden="true" /> Synced
                                                        </Badge>
                                                    )}
                                                    {project.pinnedFields?.length > 0 && (
                                                        <Badge
                                                            title={`Pinned fields: ${project.pinnedFields.join(', ')}`}
                                                        >
                                                            <FaLock aria-hidden="true" /> {project.pinnedFields.length}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {project.slug && (
                                                    <p className="adm-help truncate font-mono">
                                                        /projects/{project.slug}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <Badge title="Project category">
                                                <span className="sr-only">Category: </span>
                                                {project.projectType || 'Uncategorized'}
                                            </Badge>
                                            <Badge>
                                                <span className="sr-only">Year: </span>
                                                {project.year || 'No year'}
                                            </Badge>
                                            <Badge tone={statusMeta.tone}>
                                                <span className="sr-only">Status: </span>
                                                {statusMeta.label}
                                            </Badge>
                                            {stack.slice(0, 3).map((tech) => (
                                                <Badge key={tech} title={`Tech stack: ${tech}`}>
                                                    {tech}
                                                </Badge>
                                            ))}
                                            {stack.length > 3 && <Badge title="Additional technologies">+{stack.length - 3}</Badge>}
                                        </div>
                                    </div>
                                    <div className="col-start-2 flex flex-wrap justify-end gap-1 sm:col-start-3 sm:flex-nowrap">
                                        {project.codeLink && (
                                            <a
                                                href={project.codeLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="adm-icon-btn min-h-11 min-w-11"
                                                aria-label={`Open repository for ${project.name}`}
                                                title="Open repository or live link"
                                            >
                                                <FaArrowUpRightFromSquare aria-hidden="true" />
                                            </a>
                                        )}
                                        <Link
                                            href={`/admin/projects/${project._id}`}
                                            className="adm-icon-btn min-h-11 min-w-11"
                                            aria-label={`Edit ${project.name}`}
                                            title={`Edit ${project.name}`}
                                        >
                                            <FaPen aria-hidden="true" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(project._id)}
                                            className="adm-icon-btn min-h-11 min-w-11 hover:!text-[var(--adm-error-ink)]"
                                            aria-label={`Delete ${project.name}`}
                                            title={`Delete ${project.name}`}
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
