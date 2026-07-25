"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaDownload,
    FaUpload,
    FaDatabase,
    FaExclamationTriangle,
    FaCheckCircle,
    FaServer,
    FaTrash,
    FaChartLine,
    FaTimes,
    FaGoogle,
    FaCloudUploadAlt,
    FaSync,
    FaKey,
    FaCopy,
    FaFolder,
    FaUserCheck,
    FaExternalLinkAlt,
    FaChevronDown,
    FaChevronUp,
    FaEye,
    FaEyeSlash,
    FaCheck,
    FaHistory,
    FaCog,
    FaSignOutAlt,
    FaClock,
} from 'react-icons/fa';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';

// Backup collections grouped for the selection popup. Keys match the export
// route's COLLECTION_PRODUCERS / import route's `key` fields. `__images` is a
// pseudo-item mapping to the includeImages toggle (gallery asset files).
const EXPORT_SECTIONS = [
    {
        title: 'Site Content',
        accent: 'amber',
        items: [
            { key: 'about', label: 'About' },
            { key: 'blogs', label: 'Blogs' },
            { key: 'config', label: 'Config' },
            { key: 'gallery', label: 'Gallery' },
            { key: 'header', label: 'Header' },
            { key: 'home', label: 'Home' },
            { key: 'aiPage', label: 'AI Page' },
            { key: 'resumeStudio', label: 'Resume Studio' },
            { key: 'projects', label: 'Projects' },
            { key: 'deployments', label: 'Deployments' },
            { key: 'socials', label: 'Socials' },
            { key: 'themes', label: 'Themes' },
        ],
    },
    {
        title: 'AI Hub',
        accent: 'cyan',
        items: [
            { key: 'aiSkillCategories', label: 'Skill Categories' },
            { key: 'aiSkills', label: 'Skills' },
            { key: 'aiRecommendations', label: 'Recommendations' },
            { key: 'aiCredits', label: 'Credits' },
            { key: 'aiPrompts', label: 'Prompts' },
        ],
    },
    {
        title: 'AI Usage History',
        accent: 'emerald',
        items: [
            { key: 'aiLogs', label: 'Usage Logs (prompts, responses, tokens)' },
        ],
    },
    {
        title: 'Analytics',
        accent: 'purple',
        items: [
            { key: 'analyticsEvents', label: 'Events' },
            { key: 'analyticsDaily', label: 'Daily Rollups' },
        ],
    },
    {
        title: 'System',
        accent: 'cyan',
        items: [
            { key: 'crons', label: 'Cron Jobs' },
            { key: 'ads', label: 'Ads' },
            { key: 'notificationConfig', label: 'Notification Config' },
        ],
    },
    {
        title: 'Sensitive',
        accent: 'red',
        items: [
            { key: 'github', label: 'GitHub' },
            { key: 'contactMessages', label: 'Contact Messages' },
        ],
    },
    {
        title: 'Assets',
        accent: 'amber',
        items: [
            { key: '__images', label: 'Gallery Image Files' },
        ],
    },
];

const ALL_EXPORT_KEYS = EXPORT_SECTIONS.flatMap((s) => s.items.map((i) => i.key));

const ACCENT_TEXT = {
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
};

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
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    // Every collection selected by default (a full backup).
    const [selection, setSelection] = useState(() =>
        Object.fromEntries(ALL_EXPORT_KEYS.map((k) => [k, true]))
    );

    // Google Drive state
    const [gdriveStatus, setGdriveStatus] = useState(null);
    const [gdriveFiles, setGdriveFiles] = useState([]);
    const [showGDriveModal, setShowGDriveModal] = useState(false);
    const [gdriveConfigForm, setGdriveConfigForm] = useState({ clientId: '', clientSecret: '' });
    const [gdriveLoading, setGdriveLoading] = useState(false);
    const [showDriveHistory, setShowDriveHistory] = useState(false);
    const [expandedGuideStep, setExpandedGuideStep] = useState(null);
    const [copiedCallback, setCopiedCallback] = useState(false);
    const [showClientSecret, setShowClientSecret] = useState(false);
    const [gdriveCron, setGdriveCron] = useState({
        enabled: false,
        schedule: '0 0 * * *',
        nextRun: null,
        cronId: null,
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
                });
            }
        } catch (err) {
            console.error('Failed to fetch GDrive config:', err);
        }
    }, []);

    const fetchGDriveCronStatus = useCallback(async () => {
        try {
            setGdriveCron((prev) => ({ ...prev, loading: true }));
            const res = await fetch('/api/admin/gdrive/cron');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setGdriveCron({
                        enabled: Boolean(data.enabled),
                        schedule: data.schedule || '0 0 * * *',
                        nextRun: data.nextRun || null,
                        cronId: data.cronId || null,
                        loading: false,
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch GDrive cron status:', err);
        } finally {
            setGdriveCron((prev) => ({ ...prev, loading: false }));
        }
    }, []);

    useEffect(() => {
        fetchGDriveStatus();
        fetchGDriveConfig();
        fetchGDriveCronStatus();

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('gdrive') === 'connected') {
                setMessage({ type: 'success', text: 'GOOGLE_DRIVE_CONNECTED_SUCCESSFULLY' });
                window.history.replaceState({}, '', window.location.pathname);
            } else if (params.get('gdrive_error')) {
                const err = params.get('gdrive_error');
                setMessage({ type: 'error', text: `GOOGLE_DRIVE_ERROR: ${err}` });
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [fetchGDriveStatus, fetchGDriveConfig, fetchGDriveCronStatus]);

    const handleToggleGDriveCron = async () => {
        const nextState = !gdriveCron.enabled;
        try {
            setGdriveCron((prev) => ({ ...prev, loading: true }));
            const res = await fetch('/api/admin/gdrive/cron', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: nextState }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update automated backup schedule');
            }
            setGdriveCron({
                enabled: Boolean(data.enabled),
                schedule: data.schedule || '0 0 * * *',
                nextRun: data.nextRun || null,
                cronId: data.cronId || null,
                loading: false,
            });
            setMessage({
                type: 'success',
                text: nextState ? 'AUTOMATED_DAILY_BACKUP_ENABLED' : 'AUTOMATED_DAILY_BACKUP_DISABLED',
            });
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
            setGdriveCron((prev) => ({ ...prev, loading: false }));
        }
    };

    const toggleKey = (key) =>
        setSelection((prev) => ({ ...prev, [key]: !prev[key] }));

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
            setMessage({ type: 'success', text: 'GOOGLE_DRIVE_CONFIG_SAVED' });
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
        if (!(await confirm({
            title: 'Disconnect Google Drive?',
            message: 'Are you sure you want to disconnect Google Drive? Automatic & cloud backups will be disabled until reconnected.',
            confirmText: 'Disconnect',
            danger: true,
        }))) {
            return;
        }

        try {
            setIsLoading(true);
            const res = await fetch('/api/admin/gdrive/disconnect', { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to disconnect Google Drive');
            }
            setMessage({ type: 'success', text: 'GOOGLE_DRIVE_DISCONNECTED' });
            setGdriveFiles([]);
            fetchGDriveStatus();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGDriveBackup = async (dbKeysOverride) => {
        const dbKeys = dbKeysOverride || ALL_EXPORT_KEYS.filter((k) => k !== '__images' && selection[k]);
        if (dbKeys.length === 0 && !selection.__images) {
            setMessage({ type: 'error', text: 'NOTHING_SELECTED' });
            return;
        }

        try {
            setShowExportModal(false);
            setIsLoading(true);
            setMessage({ type: 'info', text: 'UPLOADING_BACKUP_TO_GOOGLE_DRIVE...' });

            const queryParams = new URLSearchParams();
            if (dbKeys.length > 0) queryParams.append('collections', dbKeys.join(','));
            if (!selection.__images) queryParams.append('includeImages', 'false');

            const res = await fetch(`/api/admin/gdrive/backup?${queryParams.toString()}`, {
                method: 'POST',
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'GOOGLE_DRIVE_BACKUP_FAILED');
            }

            setMessage({ type: 'success', text: 'BACKUP_SAVED_TO_GOOGLE_DRIVE_SUCCESSFULLY' });
            fetchGDriveFiles();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGDriveRestore = async (fileId, filename) => {
        if (!(await confirm({
            title: 'Restore Backup from Google Drive?',
            message: `WARNING: Overwrite ALL system data using backup file "${filename}"? This action cannot be undone.`,
            confirmText: 'Execute Restore',
            danger: true,
        }))) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'DOWNLOADING_AND_RESTORING_FROM_GOOGLE_DRIVE...' });

            const res = await fetch('/api/admin/gdrive/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'RESTORE_FROM_GOOGLE_DRIVE_FAILED');
            }

            setMessage({ type: 'success', text: 'SYSTEM_RESTORED_FROM_GOOGLE_DRIVE. REBOOTING_INTERFACE...' });
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGDriveDelete = async (fileId, filename) => {
        if (!(await confirm({
            title: 'Delete Google Drive Backup?',
            message: `Are you sure you want to permanently delete "${filename}" from Google Drive?`,
            confirmText: 'Delete File',
            danger: true,
        }))) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'DELETING_FILE_FROM_GOOGLE_DRIVE...' });

            const res = await fetch('/api/admin/gdrive/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'DELETE_GOOGLE_DRIVE_FILE_FAILED');
            }

            setMessage({ type: 'success', text: 'FILE_DELETED_FROM_GOOGLE_DRIVE' });
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
            setMessage({ type: 'error', text: 'NOTHING_SELECTED' });
            return;
        }

        try {
            setShowExportModal(false);
            setIsLoading(true);
            setMessage({ type: 'info', text: 'GENERATING_ZIP_ARCHIVE...' });

            const queryParams = new URLSearchParams();
            queryParams.append('collections', dbKeys.join(','));
            if (!selection.__images) queryParams.append('includeImages', 'false');

            const response = await fetch(`/api/admin/export?${queryParams.toString()}`);

            if (!response.ok) {
                let errorMsg = 'EXPORT_FAILED';
                try {
                    const error = await response.json();
                    errorMsg = error.error || errorMsg;
                } catch { /* response might not be JSON */ }
                throw new Error(errorMsg);
            }

            // Download ZIP blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Format: backup_YYYY-MM-DD_HH-mm-ss.zip
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            a.download = `backup_${dateStr}_${timeStr}.zip`;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setMessage({ type: 'success', text: 'ZIP_ARCHIVE_CREATED_SUCCESSFULLY' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!importFile) {
            setMessage({ type: 'error', text: 'NO_FILE_DETECTED' });
            return;
        }

        if (!(await confirm({
            title: 'Overwrite all system data?',
            message: 'WARNING: This action will overwrite ALL system data with the imported backup. This cannot be undone.',
            confirmText: 'Overwrite',
            danger: true,
        }))) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'OVERWRITING_SYSTEM_DATA...' });

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
                    throw new Error('BACKUP_FILE_TOO_LARGE_FOR_SERVER_LIMIT');
                }
                throw new Error(result?.error || 'IMPORT_FAILED');
            }

            setMessage({ type: 'success', text: 'SYSTEM_RESTORED. REBOOTING_INTERFACE...' });

            // Reset form and reload page
            setImportFile(null);
            setTimeout(() => window.location.reload(), 2000);

        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetAnalytics = async () => {
        if (!(await confirm({
            title: 'Delete all analytics data?',
            message: 'WARNING: This will permanently delete ALL analytics data. This action cannot be undone.',
            confirmText: 'Delete everything',
            danger: true,
        }))) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'PURGING_ANALYTICS_DATA...' });

            const response = await fetch('/api/admin/analytics', { method: 'DELETE' });
            const result = await response.json();

            if (!response.ok || !result?.success) {
                throw new Error(result?.error || 'ANALYTICS_RESET_FAILED');
            }

            setMessage({ type: 'success', text: 'ANALYTICS_DATA_PURGED_SUCCESSFULLY' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurgeCache = async () => {
        if (!(await confirm({
            title: 'Purge all caches?',
            message: 'WARNING: This will purge all in-memory caches.',
            confirmText: 'Purge',
            danger: true,
        }))) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'PURGING_CACHE_SYSTEM...' });

            const response = await fetch('/api/admin/purge-cache', {
                method: 'POST',
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'PURGE_FAILED');
            }

            setMessage({ type: 'success', text: 'CACHE_PURGED_SUCCESSFULLY' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
                        <FaDatabase className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">Data Integrity</h1>
                        <p className="text-slate-400">Manage system backups, cloud sync, exports, and restoration protocols.</p>
                    </div>
                </div>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl mb-8 flex items-center gap-3 border backdrop-blur-md ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}
                >
                    {message.type === 'error' && <FaExclamationTriangle />}
                    {message.type === 'success' && <FaCheckCircle />}
                    <span className="font-mono text-sm tracking-wide">{message.text}</span>
                </motion.div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Export Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden group flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <FaDownload className="text-amber-500/70" size={20} />
                            <h2 className="text-sm font-mono text-amber-500/70 uppercase tracking-widest">System Backup</h2>
                        </div>

                        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                            Generate a ZIP archive of the system state. Choose exactly which collections — including AI usage history — and gallery assets to include.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <button
                            onClick={() => setShowExportModal(true)}
                            disabled={isLoading}
                            className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed group/btn font-mono"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">PROCESSING...</span>
                            ) : (
                                <>
                                    <FaServer className="group-hover/btn:scale-110 transition-transform" />
                                    CONFIGURE_DUMP
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Import Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden group flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <FaUpload className="text-cyan-500/70" size={20} />
                            <h2 className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest">System Restore</h2>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg mb-6 flex gap-3 items-start">
                            <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" size={14} />
                            <p className="text-red-400/80 text-xs leading-relaxed font-mono">
                                CRITICAL WARNING: Import sequence will perform a hard reset. All existing data will be overwritten permanently.
                            </p>
                        </div>

                        <form onSubmit={handleImport} className="space-y-4">
                            <label className="block w-full cursor-pointer group/file">
                                <input
                                    type="file"
                                    accept=".zip,.json"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className="hidden"
                                />
                                <div className={`w-full p-4 rounded-xl border border-dashed transition-all flex items-center justify-center gap-3 text-sm font-mono ${importFile
                                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                                    : 'bg-slate-900/30 border-white/10 group-hover/file:border-cyan-500/30 text-slate-500 group-hover/file:text-cyan-400'
                                    }`}>
                                    {importFile ? (
                                        <>
                                            <FaCheckCircle />
                                            {importFile.name}
                                        </>
                                    ) : (
                                        'SELECT_BACKUP_FILE (.ZIP or .JSON)'
                                    )}
                                </div>
                            </label>

                            <button
                                type="submit"
                                disabled={isLoading || !importFile}
                                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] font-mono"
                            >
                                {isLoading ? 'OVERWRITING...' : 'EXECUTE_RESTORE'}
                            </button>
                        </form>
                    </div>
                </motion.div>

                {/* Google Drive Cloud Integration Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 relative overflow-hidden group backdrop-blur-xl flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between gap-3 mb-6">
                            <div className="flex items-center gap-3">
                                <FaGoogle className="text-cyan-400" size={20} />
                                <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest">Google Drive</h2>
                            </div>
                            {gdriveStatus?.isConnected ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    CONNECTED
                                </span>
                            ) : gdriveStatus?.isConfigured ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    DISCONNECTED
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    NOT_CONFIGURED
                                </span>
                            )}
                        </div>

                        {gdriveStatus?.isConnected && gdriveStatus?.user ? (
                            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5 mb-4 flex items-center gap-3">
                                {gdriveStatus.user.picture ? (
                                    /* eslint-disable-next-html-element-for-img */
                                    <img
                                        src={gdriveStatus.user.picture}
                                        alt="Google User"
                                        className="w-9 h-9 rounded-full border border-cyan-500/30 object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
                                        <FaUserCheck />
                                    </div>
                                )}
                                <div className="min-w-0 overflow-hidden">
                                    <p className="text-white text-xs font-bold truncate">
                                        {gdriveStatus.user.name || 'Google Account'}
                                    </p>
                                    <p className="text-slate-400 text-[11px] font-mono truncate">
                                        {gdriveStatus.user.email}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 mb-4 text-sm leading-relaxed">
                                Store automated and on-demand database snapshots securely in your Google Drive cloud storage.
                            </p>
                        )}

                        {/* Dedicated Automated Backup Schedule (Cron) row */}
                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 mb-4 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <FaClock className="text-cyan-400" size={14} />
                                    <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                                        Automated Daily Schedule
                                    </span>
                                </div>
                                <Link
                                    href="/admin/config/crons"
                                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                                >
                                    [ ⏰ MANAGE IN CRON DASHBOARD ]
                                </Link>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                <div>
                                    <div className="text-xs font-mono text-slate-400">
                                        Schedule: <span className="text-slate-200 font-semibold">Daily at Midnight ({gdriveCron.schedule})</span>
                                    </div>
                                    {gdriveCron.enabled && gdriveCron.nextRun && (
                                        <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Next Run: {formatDate(gdriveCron.nextRun)}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleToggleGDriveCron}
                                    disabled={gdriveCron.loading || !gdriveStatus?.isConnected}
                                    title={!gdriveStatus?.isConnected ? 'Connect Google Drive to enable automated backups' : ''}
                                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 border ${
                                        gdriveCron.enabled
                                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                            : 'bg-slate-800/80 hover:bg-slate-800 border-white/10 text-slate-400 hover:text-slate-200'
                                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                                >
                                    {gdriveCron.loading ? (
                                        <FaSync className="animate-spin text-cyan-400" size={12} />
                                    ) : gdriveCron.enabled ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                            DISABLE_AUTOMATIC_BACKUP
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                                            ENABLE_AUTOMATIC_BACKUP
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-2 pt-2">
                        <button
                            onClick={() => handleGDriveBackup()}
                            disabled={isLoading || !gdriveStatus?.isConnected}
                            className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 font-mono font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <FaCloudUploadAlt size={14} />
                            BACKUP_TO_DRIVE
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    setShowDriveHistory(!showDriveHistory);
                                    if (!showDriveHistory && gdriveStatus?.isConnected) {
                                        fetchGDriveFiles();
                                    }
                                }}
                                disabled={!gdriveStatus?.isConnected}
                                className="w-full bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-mono font-bold py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FaHistory size={12} />
                                CLOUD_HISTORY
                            </button>

                            <button
                                onClick={() => {
                                    fetchGDriveConfig();
                                    setShowGDriveModal(true);
                                }}
                                className="w-full bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-mono font-bold py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider text-[11px]"
                            >
                                <FaCog size={12} />
                                API_SETTINGS
                            </button>
                        </div>

                        {gdriveStatus?.isConnected ? (
                            <button
                                onClick={handleDisconnectGDrive}
                                disabled={isLoading}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 font-mono font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-[11px] disabled:opacity-40"
                            >
                                <FaSignOutAlt size={12} />
                                DISCONNECT / SWITCH ACCOUNT
                            </button>
                        ) : (
                            <button
                                onClick={handleConnectGDrive}
                                disabled={isLoading || !gdriveStatus?.isConfigured}
                                className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-mono font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FaGoogle size={12} />
                                CONNECT_GOOGLE_DRIVE
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Purge Cache Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden group flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <FaTrash className="text-red-500/70" size={20} />
                            <h2 className="text-sm font-mono text-red-500/70 uppercase tracking-widest">Cache Purge</h2>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg mb-6 flex gap-3 items-start">
                            <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" size={14} />
                            <p className="text-red-400/80 text-xs leading-relaxed font-mono">
                                CRITICAL WARNING: Purge sequence will clear all in-memory cache entries. Website will refresh data on next request.
                            </p>
                        </div>

                        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                            Flush all cached data from in-memory storage. Use this when caches are stale or causing issues. Admin panel data will always be fresh regardless of cache state.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <button
                            onClick={handlePurgeCache}
                            disabled={isLoading}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed group/btn font-mono"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">FLUSHING...</span>
                            ) : (
                                <>
                                    <FaTrash className="group-hover/btn:scale-110 transition-transform" />
                                    PURGE_ALL_CACHES
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Reset Analytics Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden group flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <FaChartLine className="text-purple-500/70" size={20} />
                            <h2 className="text-sm font-mono text-purple-500/70 uppercase tracking-widest">Analytics Reset</h2>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg mb-6 flex gap-3 items-start">
                            <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" size={14} />
                            <p className="text-red-400/80 text-xs leading-relaxed font-mono">
                                CRITICAL WARNING: This permanently deletes all recorded analytics events and rollups. Backups include analytics data.
                            </p>
                        </div>

                        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                            Purge all first-party analytics (page views, content views, clicks, conversions). Other site data is untouched.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <button
                            onClick={handleResetAnalytics}
                            disabled={isLoading}
                            className="w-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed group/btn font-mono"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">PURGING...</span>
                            ) : (
                                <>
                                    <FaTrash className="group-hover/btn:scale-110 transition-transform" />
                                    RESET_ANALYTICS
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Google Drive History Drawer */}
            <AnimatePresence>
                {showDriveHistory && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <FaFolder className="text-cyan-400" size={20} />
                                <h3 className="text-lg font-bold text-white tracking-tight">Google Drive Backups History</h3>
                                <span className="text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2.5 py-0.5 rounded-full">
                                    {gdriveFiles.length} {gdriveFiles.length === 1 ? 'FILE' : 'FILES'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchGDriveFiles}
                                    disabled={gdriveLoading}
                                    className="p-2 text-slate-400 hover:text-cyan-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs flex items-center gap-1.5 font-mono"
                                    title="Refresh file list"
                                >
                                    <FaSync className={gdriveLoading ? 'animate-spin' : ''} />
                                    REFRESH
                                </button>
                                <button
                                    onClick={() => setShowDriveHistory(false)}
                                    className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                    aria-label="Close history drawer"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        {gdriveLoading && gdriveFiles.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 font-mono text-sm">
                                <FaSync className="animate-spin text-cyan-400 mx-auto mb-3" size={24} />
                                FETCHING_GOOGLE_DRIVE_BACKUPS...
                            </div>
                        ) : gdriveFiles.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 font-mono text-sm border border-dashed border-white/10 rounded-xl">
                                NO_CLOUD_BACKUPS_FOUND_ON_GOOGLE_DRIVE
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 text-slate-400 font-mono text-xs uppercase tracking-wider">
                                            <th className="pb-3 px-3">Filename</th>
                                            <th className="pb-3 px-3">Size</th>
                                            <th className="pb-3 px-3">Created At</th>
                                            <th className="pb-3 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {gdriveFiles.map((file) => (
                                            <tr key={file.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 px-3 font-mono text-xs text-cyan-300 font-medium max-w-xs truncate" title={file.name}>
                                                    {file.name}
                                                </td>
                                                <td className="py-3 px-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                                                    {formatBytes(file.size)}
                                                </td>
                                                <td className="py-3 px-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                                                    {formatDate(file.createdTime)}
                                                </td>
                                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleGDriveRestore(file.id, file.name)}
                                                            disabled={isLoading}
                                                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 uppercase"
                                                        >
                                                            <FaUpload size={10} />
                                                            RESTORE
                                                        </button>
                                                        <button
                                                            onClick={() => handleGDriveDelete(file.id, file.name)}
                                                            disabled={isLoading}
                                                            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 uppercase"
                                                        >
                                                            <FaTrash size={10} />
                                                            DELETE
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dynamic API Settings & Documentation Modal */}
            <AnimatePresence>
                {showGDriveModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        onClick={() => setShowGDriveModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                            className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between gap-4 p-6 border-b border-white/10 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                                        <FaGoogle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">Google Drive API Settings & Setup Guide</h3>
                                        <p className="text-slate-400 text-xs font-mono">
                                            Configure OAuth 2.0 Credentials for Cloud Backups
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowGDriveModal(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    aria-label="Close modal"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto p-6 space-y-6">
                                {/* Credentials Form */}
                                <form onSubmit={handleSaveGDriveConfig} className="space-y-4 bg-slate-950/60 p-5 rounded-xl border border-white/5">
                                    <h4 className="text-sm font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-2">
                                        <FaKey /> OAuth 2.0 Credentials
                                    </h4>

                                    <div>
                                        <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">
                                            Google Client ID
                                        </label>
                                        <input
                                            type="text"
                                            value={gdriveConfigForm.clientId}
                                            onChange={(e) => setGdriveConfigForm((prev) => ({ ...prev, clientId: e.target.value }))}
                                            placeholder="123456789-xxxx.apps.googleusercontent.com"
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">
                                            Google Client Secret
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showClientSecret ? 'text' : 'password'}
                                                value={gdriveConfigForm.clientSecret}
                                                onChange={(e) => setGdriveConfigForm((prev) => ({ ...prev, clientSecret: e.target.value }))}
                                                placeholder={gdriveStatus?.isConfigured ? '•••••••••••••••• (Leave blank to keep existing)' : 'GOCSPX-xxxx...'}
                                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowClientSecret(!showClientSecret)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                            >
                                                {showClientSecret ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dynamic Redirect URL Box */}
                                    <div className="pt-2">
                                        <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">
                                            Authorized Redirect URI (Required for Google Console)
                                        </label>
                                        <div className="flex items-center gap-2 bg-slate-900 border border-cyan-500/30 rounded-xl p-2.5">
                                            <span className="font-mono text-xs text-cyan-300 truncate flex-1 select-all">
                                                {typeof window !== 'undefined' ? `${window.location.origin}/api/admin/gdrive/callback` : '/api/admin/gdrive/callback'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const callbackUrl = `${window.location.origin}/api/admin/gdrive/callback`;
                                                    navigator.clipboard.writeText(callbackUrl);
                                                    setCopiedCallback(true);
                                                    setTimeout(() => setCopiedCallback(false), 2000);
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0"
                                            >
                                                {copiedCallback ? (
                                                    <>
                                                        <FaCheck className="text-emerald-400" />
                                                        COPIED!
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaCopy />
                                                        COPY_URL
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 font-mono text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50"
                                        >
                                            <FaCheck />
                                            SAVE_CREDENTIALS
                                        </button>

                                        {gdriveStatus?.isConfigured && !gdriveStatus?.isConnected && (
                                            <button
                                                type="button"
                                                onClick={handleConnectGDrive}
                                                className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 font-mono text-xs uppercase tracking-wider"
                                            >
                                                <FaExternalLinkAlt />
                                                AUTHORIZE_GOOGLE_ACCOUNT
                                            </button>
                                        )}
                                    </div>
                                </form>

                                {/* Step-by-Step Setup Guide Accordion */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-mono text-slate-300 uppercase tracking-wider font-bold flex items-center gap-2">
                                        <FaFolder className="text-amber-400" /> Interactive Setup Guide (Step-by-Step)
                                    </h4>

                                    {[
                                        {
                                            step: 1,
                                            title: 'Step 1: Create a Google Cloud Project',
                                            content: (
                                                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                                                    <p>1. Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-1">Google Cloud Console <FaExternalLinkAlt size={10} /></a>.</p>
                                                    <p>2. Click on the project dropdown at the top navigation bar and select <strong>New Project</strong>.</p>
                                                    <p>3. Give your project a name (e.g., <code>Aiyu-Cloud-Backup</code>) and click <strong>Create</strong>.</p>
                                                </div>
                                            ),
                                        },
                                        {
                                            step: 2,
                                            title: 'Step 2: Enable the Google Drive API',
                                            content: (
                                                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                                                    <p>1. In the Google Cloud sidebar, navigate to <strong>APIs & Services &gt; Library</strong>.</p>
                                                    <p>2. Search for <strong>Google Drive API</strong> in the search bar.</p>
                                                    <p>3. Select Google Drive API and click <strong>Enable</strong>.</p>
                                                </div>
                                            ),
                                        },
                                        {
                                            step: 3,
                                            title: 'Step 3: Configure the OAuth Consent Screen',
                                            content: (
                                                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                                                    <p>1. Navigate to <strong>APIs & Services &gt; OAuth consent screen</strong>.</p>
                                                    <p>2. Choose <strong>External</strong> User Type and click <strong>Create</strong>.</p>
                                                    <p>3. Fill in App Name (e.g. <code>Aiyu Backup System</code>) and User Support Email.</p>
                                                    <p>4. Under Scopes, add <code>https://www.googleapis.com/auth/drive.file</code> (Per-file access permission).</p>
                                                </div>
                                            ),
                                        },
                                        {
                                            step: 4,
                                            title: 'Step 4: Create OAuth 2.0 Web Client Credentials',
                                            content: (
                                                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                                                    <p>1. Go to <strong>APIs & Services &gt; Credentials</strong>.</p>
                                                    <p>2. Click <strong>Create Credentials</strong> at the top and choose <strong>OAuth client ID</strong>.</p>
                                                    <p>3. Select Application type: <strong>Web application</strong>.</p>
                                                    <p>4. Under <strong>Authorized redirect URIs</strong>, click <strong>ADD URI</strong> and paste the exact Redirect URL shown above:</p>
                                                    <code className="block p-2 bg-slate-950 rounded text-cyan-300 font-mono text-[11px] select-all">
                                                        {typeof window !== 'undefined' ? `${window.location.origin}/api/admin/gdrive/callback` : '/api/admin/gdrive/callback'}
                                                    </code>
                                                    <p>5. Click <strong>Create</strong> to generate your Client ID and Client Secret.</p>
                                                </div>
                                            ),
                                        },
                                        {
                                            step: 5,
                                            title: 'Step 5: Add Test User & Save Credentials',
                                            content: (
                                                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                                                    <p>1. Go back to <strong>OAuth consent screen &gt; Test users</strong>.</p>
                                                    <p>2. Click <strong>Add Users</strong> and enter the Google Account email you wish to authorize.</p>
                                                    <p>3. Copy the Client ID and Client Secret from Google Cloud Console into the inputs in this modal above, then click <strong>SAVE_CREDENTIALS</strong>.</p>
                                                    <p>4. Click <strong>AUTHORIZE_GOOGLE_ACCOUNT</strong> to complete the OAuth handshake!</p>
                                                </div>
                                            ),
                                        },
                                    ].map((guide) => (
                                        <div key={guide.step} className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedGuideStep(expandedGuideStep === guide.step ? null : guide.step)}
                                                className="w-full p-3.5 flex items-center justify-between text-left font-mono text-xs font-bold text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
                                            >
                                                <span>{guide.title}</span>
                                                {expandedGuideStep === guide.step ? <FaChevronUp className="text-cyan-400" /> : <FaChevronDown className="text-slate-400" />}
                                            </button>
                                            {expandedGuideStep === guide.step && (
                                                <div className="p-4 pt-2 border-t border-white/5 bg-slate-950/80">
                                                    {guide.content}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end p-5 border-t border-white/10 shrink-0">
                                <button
                                    onClick={() => setShowGDriveModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Export selection popup */}
            <AnimatePresence>
                {showExportModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowExportModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                            className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between gap-4 p-5 border-b border-white/10 shrink-0">
                                <div className="flex items-center gap-3">
                                    <FaDownload className="text-amber-500/80" size={18} />
                                    <div>
                                        <h3 className="text-white font-bold tracking-tight">Configure Backup</h3>
                                        <p className="text-slate-400 text-xs font-mono">
                                            {selectedCount} / {ALL_EXPORT_KEYS.length} SELECTED
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    aria-label="Close"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Bulk actions */}
                            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 shrink-0">
                                <button
                                    onClick={() => setAll(true)}
                                    className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                                >
                                    Select all
                                </button>
                                <button
                                    onClick={() => setAll(false)}
                                    className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                                >
                                    Deselect all
                                </button>
                            </div>

                            {/* Sections */}
                            <div className="overflow-y-auto p-5 space-y-5">
                                {EXPORT_SECTIONS.map((section) => {
                                    const total = section.items.length;
                                    const checked = section.items.filter((i) => selection[i.key]).length;
                                    const allOn = checked === total;
                                    return (
                                        <div key={section.title}>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className={`text-xs font-mono uppercase tracking-widest ${ACCENT_TEXT[section.accent]}`}>
                                                    {section.title}
                                                </h4>
                                                <button
                                                    onClick={() => toggleSection(section.items, !allOn)}
                                                    className="text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                                                >
                                                    {allOn ? 'Clear' : 'All'}
                                                </button>
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-2">
                                                {section.items.map((item) => {
                                                    const on = !!selection[item.key];
                                                    return (
                                                        <label
                                                            key={item.key}
                                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${on
                                                                ? 'bg-white/5 border-white/15 text-white'
                                                                : 'bg-transparent border-white/5 text-slate-500 hover:border-white/10'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={on}
                                                                onChange={() => toggleKey(item.key)}
                                                                className="accent-amber-500 w-4 h-4 shrink-0"
                                                            />
                                                            <span className="leading-tight">{item.label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between gap-3 p-5 border-t border-white/10 shrink-0">
                                <div>
                                    <button
                                        onClick={() => handleGDriveBackup(ALL_EXPORT_KEYS.filter((k) => k !== '__images' && selection[k]))}
                                        disabled={selectedCount === 0 || isLoading || !gdriveStatus?.isConnected}
                                        className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider text-xs disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                                        title={!gdriveStatus?.isConnected ? 'Google Drive must be connected first' : ''}
                                    >
                                        <FaCloudUploadAlt />
                                        ☁️ BACKUP_TO_GOOGLE_DRIVE
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowExportModal(false)}
                                        className="px-4 py-2.5 rounded-xl text-sm font-mono uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        disabled={selectedCount === 0 || isLoading}
                                        className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-3 uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                                    >
                                        <FaServer />
                                        Initiate dump
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

