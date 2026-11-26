'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    FaArrowsRotate,
    FaImage,
    FaSpinner,
    FaTrashCan,
} from 'react-icons/fa6';
import { Badge, EmptyState, Loading, Panel, Stat } from '@/app/components/admin/ui';
import '@/app/styles/admin-system.css';

function formatBytes(bytes = 0) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** unitIndex;
    return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function ConfirmDialog({ dialog, onClose, onConfirm, busy }) {
    if (!dialog) {
        return null;
    }

    return (
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-unreferenced-title">
            <div className="adm-dialog adm-dialog-framed max-w-lg">
                <div className="adm-dialog-head">
                    <div>
                        <h3 id="delete-unreferenced-title" className="adm-panel-title">
                            {dialog.title}
                        </h3>
                        <p className="adm-help mt-1">{dialog.description}</p>
                    </div>
                </div>

                <div className="adm-dialog-body space-y-4">
                    <dl className="adm-facts">
                        <div>
                            <dt>Files selected</dt>
                            <dd className="adm-num font-semibold text-[var(--text-bright)]">{dialog.fileCount}</dd>
                        </div>
                        <div>
                            <dt>Estimated reclaim</dt>
                            <dd className="adm-num font-semibold text-[var(--text-bright)]">
                                {formatBytes(dialog.reclaimBytes)}
                            </dd>
                        </div>
                    </dl>

                    <div className="max-h-48 overflow-y-auto rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3">
                        <ul className="space-y-2 font-mono text-xs">
                            {dialog.filenames.slice(0, 12).map((filename) => (
                                <li key={filename} className="flex items-center gap-3 truncate">
                                    {filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                        <img
                                            src={`/uploads/${filename}`}
                                            alt=""
                                            className="h-6 w-6 shrink-0 rounded object-cover"
                                        />
                                    ) : (
                                        <div className="h-6 w-6 shrink-0 rounded bg-[var(--bg-secondary)]" />
                                    )}
                                    <a
                                        href={`/uploads/${filename}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="adm-link truncate"
                                    >
                                        {filename}
                                    </a>
                                </li>
                            ))}
                            {dialog.filenames.length > 12 && (
                                <li className="adm-help pl-9">+{dialog.filenames.length - 12} more files</li>
                            )}
                        </ul>
                    </div>
                </div>

                <div className="adm-dialog-foot">
                    <button type="button" onClick={onClose} disabled={busy} className="adm-btn">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className="adm-btn adm-btn-danger"
                    >
                        {busy && <FaSpinner aria-hidden="true" className="animate-spin" />}
                        {busy ? 'Deleting' : dialog.confirmLabel}
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
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-labelledby="webp-migration-title">
            <div className="adm-dialog adm-dialog-framed max-w-2xl">
                <div className="adm-dialog-head">
                    <div>
                        <h3 id="webp-migration-title" className="adm-panel-title">
                            Pre-migration audit
                        </h3>
                        <p className="adm-help mt-1">
                            Review legacy images and affected database records before converting to WebP.
                        </p>
                    </div>
                </div>

                <div className="adm-dialog-body space-y-4">
                    <dl className="adm-facts rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3">
                        <div>
                            <dt>Legacy images</dt>
                            <dd className="adm-num font-semibold text-[var(--text-bright)]">{totalCandidates}</dd>
                        </div>
                        <div>
                            <dt>Current footprint</dt>
                            <dd className="adm-num font-semibold text-[var(--text-bright)]">
                                {formatBytes(totalBytes)}
                            </dd>
                        </div>
                        <div>
                            <dt>Database references</dt>
                            <dd className="adm-num font-semibold text-[var(--text-bright)]">{totalReferences}</dd>
                        </div>
                    </dl>

                    <div className="max-h-72 overflow-y-auto rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)]">
                        {candidates.length === 0 ? (
                            <EmptyState
                                title="No legacy images require optimization"
                                description="All assets in public/uploads are already optimized to WebP."
                            />
                        ) : (
                            <ul className="adm-list">
                                {candidates.map((candidate) => (
                                    <li key={candidate.filename} className="p-3 space-y-2">
                                        <div className="flex items-center gap-3">
                                            {candidate.filename.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                <img
                                                    src={`/uploads/${candidate.filename}`}
                                                    alt=""
                                                    className="h-8 w-8 shrink-0 rounded border border-[var(--hairline)] object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--hairline)] bg-[var(--bg-secondary)]">
                                                    <FaImage aria-hidden="true" className="text-[var(--adm-hint)]" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div
                                                    className="truncate font-mono text-xs font-semibold text-[var(--text-bright)]"
                                                    title={candidate.filename}
                                                >
                                                    {candidate.filename}
                                                </div>
                                                <div className="adm-help">
                                                    {formatBytes(candidate.sizeBytes)} ·{' '}
                                                    {candidate.filename.includes('-thumb.')
                                                        ? 'Thumbnail'
                                                        : 'Original image'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pl-11 space-y-1">
                                            <p className="adm-help">Affected references:</p>
                                            {candidate.references.length === 0 ? (
                                                <p className="adm-help">
                                                    Not referenced in content (safe disk-only conversion).
                                                </p>
                                            ) : (
                                                <ul className="space-y-1">
                                                    {candidate.references.map((ref, idx) => (
                                                        <li
                                                            key={idx}
                                                            className="flex items-center gap-2 font-mono text-xs"
                                                        >
                                                            <Badge tone="info">{ref.model}</Badge>
                                                            <span
                                                                className="truncate text-[var(--text-secondary)]"
                                                                title={ref.label}
                                                            >
                                                                {ref.label}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="adm-dialog-foot">
                    <button type="button" onClick={onClose} disabled={busy} className="adm-btn">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy || candidates.length === 0}
                        className="adm-btn adm-btn-primary"
                    >
                        {busy && <FaSpinner aria-hidden="true" className="animate-spin" />}
                        {busy ? 'Converting to WebP' : 'Convert to WebP'}
                    </button>
                </div>
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

    const unreferencedUploads = useMemo(() => audit?.unreferencedUploads || [], [audit]);

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
            title: files.length === 1 ? 'Delete unreferenced file?' : 'Delete all unreferenced files?',
            description:
                files.length === 1
                    ? 'This file is not referenced by any current content. It will be permanently removed from disk.'
                    : 'These files are not referenced by any current content. They will be permanently removed from disk.',
            fileCount: files.length,
            reclaimBytes,
            filenames,
            confirmLabel: files.length === 1 ? 'Delete file' : 'Delete all files',
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
                text: `Deleted ${deletedCount} file${deletedCount === 1 ? '' : 's'} and reclaimed ${reclaimed}.${
                    skippedCount ? ` Skipped ${skippedCount}.` : ''
                }`,
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
                method: 'POST',
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to complete migration.');
            }

            setMigrationResult(result);
            setMessage({
                type: 'success',
                text: `Migrated ${result.migratedCount} legacy image${
                    result.migratedCount === 1 ? '' : 's'
                } to WebP, reclaiming ${formatBytes(result.reclaimedBytes)}.`,
            });

            await loadAudit(false);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setMigrating(false);
        }
    }

    if (loading) {
        return (
            <section className="adm-panel">
                <Loading label="Loading storage audit" rows={6} />
            </section>
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

    const sections = audit?.sections || [];

    return (
        <div className="adm-stack">
            {message && (
                <div
                    role="alert"
                    className={`adm-notice ${
                        message.type === 'error'
                            ? 'adm-notice-error'
                            : message.type === 'success'
                            ? 'adm-notice-ok'
                            : 'adm-notice-info'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <div className="adm-stats">
                <Stat label="Total app storage" value={formatBytes(summary.totalAppBytes)} hint="Database and uploads" />
                <Stat
                    label="Uploads on disk"
                    value={formatBytes(summary.totalUploadBytes)}
                    hint={`${summary.uploadFileCount || 0} files`}
                />
                <Stat
                    label="Database content"
                    value={formatBytes(summary.totalDatabaseBytes)}
                    hint="Approximate JSON footprint"
                />
                <Stat
                    label="Unreferenced uploads"
                    value={formatBytes(summary.totalUnreferencedUploadBytes)}
                    hint={`${summary.unreferencedUploadCount || 0} files can be reclaimed`}
                />
            </div>

            <div className="adm-split">
                <div className="adm-stack">
                    <Panel
                        title="Content breakdown"
                        actions={
                            <button
                                type="button"
                                onClick={() => loadAudit(false)}
                                disabled={refreshing}
                                className="adm-btn"
                            >
                                <FaArrowsRotate aria-hidden="true" className={refreshing ? 'animate-spin' : ''} />
                                Refresh audit
                            </button>
                        }
                        flush
                    >
                        {sections.length === 0 ? (
                            <EmptyState
                                title="No storage sections available"
                                description="Run a refresh to audit content tables."
                            />
                        ) : (
                            <div className="adm-table-wrap">
                                <table className="adm-table min-w-[38rem]">
                                    <thead>
                                        <tr>
                                            <th>Section</th>
                                            <th>Documents</th>
                                            <th>Data size</th>
                                            <th>Referenced uploads</th>
                                            <th>Referenced upload size</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sections.map((section) => (
                                            <tr key={section.key}>
                                                <td className="font-semibold text-[var(--text-bright)]">
                                                    {section.label}
                                                </td>
                                                <td className="adm-num">{section.docCount}</td>
                                                <td className="adm-num">{formatBytes(section.approximateBytes)}</td>
                                                <td className="adm-num">{section.referencedUploadCount}</td>
                                                <td className="adm-num">
                                                    {formatBytes(section.referencedUploadBytes)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>

                    <Panel
                        title="Unreferenced uploads"
                        actions={
                            unreferencedUploads.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => openDeleteDialog(unreferencedUploads)}
                                    className="adm-btn adm-btn-danger"
                                >
                                    <FaTrashCan aria-hidden="true" /> Delete all ({unreferencedUploads.length})
                                </button>
                            ) : (
                                <Badge tone="ok">Clean</Badge>
                            )
                        }
                        flush
                    >
                        {unreferencedUploads.length === 0 ? (
                            <EmptyState
                                title="No unreferenced uploads found"
                                description="Everything inside public/uploads is currently referenced by site content."
                            />
                        ) : (
                            <div className="adm-table-wrap">
                                <table className="adm-table min-w-[40rem]">
                                    <thead>
                                        <tr>
                                            <th>Filename</th>
                                            <th>Size</th>
                                            <th>Type</th>
                                            <th>Last modified</th>
                                            <th className="text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unreferencedUploads.map((upload) => (
                                            <tr key={upload.filename}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        {upload.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                            <img
                                                                src={`/uploads/${upload.filename}`}
                                                                alt=""
                                                                className="h-8 w-8 shrink-0 rounded border border-[var(--hairline)] object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--hairline)] bg-[var(--bg-secondary)]">
                                                                <FaImage
                                                                    aria-hidden="true"
                                                                    className="text-[var(--adm-hint)]"
                                                                />
                                                            </div>
                                                        )}
                                                        <a
                                                            href={`/uploads/${upload.filename}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="adm-link font-mono text-xs"
                                                        >
                                                            {upload.filename}
                                                        </a>
                                                    </div>
                                                </td>
                                                <td className="adm-num">{formatBytes(upload.sizeBytes)}</td>
                                                <td>
                                                    <Badge>{upload.isThumbnail ? 'Thumbnail' : 'Original'}</Badge>
                                                </td>
                                                <td className="adm-num text-xs text-[var(--text-secondary)]">
                                                    {new Date(upload.lastModified).toLocaleString()}
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteDialog([upload])}
                                                        className="adm-btn adm-btn-danger"
                                                    >
                                                        <FaTrashCan aria-hidden="true" /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>
                </div>

                <aside className="adm-stack adm-side">
                    <Panel title="Upload health">
                        <dl className="space-y-4">
                            <div>
                                <dt className="adm-help">Referenced uploads</dt>
                                <dd className="adm-num mt-0.5 text-lg font-semibold text-[var(--text-bright)]">
                                    {formatBytes(summary.totalReferencedUploadBytes)}
                                </dd>
                                <dd className="adm-help">
                                    {summary.referencedUploadCount || 0} files actively used by content
                                </dd>
                            </div>
                            <div className="border-t border-[var(--hairline)] pt-3">
                                <dt className="adm-help">Thumbnail storage</dt>
                                <dd className="adm-num mt-0.5 text-lg font-semibold text-[var(--text-bright)]">
                                    {formatBytes(summary.totalThumbnailBytes)}
                                </dd>
                                <dd className="adm-help">Generated thumbnails inside public/uploads</dd>
                            </div>
                            <div className="border-t border-[var(--hairline)] pt-3">
                                <dt className="adm-help">Cleanup opportunity</dt>
                                <dd className="adm-num mt-0.5 text-lg font-semibold text-[var(--text-bright)]">
                                    {formatBytes(summary.totalUnreferencedUploadBytes)}
                                </dd>
                                <dd className="adm-help">
                                    {summary.unreferencedUploadCount || 0} files can be safely reviewed for deletion
                                </dd>
                            </div>
                        </dl>
                    </Panel>

                    <Panel title="WebP migration">
                        <p className="adm-help mb-4">
                            Convert legacy images (PNG, JPG, HEIC, GIF) to WebP, update all database references, and
                            remove the old files.
                        </p>
                        <button
                            type="button"
                            onClick={loadPreview}
                            disabled={fetchingPreview || migrating}
                            className="adm-btn adm-btn-primary w-full"
                        >
                            {(fetchingPreview || migrating) && (
                                <FaSpinner aria-hidden="true" className="animate-spin" />
                            )}
                            {fetchingPreview
                                ? 'Auditing legacy files'
                                : migrating
                                ? 'Converting images'
                                : 'Audit and convert to WebP'}
                        </button>

                        {migrationResult && (
                            <div className="mt-4 space-y-3 border-t border-[var(--hairline)] pt-4">
                                <dl className="adm-facts">
                                    <div>
                                        <dt>Images migrated</dt>
                                        <dd className="adm-num font-semibold text-[var(--text-bright)]">
                                            {migrationResult.migratedCount}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Space reclaimed</dt>
                                        <dd className="adm-num font-semibold text-[var(--text-bright)]">
                                            {formatBytes(migrationResult.reclaimedBytes)}
                                        </dd>
                                    </div>
                                </dl>

                                {migrationResult.details && migrationResult.details.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-2.5 font-mono text-xs">
                                        <ul className="space-y-1.5">
                                            {migrationResult.details.map((detail, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-center justify-between gap-2 border-b border-[var(--hairline)] pb-1 last:border-0 last:pb-0"
                                                >
                                                    <span className="truncate" title={detail.original}>
                                                        {detail.success ? '✓' : '✗'} {detail.original}
                                                    </span>
                                                    <span className="adm-help shrink-0">
                                                        {detail.success
                                                            ? `${detail.referencesUpdated} refs`
                                                            : detail.error}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </Panel>
                </aside>
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
