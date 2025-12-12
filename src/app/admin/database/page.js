"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaDownload, FaUpload, FaDatabase, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

export default function DatabaseManager() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [importFile, setImportFile] = useState(null);

    const handleExport = async () => {
        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'Preparing export...' });

            const response = await fetch('/api/admin/export');

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Export failed');
            }

            const data = await response.json();

            // Create blob and download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `database_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setMessage({ type: 'success', text: 'Database exported successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!importFile) {
            setMessage({ type: 'error', text: 'Please select a file to import' });
            return;
        }

        if (!window.confirm('WARNING: This will explicitly REPLACE all existing data with the imported data. This action cannot be undone. Are you sure?')) {
            return;
        }

        try {
            setIsLoading(true);
            setMessage({ type: 'info', text: 'Importing data... This may take a moment.' });

            const fileContent = await importFile.text();
            let jsonData;
            try {
                jsonData = JSON.parse(fileContent);
            } catch (err) {
                throw new Error('Invalid JSON file');
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
                throw new Error(result.error || 'Import failed');
            }

            setMessage({ type: 'success', text: 'Database imported successfully! Refreshing...' });

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
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                    ← Back to Dashboard
                </Link>
            </div>

            <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                <FaDatabase className="text-yellow-500" />
                Database Management
            </h1>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${message.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-700' :
                        message.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-700' :
                            'bg-blue-900/50 text-blue-200 border border-blue-700'
                        }`}
                >
                    {message.type === 'error' && <FaExclamationTriangle />}
                    {message.type === 'success' && <FaCheckCircle />}
                    {message.text}
                </motion.div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* Export Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gray-800 p-6 rounded-xl border border-gray-700"
                >
                    <div className="flex items-center gap-3 mb-4 text-yellow-500">
                        <FaDownload size={24} />
                        <h2 className="text-xl font-bold text-white">Export Database</h2>
                    </div>
                    <p className="text-gray-400 mb-6">
                        Download a complete JSON backup of all your content, including blogs, projects, and configurations.
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Processing...' : (
                            <>
                                <FaDownload /> Download Backup
                            </>
                        )}
                    </button>
                </motion.div>

                {/* Import Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gray-800 p-6 rounded-xl border border-gray-700"
                >
                    <div className="flex items-center gap-3 mb-4 text-cyan-500">
                        <FaUpload size={24} />
                        <h2 className="text-xl font-bold text-white">Import Database</h2>
                    </div>
                    <div className="bg-yellow-900/30 border border-yellow-700/50 p-4 rounded-lg mb-6">
                        <p className="text-yellow-200 text-sm flex gap-2">
                            <FaExclamationTriangle className="flex-shrink-0 mt-1" />
                            Warning: Importing will completely replace all existing data with the data from the file.
                        </p>
                    </div>
                    <form onSubmit={handleImport} className="space-y-4">
                        <input
                            type="file"
                            accept=".json"
                            onChange={(e) => setImportFile(e.target.files[0])}
                            className="w-full text-sm text-gray-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-gray-700 file:text-white
                                hover:file:bg-gray-600
                                cursor-pointer"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !importFile}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Processing...' : (
                                <>
                                    <FaUpload /> Restore Database
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
