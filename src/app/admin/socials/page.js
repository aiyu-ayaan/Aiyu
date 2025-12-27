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
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Communication Grid</h1>
                        <p className="text-slate-400">Configure footer metrics and external communication uplinks.</p>
                    </div>
                    <Link href="/admin/socials/new" className="group relative px-6 py-3 rounded-lg overflow-hidden bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        <span className="relative text-cyan-400 font-bold tracking-wide flex items-center gap-2">
                            <span className="text-lg">+</span> ESTABLISH_UPLINK
                        </span>
                    </Link>
                </div>
            </div>

            {/* Config Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

                <h2 className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Global Footer Protocols
                    <div className="h-px bg-cyan-500/10 flex-grow" />
                </h2>

                <form onSubmit={handleConfigSubmit} className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Copyright Signature</label>
                            <input
                                type="text"
                                value={config.footerText}
                                onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                placeholder="© 2025 Ayaan. All rights reserved."
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Operation Status</label>
                            <input
                                type="text"
                                value={config.workStatus}
                                onChange={(e) => setConfig({ ...config, workStatus: e.target.value })}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                placeholder="Available for work"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">System Version Identifier</label>
                            <input
                                type="text"
                                value={config.footerVersion || ''}
                                onChange={(e) => setConfig({ ...config, footerVersion: e.target.value })}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                placeholder="v1.0.0"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/5 w-fit">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={config.showWorkStatus}
                                onChange={(e) => setConfig({ ...config, showWorkStatus: e.target.checked })}
                                className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-600 bg-slate-900/50 checked:border-cyan-500 checked:bg-cyan-500 transition-all"
                                id="showWorkStatus"
                            />
                            <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-0 peer-checked:opacity-100 text-black transition-opacity" viewBox="0 0 14 14" fill="none">
                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <label htmlFor="showWorkStatus" className="text-slate-300 cursor-pointer text-sm font-medium">Display Operational Status Indicator</label>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/5">
                        <button type="submit" className="px-6 py-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-all text-sm font-bold tracking-wide uppercase">
                            Commit Changes
                        </button>
                    </div>
                </form>
            </div>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-cyan-500 rounded-full" />
                Active Uplinks
            </h2>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400 font-medium">
                            <tr>
                                <th className="px-6 py-5">Network Name</th>
                                <th className="px-6 py-5">Target URL</th>
                                <th className="px-6 py-5">Icon Identifier</th>
                                <th className="px-6 py-5 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {socials.map((social) => (
                                <tr key={social._id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-5 font-medium text-slate-200">
                                        <div className="flex items-center gap-3">
                                            {social.name}
                                            {social.isHidden && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/20 uppercase tracking-widest">
                                                    Offline
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-cyan-400/80 font-mono text-xs truncate max-w-xs">{social.url}</td>
                                    <td className="px-6 py-5 text-slate-500 font-mono text-xs">{social.iconName}</td>
                                    <td className="px-6 py-5 text-right space-x-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleToggleVisibility(social._id, social.isHidden)}
                                            className={`${social.isHidden ? 'text-slate-400 hover:text-slate-200' : 'text-amber-400 hover:text-amber-300'} transition-colors text-xs uppercase font-bold tracking-wider`}
                                        >
                                            {social.isHidden ? 'Enable' : 'Disable'}
                                        </button>
                                        <Link href={`/admin/socials/${social._id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors text-xs uppercase font-bold tracking-wider">
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(social._id)}
                                            className="text-red-400 hover:text-red-300 transition-colors text-xs uppercase font-bold tracking-wider"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
