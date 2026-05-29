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
                            <div key={filename} className="flex items-center gap-3 truncate">
                                {filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <img src={`/uploads/${filename}`} alt="" className="h-6 w-6 rounded object-cover" />
                                ) : (
                                    <div className="h-6 w-6 rounded bg-white/5" />
                                )}
                                <a 
                                    href={`/uploads/${filename}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="hover:text-cyan-400 hover:underline"
                                >
                                    {filename}
                                </a>
                            </div>
                        ))}
                        {dialog.filenames.length > 12 && (
                            <div className="text-slate-500 pl-9">
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

function MigrationPreviewDialog({ open, onClose, onConfirm, data, busy }) {
    if (!open || !data) {
        return null;
    }

    const { candidates = [], totalCandidates = 0, totalReferences = 0 } = data;
    const totalBytes = candidates.reduce((sum, c) => sum + (c.sizeBytes || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="mb-4 flex items-start gap-3 text-left">
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-355 shrink-0 flex items-center justify-center">
                        <RefreshCw className="animate-spin w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Pre-Migration Audit</h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Review legacy images and affected database records before initiating the WebP optimization pipeline.
                        </p>
                    </div>
                </div>

                {/* Summary bar */}
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold">Legacy Images</div>
                        <div className="mt-1 font-mono text-lg font-bold text-cyan-300">{totalCandidates}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold">Current Footprint</div>
                        <div className="mt-1 font-mono text-lg font-bold text-pink-300">{formatBytes(totalBytes)}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold">DB References</div>
                        <div className="mt-1 font-mono text-lg font-bold text-emerald-300">{totalReferences}</div>
                    </div>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-4 custom-scrollbar mb-6 text-left">
                    {candidates.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            No legacy images require optimization. All assets are fully optimized to WebP!
                        </div>
                    ) : (
                        candidates.map((candidate) => (
                            <div key={candidate.filename} className="border-b border-white/5 pb-3 last:border-0 last:pb-0 text-left">
                                <div className="flex items-center gap-3">
                                    {candidate.filename.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                        <img src={`/uploads/${candidate.filename}`} alt="" className="h-8 w-8 rounded object-cover border border-white/10 shrink-0" />
                                    ) : (
                                        <div className="h-8 w-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 font-mono text-[9px] shrink-0">
                                            IMG
                                        </div>
                                    )}
                                    <div className="truncate flex-1">
                                        <div className="text-xs font-mono font-bold text-white truncate" title={candidate.filename}>
                                            {candidate.filename}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            Size: {formatBytes(candidate.sizeBytes)} • {candidate.filename.includes('-thumb.') ? 'Thumbnail' : 'Original Image'}
                                        </div>
                                    </div>
                                </div>

                                {/* References Sub-list */}
                                <div className="mt-2 pl-11 space-y-1">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold font-mono mb-1">
                                        Affected References:
                                    </div>
                                    {candidate.references.length === 0 ? (
                                        <div className="text-[11px] text-slate-500 italic pl-2">
                                            Not referenced in content (Safe disk-only conversion)
                                        </div>
                                    ) : (
                                        candidate.references.map((ref, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300 font-mono mt-0.5">
                                                <span className="text-cyan-400/80 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                                                    {ref.model}
                                                </span>
                                                <span className="truncate text-slate-400 hover:text-white" title={ref.label}>
                                                    {ref.label}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 shrink-0">
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
                        disabled={busy || candidates.length === 0}
                        className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                    >
                        {busy ? 'Processing Migration...' : 'Commence WebP Migration'}
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

export default function StorageManager() {
    const [audit, setAudit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [migrationResult, setMigrationResult] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [fetchingPreview, setFetchingPreview] = useState(false);

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

    async function loadPreview() {
        setFetchingPreview(true);
        setMessage(null);
        try {
            const response = await fetch('/api/admin/storage/migrate');
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to load migration preview.');
            }
            setPreviewData(result);
            setShowPreviewModal(true);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setFetchingPreview(false);
        }
    }

    async function executeMigration() {
        setShowPreviewModal(false);
        setMigrating(true);
        setMessage(null);
        setMigrationResult(null);

        try {
            const response = await fetch('/api/admin/storage/migrate', {
                method: 'POST'
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to complete migration.');
            }

            setMigrationResult(result);
            setMessage({
                type: 'success',
                text: `Successfully migrated ${result.migratedCount} legacy image${result.migratedCount === 1 ? '' : 's'} to WebP format, reclaiming ${formatBytes(result.reclaimedBytes)}.`
            });

            // Reload the audit data
            await loadAudit(false);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setMigrating(false);
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
                        Storage Audit & Cleanup
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Inspect how much space the app uses across content collections, and review or delete unused uploads in bulk.
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
                </div>
            </div>

            <SummaryCards summary={summary} />

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <SectionTable sections={audit?.sections || []} />

                <div className="space-y-6">
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

                    <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400">
                                <RefreshCw size={18} className={migrating ? 'animate-spin' : ''} />
                            </div>
                            <h2 className="text-lg font-bold text-white">WebP Migration Protocol</h2>
                        </div>
                        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                            Safely convert legacy images (PNG, JPG, HEIC, HEIF, GIF) to optimized WebP format. Converts originals and thumbnails, updates all database references (including nested structures, configs, and markdown content), and cleans up old files.
                        </p>
                        
                        <div className="mt-5">
                            <button
                                type="button"
                                onClick={loadPreview}
                                disabled={fetchingPreview || migrating}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                            >
                                {fetchingPreview ? 'Auditing Legacy Files...' : migrating ? 'Processing Migration...' : 'Initiate Migration Sequence'}
                            </button>
                        </div>

                        {migrationResult && (
                            <div className="mt-6 space-y-4 border-t border-white/5 pt-4">
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>Images Migrated:</span>
                                    <span className="font-mono text-cyan-300 font-bold">{migrationResult.migratedCount}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>Space Reclaimed:</span>
                                    <span className="font-mono text-emerald-300 font-bold">{formatBytes(migrationResult.reclaimedBytes)}</span>
                                </div>

                                {migrationResult.details && migrationResult.details.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/40 p-2.5 text-[11px] font-mono text-slate-300 space-y-1.5 custom-scrollbar">
                                        {migrationResult.details.map((detail, idx) => (
                                            <div key={idx} className="flex justify-between border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                                <div className="truncate max-w-[180px]" title={detail.original}>
                                                    {detail.success ? '✓' : '✗'} {detail.original}
                                                </div>
                                                <div className="text-slate-500 shrink-0">
                                                    {detail.success ? `${detail.referencesUpdated} refs` : detail.error}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl">
                <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            Unreferenced Uploads
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                            These files are currently not referenced anywhere in the app data.
                        </p>
                    </div>

                    {unreferencedUploads.length > 0 && (
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
                                {unreferencedUploads.map((upload) => (
                                    <tr key={upload.filename} className="border-t border-white/5 text-slate-300">
                                        <td className="px-6 py-4 font-mono text-xs text-white">
                                            <div className="flex items-center gap-3">
                                                {upload.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                    <img src={`/uploads/${upload.filename}`} alt="preview" className="h-8 w-8 rounded object-cover" />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded bg-white/5">
                                                        <ImageIcon size={14} className="text-slate-500" />
                                                    </div>
                                                )}
                                                <a 
                                                    href={`/uploads/${upload.filename}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="hover:text-cyan-400 hover:underline"
                                                >
                                                    {upload.filename}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{formatBytes(upload.sizeBytes)}</td>
                                        <td className="px-6 py-4">{upload.isThumbnail ? 'Thumbnail' : 'Original'}</td>
                                        <td className="px-6 py-4">{new Date(upload.lastModified).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => openDeleteDialog([upload])}
                                                className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>



            <ConfirmDialog
                dialog={dialog}
                onClose={() => !deleteBusy && setDialog(null)}
                onConfirm={confirmDelete}
                busy={deleteBusy}
            />

            <MigrationPreviewDialog
                open={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                onConfirm={executeMigration}
                data={previewData}
                busy={migrating}
            />
        </div>
    );
}
