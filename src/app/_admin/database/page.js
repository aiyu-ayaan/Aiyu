"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    FaArrowsRotate,
    FaCheck,
    FaChevronDown,
    FaChevronUp,
    FaCloudArrowUp,
    FaCopy,
    FaDownload,
    FaEye,
    FaEyeSlash,
    FaFileArrowUp,
    FaGear,
    FaGoogle,
    FaRightFromBracket,
    FaSpinner,
    FaTrashCan,
    FaUpRightFromSquare,
    FaUserCheck,
    FaXmark,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Field, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import '@/app/styles/admin-system.css';

// Backup collections grouped for the selection popup. Keys match the export
// route's COLLECTION_PRODUCERS / import route's `key` fields. `__images` is a
// pseudo-item mapping to the includeImages toggle (gallery asset files).
const EXPORT_SECTIONS = [
    {
        title: 'Site content',
        items: [
            { key: 'about', label: 'About' },
            { key: 'blogs', label: 'Blogs' },
            { key: 'config', label: 'Config' },
            { key: 'gallery', label: 'Gallery' },
            { key: 'header', label: 'Header' },
            { key: 'home', label: 'Home' },
            { key: 'aiPage', label: 'AI page' },
            { key: 'resumeStudio', label: 'Resume studio' },
            { key: 'projects', label: 'Projects' },
            { key: 'deployments', label: 'Deployments' },
            { key: 'legalApps', label: 'Legal apps' },
            { key: 'legalDocuments', label: 'Legal pages' },
            { key: 'socials', label: 'Socials' },
            { key: 'themes', label: 'Themes' },
        ],
    },
    {
        title: 'AI hub',
        items: [
            { key: 'aiSkillCategories', label: 'Skill categories' },
            { key: 'aiSkills', label: 'Skills' },
            { key: 'aiRecommendations', label: 'Recommendations' },
            { key: 'aiCredits', label: 'Credits' },
            { key: 'aiPrompts', label: 'Prompts' },
        ],
    },
    {
        title: 'AI usage history',
        items: [{ key: 'aiLogs', label: 'Usage logs (prompts, responses, tokens)' }],
    },
    {
        title: 'Analytics',
        items: [
            { key: 'analyticsEvents', label: 'Events' },
            { key: 'analyticsDaily', label: 'Daily rollups' },
        ],
    },
    {
        title: 'System',
        items: [
            { key: 'crons', label: 'Cron jobs' },
            { key: 'ads', label: 'Ads' },
            { key: 'notificationConfig', label: 'Notification config' },
        ],
    },
    {
        title: 'Sensitive',
        items: [
            { key: 'github', label: 'GitHub' },
            { key: 'contactMessages', label: 'Contact messages' },
        ],
    },
    {
        title: 'Assets',
        items: [{ key: '__images', label: 'Gallery image files' }],
    },
];

const ALL_EXPORT_KEYS = EXPORT_SECTIONS.flatMap((s) => s.items.map((i) => i.key));

function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const d = new Date(dateString);
        return (
            d.toLocaleDateString() +
            ' ' +
            d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
    } catch {
        return dateString;
    }
}

export default function DatabaseManager() {
    const { confirm } = useAdminFeedback();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [importFile, setImportFile] = useState(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [selection, setSelection] = useState(() =>
        Object.fromEntries(ALL_EXPORT_KEYS.map((k) => [k, true]))
    );

    // Google Drive state
    const [gdriveStatus, setGdriveStatus] = useState(null);
    const [gdriveFiles, setGdriveFiles] = useState([]);
    const [showGDriveModal, setShowGDriveModal] = useState(false);
    const [gdriveConfigForm, setGdriveConfigForm] = useState({
        clientId: '',
        clientSecret: '',
        retentionMonths: 1,
        autoDeleteEnabled: false,
    });
    const [gdriveLoading, setGdriveLoading] = useState(false);
    const [showDriveHistory, setShowDriveHistory] = useState(false);
    const [expandedGuideStep, setExpandedGuideStep] = useState(null);
    const [copiedCallback, setCopiedCallback] = useState(false);
    const [showClientSecret, setShowClientSecret] = useState(false);
    const [gdriveCron, setGdriveCron] = useState({
        backupEnabled: false,
        backupSchedule: '0 0 * * *',
        backupNextRun: null,
        purgeEnabled: false,
        purgeSchedule: '0 3 * * *',
        purgeNextRun: null,
        loading: false,
    });

    const selectedCount = useMemo(
        () => ALL_EXPORT_KEYS.filter((k) => selection[k]).length,
        [selection]
    );

    const fetchGDriveFiles = useCallback(async () => {
        try {
            setGdriveLoading(true);
            const res = await fetch('/api/admin/gdrive/list');
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.files)) {
                    setGdriveFiles(data.files);
                }
            }
        } catch (err) {
            console.error('Failed to fetch GDrive files:', err);
        } finally {
            setGdriveLoading(false);
        }
    }, []);

    const fetchGDriveStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/gdrive/status');
            if (res.ok) {
                const data = await res.json();
                setGdriveStatus(data);
                if (data.isConnected) {
                    fetchGDriveFiles();
                }
            }
        } catch (err) {
            console.error('Failed to fetch GDrive status:', err);
        }
    }, [fetchGDriveFiles]);

    const fetchGDriveConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/gdrive/config');
            if (res.ok) {
                const data = await res.json();
                setGdriveConfigForm({
                    clientId: data.clientId || '',
                    clientSecret: '',
                    retentionMonths: data.retentionMonths || 1,
                    autoDeleteEnabled: data.autoDeleteEnabled === true,
                });
            }
        } catch (err) {
            console.error('Failed to fetch GDrive config:', err);
        }
    }, []);

    const fetchGDriveCronStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/gdrive/cron');
            if (res.ok) {
                const data = await res.json();
                setGdriveCron({
                    backupEnabled: Boolean(data.backup?.enabled || data.enabled),
                    backupSchedule: data.backup?.schedule || '0 0 * * *',
                    backupNextRun: data.backup?.nextRun || null,
                    purgeEnabled: Boolean(data.purge?.enabled),
                    purgeSchedule: data.purge?.schedule || '0 3 * * *',
                    purgeNextRun: data.purge?.nextRun || null,
                    loading: false,
                });
            }
        } catch (err) {
            console.error('Failed to fetch GDrive cron status:', err);
        }
    }, []);

    useEffect(() => {
        fetchGDriveStatus();
        fetchGDriveConfig();
        fetchGDriveCronStatus();

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('gdrive') === 'connected') {
                setMessage({ type: 'success', text: 'Google Drive connected.' });
                window.history.replaceState({}, '', window.location.pathname);
            } else if (params.get('gdrive_error')) {
                const err = params.get('gdrive_error');
                setMessage({ type: 'error', text: `Google Drive error: ${err}` });
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [fetchGDriveStatus, fetchGDriveConfig, fetchGDriveCronStatus]);

    const handleToggleGDriveCron = async (actionTarget = 'gdrive_backup') => {
        const isPurge = actionTarget === 'gdrive_purge';
        const currentEnabled = isPurge ? gdriveCron.purgeEnabled : gdriveCron.backupEnabled;
        const nextState = !currentEnabled;

        try {
            setGdriveCron((prev) => ({ ...prev, loading: true }));
            const res = await fetch('/api/admin/gdrive/cron', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionTarget, enabled: nextState }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update cron schedule');
            }
            await fetchGDriveCronStatus();
            setMessage({
                type: 'success',
                text: isPurge
                    ? nextState
                        ? 'Auto-delete purge cron enabled.'
                        : 'Auto-delete purge cron disabled.'
                    : nextState
                    ? 'Automated daily backup enabled.'
                    : 'Automated daily backup disabled.',
            });
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
            setGdriveCron((prev) => ({ ...prev, loading: false }));
        }
    };

    const toggleKey = (key) => setSelection((prev) => ({ ...prev, [key]: !prev[key] }));

    const toggleSection = (items, value) =>
        setSelection((prev) => {
            const next = { ...prev };
            for (const item of items) next[item.key] = value;
            return next;
        });

    const setAll = (value) =>
        setSelection(Object.fromEntries(ALL_EXPORT_KEYS.map((k) => [k, value])));

    const handleSaveGDriveConfig = async (e) => {
        if (e) e.preventDefault();
        try {
            setIsLoading(true);
            const res = await fetch('/api/admin/gdrive/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gdriveConfigForm),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save Google Drive configuration');
            }
            setMessage({ type: 'success', text: 'Google Drive configuration saved.' });
            setShowGDriveModal(false);
            fetchGDriveStatus();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectGDrive = () => {
        window.location.href = '/api/admin/gdrive/auth';
    };

    const handleDisconnectGDrive = async () => {
        if (
            !(await confirm({
                title: 'Disconnect Google Drive?',
                message:
                    'Are you sure you want to disconnect Google Drive? Automatic and cloud backups will be disabled until reconnected.',
                confirmText: 'Disconnect',
                danger: true,
            }))
        ) {
            return;
        }

        try {
            setIsLoading(true);
            const res = await fetch('/api/admin/gdrive/disconnect', { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to disconnect Google Drive');
            }
            setMessage({ type: 'success', text: 'Google Drive disconnected.' });
            setGdriveFiles([]);
            fetchGDriveStatus();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGDriveBackup = async (dbKeysOverride) => {
        const dbKeys =
            dbKeysOverride || ALL_EXPORT_KEYS.filter((k) => k !== '__images' && selection[k]);
        if (dbKeys.length === 0 && !selection.__images) {
            setMessage({ type: 'error', text: 'Select at least one collection or asset.' });
            return;
        }

        try {
            setShowExportModal(false);
            setIsLoading(true);
            setMessage({ type: 'info', text: 'Uploading backup to Google Drive…' });

            const queryParams = new URLSearchParams();
            if (dbKeys.length > 0) queryParams.append('collections', dbKeys.join(','));
            if (!selection.__images) queryParams.append('includeImages', 'false');

            const res = await fetch(`/api/admin/gdrive/backup?${queryParams.toString()}`, {
                method: 'POST',
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Google Drive backup failed.');
            }

            setMessage({ type: 'success', text: 'Backup saved to Google Drive.' });
            fetchGDriveFiles();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGDriveRestore = async (fileId, filename) => {
        if (
            !(await confirm({
                title: 'Restore backup from Google Drive?',
                message: `Warning: Overwrite all system data using backup file "${filename}"? This action cannot be undone.`,
                confirmText: 'Restore backup',
                danger: true,
            }))
        ) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'Downloading and restoring from Google Drive…' });

            const res = await fetch('/api/admin/gdrive/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Restore from Google Drive failed.');
            }

            setMessage({
                type: 'success',
                text: 'System restored from Google Drive. Reloading…',
            });
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGDriveDelete = async (fileId, filename) => {
        if (
            !(await confirm({
                title: 'Delete Google Drive backup?',
                message: `Are you sure you want to permanently delete "${filename}" from Google Drive?`,
                confirmText: 'Delete file',
                danger: true,
            }))
        ) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'Deleting file from Google Drive…' });

            const res = await fetch('/api/admin/gdrive/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete Google Drive file.');
            }

            setMessage({ type: 'success', text: 'Backup deleted from Google Drive.' });
            fetchGDriveFiles();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        const dbKeys = ALL_EXPORT_KEYS.filter((k) => k !== '__images' && selection[k]);
        if (dbKeys.length === 0 && !selection.__images) {
            setMessage({ type: 'error', text: 'Select at least one collection or asset.' });
            return;
        }

        try {
            setShowExportModal(false);
            setIsLoading(true);
            setMessage({ type: 'info', text: 'Generating zip archive…' });

            const queryParams = new URLSearchParams();
            queryParams.append('collections', dbKeys.join(','));
            if (!selection.__images) queryParams.append('includeImages', 'false');

            const response = await fetch(`/api/admin/export?${queryParams.toString()}`);

            if (!response.ok) {
                let errorMsg = 'Export failed.';
                try {
                    const error = await response.json();
                    errorMsg = error.error || errorMsg;
                } catch {
                    /* response might not be JSON */
                }
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            a.download = `backup_${dateStr}_${timeStr}.zip`;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setMessage({ type: 'success', text: 'Backup zip archive downloaded.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!importFile) {
            setMessage({ type: 'error', text: 'Choose a backup file first.' });
            return;
        }

        if (
            !(await confirm({
                title: 'Overwrite all system data?',
                message:
                    'Warning: This action will overwrite all system data with the imported backup. This cannot be undone.',
                confirmText: 'Overwrite',
                danger: true,
            }))
        ) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'Restoring system data…' });

            const response = await fetch('/api/admin/import', {
                method: 'POST',
                headers: {
                    'Content-Type': importFile.type || 'application/octet-stream',
                    'x-backup-filename': importFile.name,
                },
                body: importFile,
            });

            let result = null;
            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (!response.ok) {
                if (response.status === 413) {
                    throw new Error('Backup file exceeds server upload size limit.');
                }
                throw new Error(result?.error || 'Restore failed.');
            }

            setMessage({ type: 'success', text: 'System restored. Reloading…' });
            setImportFile(null);
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetAnalytics = async () => {
        if (
            !(await confirm({
                title: 'Delete all analytics data?',
                message:
                    'Warning: This will permanently delete all analytics data. This action cannot be undone.',
                confirmText: 'Delete everything',
                danger: true,
            }))
        ) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'Purging analytics data…' });

            const response = await fetch('/api/admin/analytics', { method: 'DELETE' });
            const result = await response.json();

            if (!response.ok || !result?.success) {
                throw new Error(result?.error || 'Analytics reset failed.');
            }

            setMessage({ type: 'success', text: 'Analytics data deleted.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurgeCache = async () => {
        if (
            !(await confirm({
                title: 'Purge all caches?',
                message: 'Warning: This will purge all in-memory caches.',
                confirmText: 'Purge',
                danger: true,
            }))
        ) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'Purging caches…' });

            const response = await fetch('/api/admin/purge-cache', {
                method: 'POST',
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Cache purge failed.');
            }

            setMessage({ type: 'success', text: 'Caches purged.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="adm-page">
            <PageHeader
                command="pg_dump"
                title="Database and backups"
                description="Export and restore site collections, sync archives with Google Drive, and clear caches."
            />

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

            <div className="adm-split">
                <div className="adm-stack">
                    {/* Export and Google Drive */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Panel
                            title="System backup"
                            actions={<Badge>{ALL_EXPORT_KEYS.length} collections</Badge>}
                        >
                            <div className="space-y-4">
                                <p className="adm-help">
                                    Generate a zip archive of your database and gallery uploads. Choose
                                    which collections to include before downloading or sending to Google
                                    Drive.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowExportModal(true)}
                                    disabled={isLoading}
                                    className="adm-btn adm-btn-primary"
                                >
                                    {isLoading ? (
                                        <FaSpinner aria-hidden="true" className="animate-spin" />
                                    ) : (
                                        <FaDownload aria-hidden="true" />
                                    )}
                                    {isLoading ? 'Processing' : 'Configure backup'}
                                </button>
                            </div>
                        </Panel>

                        <Panel
                            title="Google Drive sync"
                            actions={
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge
                                        tone={
                                            gdriveStatus?.autoDeleteEnabled ? 'info' : undefined
                                        }
                                    >
                                        {gdriveStatus?.autoDeleteEnabled
                                            ? `Auto-purge: > ${
                                                  gdriveStatus?.retentionMonths || 1
                                              }m`
                                            : 'Auto-purge: Off'}
                                    </Badge>
                                    <Badge
                                        tone={
                                            gdriveStatus?.isConnected
                                                ? 'ok'
                                                : gdriveStatus?.isConfigured
                                                ? 'warn'
                                                : undefined
                                        }
                                    >
                                        {gdriveStatus?.isConnected
                                            ? 'Connected'
                                            : gdriveStatus?.isConfigured
                                            ? 'Disconnected'
                                            : 'Not configured'}
                                    </Badge>
                                </div>
                            }
                        >
                            <div className="space-y-4">
                                {gdriveStatus?.isConnected && gdriveStatus?.user ? (
                                    <div className="flex items-center gap-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3">
                                        {gdriveStatus.user.picture ? (
                                            <img
                                                src={gdriveStatus.user.picture}
                                                alt=""
                                                className="h-9 w-9 shrink-0 rounded-full border border-[var(--hairline)] object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--bg-secondary)]">
                                                <FaUserCheck aria-hidden="true" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-sm text-[var(--text-bright)]">
                                                {gdriveStatus.user.name || 'Google account'}
                                            </p>
                                            <p className="adm-help truncate font-mono">
                                                {gdriveStatus.user.email}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="adm-help">
                                        Store automated and on-demand database snapshots in your Google
                                        Drive folder.
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleGDriveBackup()}
                                        disabled={isLoading || !gdriveStatus?.isConnected}
                                        className="adm-btn adm-btn-primary"
                                    >
                                        <FaCloudArrowUp aria-hidden="true" /> Back up to Drive
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowDriveHistory(!showDriveHistory);
                                            if (!showDriveHistory && gdriveStatus?.isConnected) {
                                                fetchGDriveFiles();
                                            }
                                        }}
                                        disabled={!gdriveStatus?.isConnected}
                                        className="adm-btn"
                                    >
                                        {showDriveHistory ? 'Hide history' : 'Cloud history'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            fetchGDriveConfig();
                                            setShowGDriveModal(true);
                                        }}
                                        className="adm-btn"
                                    >
                                        <FaGear aria-hidden="true" /> API settings
                                    </button>
                                    {gdriveStatus?.isConnected ? (
                                        <button
                                            type="button"
                                            onClick={handleDisconnectGDrive}
                                            disabled={isLoading}
                                            className="adm-btn adm-btn-danger"
                                        >
                                            <FaRightFromBracket aria-hidden="true" /> Disconnect
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleConnectGDrive}
                                            disabled={isLoading || !gdriveStatus?.isConfigured}
                                            className="adm-btn"
                                        >
                                            <FaGoogle aria-hidden="true" /> Connect Google Drive
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Panel>
                    </div>

                    {/* Automated Drive Schedule */}
                    <Panel
                        title="Automated Google Drive schedule"
                        actions={
                            <Link href="/admin/config/crons" className="adm-link text-sm">
                                Open task scheduler
                            </Link>
                        }
                        flush
                    >
                        <ul className="adm-list">
                            <li className="adm-row flex-wrap justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-[var(--text-bright)]">
                                            Daily backup job
                                        </span>
                                        <code className="adm-code">{gdriveCron.backupSchedule}</code>
                                        <Badge tone={gdriveCron.backupEnabled ? 'ok' : undefined}>
                                            {gdriveCron.backupEnabled ? 'Enabled' : 'Off'}
                                        </Badge>
                                    </p>
                                    <p className="adm-help">
                                        Runs daily at midnight.
                                        {gdriveCron.backupEnabled && gdriveCron.backupNextRun
                                            ? ` Next run: ${formatDate(gdriveCron.backupNextRun)}`
                                            : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={gdriveCron.backupEnabled}
                                    aria-label="Enable daily Google Drive backup"
                                    disabled={gdriveCron.loading || !gdriveStatus?.isConnected}
                                    onClick={() => handleToggleGDriveCron('gdrive_backup')}
                                    className="adm-switch"
                                />
                            </li>
                            <li className="adm-row flex-wrap justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-[var(--text-bright)]">
                                            Old backup purge job
                                        </span>
                                        <code className="adm-code">{gdriveCron.purgeSchedule}</code>
                                        <Badge tone={gdriveCron.purgeEnabled ? 'ok' : undefined}>
                                            {gdriveCron.purgeEnabled ? 'Enabled' : 'Off'}
                                        </Badge>
                                    </p>
                                    <p className="adm-help">
                                        Deletes archives older than {gdriveStatus?.retentionMonths || 1}{' '}
                                        month{(gdriveStatus?.retentionMonths || 1) > 1 ? 's' : ''}.
                                        {gdriveCron.purgeEnabled && gdriveCron.purgeNextRun
                                            ? ` Next run: ${formatDate(gdriveCron.purgeNextRun)}`
                                            : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={gdriveCron.purgeEnabled}
                                    aria-label="Enable Google Drive old backup purge"
                                    disabled={gdriveCron.loading || !gdriveStatus?.isConnected}
                                    onClick={() => handleToggleGDriveCron('gdrive_purge')}
                                    className="adm-switch"
                                />
                            </li>
                        </ul>
                    </Panel>

                    {/* Google Drive History Table */}
                    {showDriveHistory && (
                        <Panel
                            title="Google Drive backup history"
                            actions={
                                <>
                                    <Badge>
                                        {gdriveFiles.length}{' '}
                                        {gdriveFiles.length === 1 ? 'file' : 'files'}
                                    </Badge>
                                    <button
                                        type="button"
                                        onClick={fetchGDriveFiles}
                                        disabled={gdriveLoading}
                                        className="adm-btn"
                                    >
                                        <FaArrowsRotate
                                            aria-hidden="true"
                                            className={gdriveLoading ? 'animate-spin' : ''}
                                        />
                                        Refresh
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDriveHistory(false)}
                                        aria-label="Close backup history"
                                        className="adm-icon-btn"
                                    >
                                        <FaXmark aria-hidden="true" />
                                    </button>
                                </>
                            }
                            flush
                        >
                            {gdriveLoading && gdriveFiles.length === 0 ? (
                                <Loading label="Fetching Google Drive backups" rows={4} />
                            ) : gdriveFiles.length === 0 ? (
                                <EmptyState
                                    title="No cloud backups found"
                                    description="Create a backup to Google Drive to see archives listed here."
                                />
                            ) : (
                                <div className="adm-table-wrap">
                                    <table className="adm-table min-w-[36rem]">
                                        <thead>
                                            <tr>
                                                <th>Filename</th>
                                                <th>Size</th>
                                                <th>Created</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {gdriveFiles.map((file) => (
                                                <tr key={file.id}>
                                                    <td
                                                        className="max-w-xs truncate font-mono text-xs text-[var(--text-bright)]"
                                                        title={file.name}
                                                    >
                                                        {file.name}
                                                    </td>
                                                    <td className="adm-num whitespace-nowrap">
                                                        {formatBytes(file.size)}
                                                    </td>
                                                    <td className="adm-num whitespace-nowrap text-xs text-[var(--text-secondary)]">
                                                        {formatDate(file.createdTime)}
                                                    </td>
                                                    <td className="text-right whitespace-nowrap">
                                                        <div className="inline-flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleGDriveRestore(
                                                                        file.id,
                                                                        file.name
                                                                    )
                                                                }
                                                                disabled={isLoading}
                                                                className="adm-btn"
                                                            >
                                                                Restore
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleGDriveDelete(
                                                                        file.id,
                                                                        file.name
                                                                    )
                                                                }
                                                                disabled={isLoading}
                                                                className="adm-btn adm-btn-danger"
                                                            >
                                                                <FaTrashCan aria-hidden="true" /> Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>
                    )}

                    {/* Collection overview */}
                    <Panel title="Backup collections" flush>
                        <ul className="adm-list">
                            {EXPORT_SECTIONS.map((sec) => (
                                <li
                                    key={sec.title}
                                    className="adm-row flex-wrap justify-between gap-3"
                                >
                                    <span className="font-semibold text-[var(--text-bright)]">
                                        {sec.title}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sec.items.map((item) => (
                                            <Badge key={item.key}>{item.label}</Badge>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>

                {/* Destructive panels in side column */}
                <aside className="adm-stack adm-side">
                    <Panel title="System restore" className="adm-danger">
                        <form onSubmit={handleImport} className="space-y-4">
                            <p className="adm-help">
                                Importing a backup archive overwrites existing collections permanently.
                            </p>
                            <label className="adm-choice">
                                <FaFileArrowUp aria-hidden="true" className="shrink-0" />
                                <span className="truncate font-mono text-xs">
                                    {importFile ? importFile.name : 'Choose backup file (.zip or .json)'}
                                </span>
                                <input
                                    type="file"
                                    accept=".zip,.json"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className="sr-only"
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={isLoading || !importFile}
                                className="adm-btn adm-btn-danger w-full"
                            >
                                {isLoading ? 'Restoring' : 'Restore from file'}
                            </button>
                        </form>
                    </Panel>

                    <Panel title="Cache purge" className="adm-danger">
                        <p className="adm-help mb-4">
                            Flush all in-memory cache entries so public pages reload fresh data on the
                            next request.
                        </p>
                        <button
                            type="button"
                            onClick={handlePurgeCache}
                            disabled={isLoading}
                            className="adm-btn adm-btn-danger w-full"
                        >
                            <FaTrashCan aria-hidden="true" />
                            {isLoading ? 'Purging' : 'Purge all caches'}
                        </button>
                    </Panel>

                    <Panel title="Reset analytics" className="adm-danger">
                        <p className="adm-help mb-4">
                            Permanently delete all recorded analytics events and daily rollups. Other
                            site content is untouched.
                        </p>
                        <button
                            type="button"
                            onClick={handleResetAnalytics}
                            disabled={isLoading}
                            className="adm-btn adm-btn-danger w-full"
                        >
                            <FaTrashCan aria-hidden="true" />
                            {isLoading ? 'Purging' : 'Delete analytics data'}
                        </button>
                    </Panel>
                </aside>
            </div>

            {/* Google Drive API Settings Modal */}
            {showGDriveModal && (
                <div
                    className="adm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="gdrive-modal-title"
                    onClick={() => setShowGDriveModal(false)}
                >
                    <div
                        className="adm-dialog adm-dialog-framed max-w-3xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="adm-dialog-head">
                            <div>
                                <h3 id="gdrive-modal-title" className="adm-panel-title">
                                    Google Drive API settings and setup guide
                                </h3>
                                <p className="adm-help">
                                    Configure OAuth 2.0 credentials for cloud backups.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGDriveModal(false)}
                                aria-label="Close modal"
                                className="adm-icon-btn"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        </div>

                        <div className="adm-dialog-body space-y-6">
                            <form onSubmit={handleSaveGDriveConfig} className="space-y-4">
                                <Field label="Google Client ID">
                                    <input
                                        type="text"
                                        value={gdriveConfigForm.clientId}
                                        onChange={(e) =>
                                            setGdriveConfigForm((prev) => ({
                                                ...prev,
                                                clientId: e.target.value,
                                            }))
                                        }
                                        placeholder="123456789-xxxx.apps.googleusercontent.com"
                                        className="adm-input font-mono"
                                    />
                                </Field>

                                <div className="adm-field">
                                    <label htmlFor="gdrive-client-secret" className="adm-label">
                                        Google Client Secret
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            id="gdrive-client-secret"
                                            type={showClientSecret ? 'text' : 'password'}
                                            value={gdriveConfigForm.clientSecret}
                                            onChange={(e) =>
                                                setGdriveConfigForm((prev) => ({
                                                    ...prev,
                                                    clientSecret: e.target.value,
                                                }))
                                            }
                                            placeholder={
                                                gdriveStatus?.isConfigured
                                                    ? '•••••••••••••••• (Leave blank to keep existing)'
                                                    : 'GOCSPX-xxxx...'
                                            }
                                            className="adm-input flex-1 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowClientSecret(!showClientSecret)}
                                            aria-label={
                                                showClientSecret
                                                    ? 'Hide client secret'
                                                    : 'Show client secret'
                                            }
                                            className="adm-btn"
                                        >
                                            {showClientSecret ? (
                                                <FaEyeSlash aria-hidden="true" />
                                            ) : (
                                                <FaEye aria-hidden="true" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 border-t border-[var(--hairline)] pt-4">
                                    <div>
                                        <p className="font-semibold text-sm text-[var(--text-bright)]">
                                            Auto-delete old backups
                                        </p>
                                        <p className="adm-help">
                                            Purges cloud backups older than the retention limit.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={gdriveConfigForm.autoDeleteEnabled}
                                        aria-label="Auto-delete old backups"
                                        onClick={() =>
                                            setGdriveConfigForm((prev) => ({
                                                ...prev,
                                                autoDeleteEnabled: !prev.autoDeleteEnabled,
                                            }))
                                        }
                                        className="adm-switch"
                                    />
                                </div>

                                {gdriveConfigForm.autoDeleteEnabled && (
                                    <Field label="Purge retention threshold">
                                        <select
                                            value={gdriveConfigForm.retentionMonths || 1}
                                            onChange={(e) =>
                                                setGdriveConfigForm((prev) => ({
                                                    ...prev,
                                                    retentionMonths: parseInt(e.target.value, 10),
                                                }))
                                            }
                                            className="adm-input"
                                        >
                                            {Array.from({ length: 12 }, (_, idx) => {
                                                const m = idx + 1;
                                                return (
                                                    <option key={m} value={m}>
                                                        {m} {m === 1 ? 'month (default)' : 'months'}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </Field>
                                )}

                                <div className="space-y-1.5 border-t border-[var(--hairline)] pt-4">
                                    <p className="adm-label">
                                        Authorized redirect URI (for Google Cloud Console)
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <code className="adm-code flex-1 truncate">
                                            {typeof window !== 'undefined'
                                                ? `${window.location.origin}/api/admin/gdrive/callback`
                                                : '/api/admin/gdrive/callback'}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const callbackUrl = `${window.location.origin}/api/admin/gdrive/callback`;
                                                navigator.clipboard.writeText(callbackUrl);
                                                setCopiedCallback(true);
                                                setTimeout(() => setCopiedCallback(false), 2000);
                                            }}
                                            className="adm-btn"
                                        >
                                            {copiedCallback ? (
                                                <>
                                                    <FaCheck aria-hidden="true" /> Copied
                                                </>
                                            ) : (
                                                <>
                                                    <FaCopy aria-hidden="true" /> Copy URL
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="adm-btn adm-btn-primary"
                                    >
                                        <FaCheck aria-hidden="true" /> Save credentials
                                    </button>

                                    {gdriveStatus?.isConfigured && !gdriveStatus?.isConnected && (
                                        <button
                                            type="button"
                                            onClick={handleConnectGDrive}
                                            className="adm-btn"
                                        >
                                            <FaUpRightFromSquare aria-hidden="true" /> Authorize
                                            Google account
                                        </button>
                                    )}
                                </div>
                            </form>

                            {/* Setup Guide */}
                            <div className="space-y-3 border-t border-[var(--hairline)] pt-4">
                                <h4 className="adm-panel-title">Step-by-step setup guide</h4>
                                <ul className="adm-list rounded-[10px] border border-[var(--hairline)]">
                                    {[
                                        {
                                            step: 1,
                                            title: 'Step 1: Create a Google Cloud project',
                                            content: (
                                                <div className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                                                    <p>
                                                        1. Open the{' '}
                                                        <a
                                                            href="https://console.cloud.google.com/"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="adm-link underline"
                                                        >
                                                            Google Cloud Console
                                                        </a>
                                                        .
                                                    </p>
                                                    <p>
                                                        2. Select the project menu in the top bar and
                                                        choose <strong>New Project</strong>.
                                                    </p>
                                                    <p>
                                                        3. Name the project (e.g.{' '}
                                                        <code className="adm-code">
                                                            Aiyu-Cloud-Backup
                                                        </code>
                                                        ) and click <strong>Create</strong>.
                                                    </p>
                                                </div>
                                            ),
                                        },
                                        {
                                            step: 2,
                                            title: 'Step 2: Enable the Google Drive API',
                                            content: (
                                                <div className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                                                    <p>
                                                        1. Navigate to{' '}
                                                        <strong>APIs &amp; Services &gt; Library</strong>.
                                                    </p>
                                                    <p>
                                                        2. Search for <strong>Google Drive API</strong>{' '}
                                                        and click <strong>Enable</strong>.
                                                    </p>
                                                </div>
                                            ),
                                        },
                                        {
                                            step: 3,
                                            title: 'Step 3: Configure the OAuth consent screen',
                                            content: (
                                                <div className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                                                    <p>
                                                        1. Open{' '}
                                                        <strong>
                                                            APIs &amp; Services &gt; OAuth consent screen
                                                        </strong>
                                                        .
                                                    </p>
                                                    <p>
                                                        2. Choose <strong>External</strong> user type and
                                                        fill in the app name and support email.
                                                    </p>
                                                    <p>
                                                        3. Add scope{' '}
                                                        <code className="adm-code">
                                                            https://www.googleapis.com/auth/drive.file
                                                        </code>
                                                        .
                                                    </p>
                                                </div>
                                            ),
                                        },
                                        {
                                            step: 4,
                                            title: 'Step 4: Create OAuth 2.0 Web Client credentials',
                                            content: (
                                                <div className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                                                    <p>
                                                        1. Go to{' '}
                                                        <strong>
                                                            APIs &amp; Services &gt; Credentials
                                                        </strong>{' '}
                                                        and click{' '}
                                                        <strong>
                                                            Create Credentials &gt; OAuth client ID
                                                        </strong>
                                                        .
                                                    </p>
                                                    <p>
                                                        2. Choose <strong>Web application</strong> and
                                                        paste the redirect URI above under{' '}
                                                        <strong>Authorized redirect URIs</strong>.
                                                    </p>
                                                </div>
                                            ),
                                        },
                                        {
                                            step: 5,
                                            title: 'Step 5: Add test user and authorize',
                                            content: (
                                                <div className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                                                    <p>
                                                        1. Add your Google account under{' '}
                                                        <strong>
                                                            OAuth consent screen &gt; Test users
                                                        </strong>
                                                        .
                                                    </p>
                                                    <p>
                                                        2. Paste the Client ID and Client Secret above,
                                                        click <strong>Save credentials</strong>, then{' '}
                                                        <strong>Authorize Google account</strong>.
                                                    </p>
                                                </div>
                                            ),
                                        },
                                    ].map((guide) => {
                                        const open = expandedGuideStep === guide.step;
                                        return (
                                            <li key={guide.step}>
                                                <button
                                                    type="button"
                                                    aria-expanded={open}
                                                    onClick={() =>
                                                        setExpandedGuideStep(
                                                            open ? null : guide.step
                                                        )
                                                    }
                                                    className="adm-row justify-between font-semibold text-[var(--text-bright)]"
                                                >
                                                    <span>{guide.title}</span>
                                                    {open ? (
                                                        <FaChevronUp aria-hidden="true" />
                                                    ) : (
                                                        <FaChevronDown aria-hidden="true" />
                                                    )}
                                                </button>
                                                {open && (
                                                    <div className="border-t border-[var(--hairline)] bg-[var(--bg-primary)] p-4">
                                                        {guide.content}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>

                        <div className="adm-dialog-foot">
                            <button
                                type="button"
                                onClick={() => setShowGDriveModal(false)}
                                className="adm-btn"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Selection Modal */}
            {showExportModal && (
                <div
                    className="adm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="export-modal-title"
                    onClick={() => setShowExportModal(false)}
                >
                    <div
                        className="adm-dialog adm-dialog-framed max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="adm-dialog-head">
                            <div>
                                <h3 id="export-modal-title" className="adm-panel-title">
                                    Configure backup
                                </h3>
                                <p className="adm-help">
                                    {selectedCount} of {ALL_EXPORT_KEYS.length} selected
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowExportModal(false)}
                                aria-label="Close"
                                className="adm-icon-btn"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        </div>

                        <div className="adm-dialog-body space-y-5">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAll(true)}
                                    className="adm-btn"
                                >
                                    Select all
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAll(false)}
                                    className="adm-btn"
                                >
                                    Deselect all
                                </button>
                            </div>

                            {EXPORT_SECTIONS.map((section) => {
                                const total = section.items.length;
                                const checked = section.items.filter((i) => selection[i.key]).length;
                                const allOn = checked === total;
                                return (
                                    <div key={section.title} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-sm text-[var(--text-bright)]">
                                                {section.title}
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => toggleSection(section.items, !allOn)}
                                                className="adm-btn adm-btn-quiet"
                                            >
                                                {allOn ? 'Clear' : 'Select all'}
                                            </button>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {section.items.map((item) => {
                                                const on = !!selection[item.key];
                                                return (
                                                    <label key={item.key} className="adm-choice">
                                                        <input
                                                            type="checkbox"
                                                            checked={on}
                                                            onChange={() => toggleKey(item.key)}
                                                            className="adm-check"
                                                        />
                                                        <span>{item.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="adm-dialog-foot justify-between">
                            <button
                                type="button"
                                onClick={() =>
                                    handleGDriveBackup(
                                        ALL_EXPORT_KEYS.filter(
                                            (k) => k !== '__images' && selection[k]
                                        )
                                    )
                                }
                                disabled={
                                    selectedCount === 0 || isLoading || !gdriveStatus?.isConnected
                                }
                                title={
                                    !gdriveStatus?.isConnected
                                        ? 'Google Drive must be connected first'
                                        : ''
                                }
                                className="adm-btn"
                            >
                                <FaCloudArrowUp aria-hidden="true" /> Back up to Google Drive
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowExportModal(false)}
                                    className="adm-btn"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    disabled={selectedCount === 0 || isLoading}
                                    className="adm-btn adm-btn-primary"
                                >
                                    <FaDownload aria-hidden="true" /> Download zip
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
