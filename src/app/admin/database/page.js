"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaDownload, FaUpload, FaDatabase, FaExclamationTriangle, FaCheckCircle, FaServer } from 'react-icons/fa';

export default function DatabaseManager() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [importFile, setImportFile] = useState(null);

    const handleExport = async () => {
        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'INITIATING_DUMP_SEQUENCE...' });

            // Always include Github and Contact data by default
            const queryParams = new URLSearchParams();
            queryParams.append('includeGithub', 'true');
            queryParams.append('includeContact', 'true');

            const response = await fetch(`/api/admin/export?${queryParams.toString()}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'EXPORT_FAILED');
            }

            const data = await response.json();

            // Create blob and download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Format: database_backup_YYYY-MM-DD_HH-mm-ss.json
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            a.download = `database_backup_${dateStr}_${timeStr}.json`;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setMessage({ type: 'success', text: 'ARCHIVE_CREATED_SUCCESSFULLY' });
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

        if (!window.confirm('WARNING: THIS ACTION WILL OVERWRITE ALL SYSTEM DATA. CONFIRM PROTOCOL?')) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'OVERWRITING_SYSTEM_DATA...' });

            const fileContent = await importFile.text();
            let jsonData;
            try {
                jsonData = JSON.parse(fileContent);
            } catch (err) {
                throw new Error('INVALID_JSON_STRUCTURE');
            }

            const response = await fetch('/api/admin/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'IMPORT_FAILED');
            }

            setMessage({ type: 'success', text: 'SYSTEM_RESTORED. REBOOTING_INTERFACE...' });

            // Optional: reset form or reload page
            setImportFile(null);
            setTimeout(() => window.location.reload(), 2000);

        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
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

            <div className="grid md:grid-cols-2 gap-8">
                {/* Export Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <FaDownload className="text-amber-500/70" size={20} />
                            <h2 className="text-sm font-mono text-amber-500/70 uppercase tracking-widest">System Backup</h2>
                        </div>

                        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                            Generate a full JSON dump of current system state. Includes blogs, projects, configurations, terminal settings, and communication logs. Gallery assets are excluded.
                        </p>

                        <button
                            onClick={handleExport}
                            disabled={isLoading}
                            className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">PROCESSING...</span>
                            ) : (
                                <>
                                    <FaServer className="group-hover/btn:scale-110 transition-transform" />
                                    INITIATE_DUMP
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Import Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10 relative overflow-hidden group"
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
                                    accept=".json"
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
                                        'SELECT_SOURCE_FILE.JSON'
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
            </div>
        </div>
    );
}
