'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Database,
    HardDrive,
    Image as ImageIcon,
    RefreshCw,
    Trash2,
    Unlink,
} from 'lucide-react';

function formatBytes(bytes = 0) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );
    const value = bytes / 1024 ** unitIndex;
    return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function StatusBanner({ message }) {
    if (!message) {
        return null;
    }

    const styles = message.type === 'error'
        ? 'bg-red-500/10 border-red-500/20 text-red-300'
        : message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300';

    return (
        <div className={`mb-8 rounded-2xl border px-4 py-3 text-sm ${styles}`}>
            {message.text}
        </div>
    );
}

function ConfirmDialog({ dialog, onClose, onConfirm, busy }) {
    if (!dialog) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl">
                <div className="mb-4 flex items-start gap-3">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300">
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">{dialog.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{dialog.description}</p>
                    </div>
                </div>

                <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                        <span>Files selected</span>
                        <span className="font-mono text-white">{dialog.fileCount}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                        <span>Estimated reclaim</span>
                        <span className="font-mono text-cyan-300">{formatBytes(dialog.reclaimBytes)}</span>
                    </div>
                </div>

                <div className="mb-6 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="space-y-2 text-xs font-mono text-slate-300">
                        {dialog.filenames.slice(0, 12).map((filename) => (
                            <div key={filename} className="truncate">
                                {filename}
                            </div>
                        ))}
                        {dialog.filenames.length > 12 && (
                            <div className="text-slate-500">
                                + {dialog.filenames.length - 12} more files
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
                    >
                        {busy ? 'Deleting...' : dialog.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SummaryCards({ summary }) {
    const cards = [
        {
            label: 'Total App Storage',
            value: formatBytes(summary.totalAppBytes),
            detail: 'Database + uploads',
            accent: 'text-cyan-300',
            icon: <HardDrive size={18} />,
        },
        {
            label: 'Uploads On Disk',
            value: formatBytes(summary.totalUploadBytes),
            detail: `${summary.uploadFileCount} files`,
            accent: 'text-pink-300',
            icon: <ImageIcon size={18} />,
        },
        {
            label: 'Database Content',
            value: formatBytes(summary.totalDatabaseBytes),
            detail: 'Approximate JSON footprint',
            accent: 'text-amber-300',
            icon: <Database size={18} />,
        },
        {
            label: 'Unreferenced Uploads',
            value: formatBytes(summary.totalUnreferencedUploadBytes),
            detail: `${summary.unreferencedUploadCount} files can be reclaimed`,
            accent: 'text-red-300',
            icon: <Unlink size={18} />,
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <div key={card.label} className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
                    <div className={`mb-4 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 ${card.accent}`}>
                        {card.icon}
                    </div>
                    <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400">{card.label}</h3>
                    <p className={`mt-2 text-2xl font-bold ${card.accent}`}>{card.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
                </div>
            ))}
        </div>
    );
}

function SectionTable({ sections }) {
    return (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl">
            <div className="border-b border-white/10 px-6 py-4">
                <h2 className="text-lg font-bold text-white">Content Breakdown</h2>
                <p className="mt-1 text-sm text-slate-400">Estimated storage by content area and referenced upload usage.</p>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-950/40 text-xs uppercase tracking-widest text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Section</th>
                            <th className="px-6 py-4">Documents</th>
                            <th className="px-6 py-4">Data Size</th>
                            <th className="px-6 py-4">Referenced Uploads</th>
                            <th className="px-6 py-4">Referenced Upload Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sections.map((section) => (
                            <tr key={section.key} className="border-t border-white/5 text-slate-300">
                                <td className="px-6 py-4 font-semibold text-white">{section.label}</td>
                                <td className="px-6 py-4">{section.docCount}</td>
                                <td className="px-6 py-4">{formatBytes(section.approximateBytes)}</td>
                                <td className="px-6 py-4">{section.referencedUploadCount}</td>
                                <td className="px-6 py-4">{formatBytes(section.referencedUploadBytes)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function StorageManager({ mode = 'overview' }) {
    const [audit, setAudit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const isCleanupMode = mode === 'cleanup';

    const unreferencedUploads = useMemo(
        () => audit?.unreferencedUploads || [],
        [audit]
    );

    async function loadAudit(showLoader = false) {
        if (showLoader) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            const response = await fetch('/api/admin/storage');
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to load storage audit.');
            }

            setAudit(result.data);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        loadAudit(true);
    }, []);

    function openDeleteDialog(files) {
        const filenames = files.map((file) => file.filename);
        const reclaimBytes = files.reduce((total, file) => total + file.sizeBytes, 0);

        setDialog({
            title: files.length === 1 ? 'Delete Unreferenced File?' : 'Delete All Unreferenced Files?',
            description: files.length === 1
                ? 'This file is not referenced by any current content. The file will be permanently removed from disk.'
                : 'These files are not referenced by any current content. They will be permanently removed from disk.',
            fileCount: files.length,
            reclaimBytes,
            filenames,
            confirmLabel: files.length === 1 ? 'Delete File' : 'Delete All Files',
        });
    }

    async function confirmDelete() {
        if (!dialog) {
            return;
        }

        setDeleteBusy(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/storage/unreferenced', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filenames: dialog.filenames,
                }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to delete files.');
            }

            const deletedCount = result.data.deleted.length;
            const skippedCount = result.data.skipped.length;
            const reclaimed = formatBytes(result.data.reclaimedBytes);

            setMessage({
                type: 'success',
                text: `Deleted ${deletedCount} file${deletedCount === 1 ? '' : 's'} and reclaimed ${reclaimed}.${skippedCount ? ` Skipped ${skippedCount}.` : ''}`,
            });
            setDialog(null);
            await loadAudit(false);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setDeleteBusy(false);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="text-sm font-mono uppercase tracking-[0.24em] text-cyan-300">Loading Storage Audit...</div>
            </div>
        );
    }

    const summary = audit?.summary || {
        totalAppBytes: 0,
        totalUploadBytes: 0,
        totalDatabaseBytes: 0,
        totalUnreferencedUploadBytes: 0,
        uploadFileCount: 0,
        unreferencedUploadCount: 0,
        totalThumbnailBytes: 0,
    };

    return (
        <div className="space-y-8">
            <StatusBanner message={message} />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        {isCleanupMode ? 'Unreferenced Upload Cleanup' : 'Storage Audit'}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        {isCleanupMode
                            ? 'Review uploads that are not referenced by current content, then delete them one by one or in bulk.'
                            : 'Inspect how much space the app uses across content collections and uploaded files, then jump into cleanup for unused uploads.'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => loadAudit(false)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Refresh Audit
                    </button>

                    {isCleanupMode ? (
                        <Link
                            href="/admin/resources"
                            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/20"
                        >
                            <ArrowLeft size={16} />
                            Back To Audit
                        </Link>
                    ) : (
                        <Link
                            href="/admin/resources/unreferenced"
                            className="inline-flex items-center gap-2 rounded-xl bg-pink-500/10 px-4 py-2 text-sm text-pink-300 transition hover:bg-pink-500/20"
                        >
                            Review Unreferenced Files
                            <ArrowRight size={16} />
                        </Link>
                    )}
                </div>
            </div>

            <SummaryCards summary={summary} />

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <SectionTable sections={audit?.sections || []} />

                <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
                    <h2 className="text-lg font-bold text-white">Upload Health</h2>
                    <div className="mt-4 space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                            <div className="text-xs uppercase tracking-widest text-slate-500">Referenced Uploads</div>
                            <div className="mt-2 text-2xl font-bold text-emerald-300">{formatBytes(summary.totalReferencedUploadBytes)}</div>
                            <div className="mt-1 text-sm text-slate-400">{summary.referencedUploadCount} files actively used by content</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                            <div className="text-xs uppercase tracking-widest text-slate-500">Thumbnail Storage</div>
                            <div className="mt-2 text-2xl font-bold text-amber-300">{formatBytes(summary.totalThumbnailBytes)}</div>
                            <div className="mt-1 text-sm text-slate-400">Generated thumbnails inside `public/uploads`</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                            <div className="text-xs uppercase tracking-widest text-slate-500">Cleanup Opportunity</div>
                            <div className="mt-2 text-2xl font-bold text-red-300">{formatBytes(summary.totalUnreferencedUploadBytes)}</div>
                            <div className="mt-1 text-sm text-slate-400">{summary.unreferencedUploadCount} files can be safely reviewed for deletion</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl">
                <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            {isCleanupMode ? 'Unreferenced Uploads' : 'Largest Unreferenced Uploads'}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                            {isCleanupMode
                                ? 'These files are currently not referenced anywhere in the app data.'
                                : 'A preview of the largest unused files currently sitting in `public/uploads`.'}
                        </p>
                    </div>

                    {isCleanupMode && unreferencedUploads.length > 0 && (
                        <button
                            type="button"
                            onClick={() => openDeleteDialog(unreferencedUploads)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                        >
                            <Trash2 size={16} />
                            Delete All Unreferenced
                        </button>
                    )}
                </div>

                {unreferencedUploads.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <div className="mx-auto mb-4 inline-flex rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
                            <CheckCircle2 size={22} />
                        </div>
                        <p className="text-lg font-semibold text-white">No unreferenced uploads found</p>
                        <p className="mt-2 text-sm text-slate-400">Everything inside `public/uploads` is currently referenced by app content.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-slate-950/40 text-xs uppercase tracking-widest text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Filename</th>
                                    <th className="px-6 py-4">Size</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Last Modified</th>
                                    <th className="px-6 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(isCleanupMode ? unreferencedUploads : unreferencedUploads.slice(0, 8)).map((upload) => (
                                    <tr key={upload.filename} className="border-t border-white/5 text-slate-300">
                                        <td className="px-6 py-4 font-mono text-xs text-white">{upload.filename}</td>
                                        <td className="px-6 py-4">{formatBytes(upload.sizeBytes)}</td>
                                        <td className="px-6 py-4">{upload.isThumbnail ? 'Thumbnail' : 'Original'}</td>
                                        <td className="px-6 py-4">{new Date(upload.lastModified).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            {isCleanupMode ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteDialog([upload])}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-500">Review on cleanup page</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {!isCleanupMode && unreferencedUploads.length > 0 && (
                <div className="rounded-3xl border border-pink-500/20 bg-pink-500/5 p-6">
                    <h2 className="text-lg font-bold text-white">Cleanup Action</h2>
                    <p className="mt-2 text-sm text-slate-300">
                        You can currently reclaim <span className="font-semibold text-pink-300">{formatBytes(summary.totalUnreferencedUploadBytes)}</span> by deleting {summary.unreferencedUploadCount} unreferenced uploads.
                    </p>
                    <Link
                        href="/admin/resources/unreferenced"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-400"
                    >
                        Open Cleanup Page
                        <ArrowRight size={16} />
                    </Link>
                </div>
            )}

            <ConfirmDialog
                dialog={dialog}
                onClose={() => !deleteBusy && setDialog(null)}
                onConfirm={confirmDelete}
                busy={deleteBusy}
            />
        </div>
    );
}
