"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminSocials() {
    const [socials, setSocials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState({
        footerText: '',
        workStatus: '',
        showWorkStatus: true,
        footerVersion: ''
    });

    useEffect(() => {
        fetchSocials();
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data) {
                setConfig({
                    footerText: data.footerText || '',
                    workStatus: data.workStatus || '',
                    showWorkStatus: data.showWorkStatus ?? true,
                    footerVersion: data.footerVersion || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch config', error);
        }
    };

    const fetchSocials = async () => {
        try {
            const res = await fetch('/api/socials');
            const data = await res.json();
            setSocials(data);
        } catch (error) {
            console.error('Failed to fetch socials', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                alert('Footer configuration updated!');
            } else {
                alert('Failed to update config');
            }
        } catch (error) {
            console.error('Error updating config', error);
        }
    };

    const handleToggleVisibility = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/socials/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isHidden: !currentStatus }),
            });
            if (res.ok) {
                setSocials(socials.map((s) => (s._id === id ? { ...s, isHidden: !currentStatus } : s)));
            } else {
                alert('Failed to update visibility');
            }
        } catch (error) {
            console.error('Error updating visibility', error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this social link?')) return;

        try {
            const res = await fetch(`/api/socials/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setSocials(socials.filter((s) => s._id !== id));
            } else {
                alert('Failed to delete social link');
            }
        } catch (error) {
            console.error('Error deleting social link', error);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="p-8">
            <div className="mb-6">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                    ← Back to Dashboard
                </Link>
            </div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Manage Footer</h1>
                <Link href="/admin/socials/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded transition-colors">
                    Add New Social
                </Link>
            </div>

            {/* Config Section */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Footer Configuration</h2>
                <form onSubmit={handleConfigSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm">Copyright Text</label>
                            <input
                                type="text"
                                value={config.footerText}
                                onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                placeholder="© 2025 Ayaan. All rights reserved."
                            />

                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm">Work Status Text</label>
                            <input
                                type="text"
                                value={config.workStatus}
                                onChange={(e) => setConfig({ ...config, workStatus: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                placeholder="Available for work"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm">Website Version</label>
                            <input
                                type="text"
                                value={config.footerVersion || ''}
                                onChange={(e) => setConfig({ ...config, footerVersion: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                placeholder="v1.0.0"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={config.showWorkStatus}
                            onChange={(e) => setConfig({ ...config, showWorkStatus: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-cyan-600 focus:ring-cyan-500"
                            id="showWorkStatus"
                        />
                        <label htmlFor="showWorkStatus" className="text-gray-300 cursor-pointer">Show Work Status Indicator</label>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded transition-colors">
                            Save Configuration
                        </button>
                    </div>
                </form>
            </div >

            <h2 className="text-xl font-bold text-white mb-4">Social Links</h2>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-gray-900 text-gray-100 uppercase text-sm font-semibold">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">URL</th>
                            <th className="px-6 py-4">Icon</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {socials.map((social) => (
                            <tr key={social._id} className="hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">
                                    {social.name}
                                    {social.isHidden && <span className="ml-2 text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded">Hidden</span>}
                                </td>
                                <td className="px-6 py-4 truncate max-w-xs">{social.url}</td>
                                <td className="px-6 py-4">{social.iconName}</td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    <button
                                        onClick={() => handleToggleVisibility(social._id, social.isHidden)}
                                        className={`${social.isHidden ? 'text-gray-500 hover:text-gray-400' : 'text-yellow-400 hover:text-yellow-300'} transition-colors`}
                                        title={social.isHidden ? "Unhide" : "Hide"}
                                    >
                                        {social.isHidden ? 'Turn On' : 'Turn Off'}
                                    </button>
                                    <Link href={`/admin/socials/${social._id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(social._id)}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div >
    );
}
