"use client";
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDownload, FaUpload, FaDatabase, FaExclamationTriangle, FaCheckCircle, FaServer, FaTrash, FaChartLine, FaTimes } from 'react-icons/fa';
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

    const selectedCount = useMemo(
        () => ALL_EXPORT_KEYS.filter((k) => selection[k]).length,
        [selection]
    );

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
                        <p className="text-slate-400">Manage system backups, exports, and restoration protocols.</p>
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

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8">
                {/* Export Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900/50 backdrop-blur-xl p-4 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden group"
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

                        <button
                            onClick={() => setShowExportModal(true)}
                            disabled={isLoading}
                            className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed group/btn"
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
                    className="bg-slate-900/50 backdrop-blur-xl p-4 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden group"
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
                                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                            >
                                {isLoading ? 'OVERWRITING...' : 'EXECUTE_RESTORE'}
                            </button>
                        </form>
                    </div>
                </motion.div>

                {/* Purge Cache Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900/50 backdrop-blur-xl p-4 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden group"
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

                        <button
                            onClick={handlePurgeCache}
                            disabled={isLoading}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed group/btn"
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
                    className="bg-slate-900/50 backdrop-blur-xl p-4 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden group"
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

                        <button
                            onClick={handleResetAnalytics}
                            disabled={isLoading}
                            className="w-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed group/btn"
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
                            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 shrink-0">
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-mono uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={selectedCount === 0}
                                    className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-3 uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <FaServer />
                                    Initiate dump
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
