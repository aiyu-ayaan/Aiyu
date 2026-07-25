"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Monitor, Image as ImageIcon, Save, RefreshCw, ExternalLink, Check, Laptop, ShieldCheck } from 'lucide-react';
import Toast from '@/app/components/admin/Toast';

const PRESET_WALLPAPERS = [
    {
        name: 'Windows Bloom (Default)',
        url: 'https://images.unsplash.com/photo-1702539336564-b37d0f3276e7?q=80&w=2064&auto=format&fit=crop',
    },
    {
        name: 'Dark Nebula',
        url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2064&auto=format&fit=crop',
    },
    {
        name: 'Cyberpunk Neon',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2064&auto=format&fit=crop',
    },
    {
        name: 'Minimal Mountain',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2064&auto=format&fit=crop',
    },
    {
        name: 'Abstract Fluid',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2064&auto=format&fit=crop',
    },
];

export default function AdminDesktopPage() {
    const [wallpaper, setWallpaper] = useState('');
    const [deviceName, setDeviceName] = useState('AiyuOS');
    const [osVersion, setOsVersion] = useState('4.9.2');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, success = true) => {
        setToast({ message, success });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                setWallpaper(data.desktopWallpaper || '');
                setDeviceName(data.desktopDeviceName || 'AiyuOS');
                setOsVersion(data.desktopOsVersion || '4.9.2');
            }
        } catch (err) {
            console.error('Failed to load desktop config:', err);
            showToast('Failed to load desktop settings', false);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e?.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    desktopWallpaper: wallpaper.trim(),
                    desktopDeviceName: deviceName.trim(),
                    desktopOsVersion: osVersion.trim(),
                }),
            });

            if (res.ok) {
                showToast('Desktop settings saved successfully');
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.error || 'Failed to save desktop settings', false);
            }
        } catch (err) {
            console.error('Save error:', err);
            showToast('Network error while saving', false);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="font-mono text-cyan-400 animate-pulse">LOADING_DESKTOP_CONFIG...</span>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-4 font-mono text-sm tracking-wide"
                    >
                        ← BACK_TO_COMMAND_CENTER
                    </Link>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
                        <Monitor className="w-9 h-9 text-blue-400" /> Desktop Manager
                    </h1>
                    <p className="text-slate-400">
                        Configure the virtual Aiyu OS desktop wallpaper, device metadata, and desktop environment defaults.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/desktop"
                        target="_blank"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium text-sm"
                    >
                        <ExternalLink className="w-4 h-4" /> Launch Desktop
                    </Link>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] flex items-center gap-2 font-bold text-sm tracking-wide disabled:opacity-50"
                    >
                        {saving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        SAVE_DESKTOP
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Wallpaper Section */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Wallpaper Background</h2>
                                <p className="text-slate-400 text-xs">Custom background image URL or pick from presets.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                                    Custom Wallpaper Image URL
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={wallpaper}
                                        onChange={(e) => setWallpaper(e.target.value)}
                                        placeholder="https://images.unsplash.com/... or leave blank for default bloom"
                                        className="flex-1 bg-slate-950/80 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors"
                                    />
                                    {wallpaper && (
                                        <button
                                            type="button"
                                            onClick={() => setWallpaper('')}
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs rounded-xl border border-slate-700"
                                        >
                                            Reset Default
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                                    Quick Wallpaper Presets
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {PRESET_WALLPAPERS.map((preset) => {
                                        const isSelected = wallpaper === preset.url;
                                        return (
                                            <button
                                                key={preset.name}
                                                type="button"
                                                onClick={() => setWallpaper(preset.url)}
                                                className={`relative h-24 rounded-xl overflow-hidden border-2 text-left transition-all group ${
                                                    isSelected ? 'border-blue-400 ring-2 ring-blue-500/40' : 'border-slate-800 hover:border-slate-600'
                                                }`}
                                            >
                                                <div
                                                    className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-105"
                                                    style={{ backgroundImage: `url(${preset.url})` }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent p-2 flex flex-col justify-between">
                                                    {isSelected && (
                                                        <span className="self-end bg-blue-500 text-white p-1 rounded-full text-xs">
                                                            <Check className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                    <span className="mt-auto text-[11px] font-medium text-white truncate drop-shadow">
                                                        {preset.name}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Virtual System Info Section */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                                <Laptop className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Device Identity</h2>
                                <p className="text-slate-400 text-xs">Labels displayed in Settings app &amp; system properties.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                                    Virtual Device Name
                                </label>
                                <input
                                    type="text"
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                    placeholder="AiyuOS"
                                    className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                                    Virtual OS Version
                                </label>
                                <input
                                    type="text"
                                    value={osVersion}
                                    onChange={(e) => setOsVersion(e.target.value)}
                                    placeholder="4.9.2"
                                    className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Rail */}
                <div className="space-y-6">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Live Preview
                        </h3>

                        {/* Desktop Mockup Frame */}
                        <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl h-56 bg-slate-950 flex flex-col justify-between">
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                                style={
                                    wallpaper
                                        ? { backgroundImage: `url(${wallpaper})` }
                                        : { background: 'radial-gradient(140% 120% at 28% 18%, #58a6ff 0%, #2f7be0 28%, #1e4fb0 52%, #122a7a 74%, #0a1550 100%)' }
                                }
                            />
                            {/* Icons overlay */}
                            <div className="relative p-3 grid grid-cols-1 gap-2 w-16">
                                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center text-white text-[10px]">
                                    Explorer
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center text-white text-[10px]">
                                    Photos
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center text-white text-[10px]">
                                    GitHub
                                </div>
                            </div>
                            {/* Taskbar mockup */}
                            <div className="relative h-8 bg-[#eeeef2]/80 backdrop-blur dark:bg-[#26262b]/80 border-t border-white/10 flex items-center justify-center gap-2 px-3">
                                <div className="w-5 h-5 rounded bg-blue-500/80" />
                                <div className="w-5 h-5 rounded bg-amber-500/80" />
                                <div className="w-5 h-5 rounded bg-emerald-500/80" />
                            </div>
                        </div>

                        <div className="mt-4 space-y-2 text-xs text-slate-400">
                            <div className="flex justify-between border-b border-slate-800 py-1.5">
                                <span>Device Identity</span>
                                <span className="font-mono text-white">{deviceName || 'Default'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 py-1.5">
                                <span>OS Version</span>
                                <span className="font-mono text-white">{osVersion || 'Default'}</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span>Background Status</span>
                                <span className="font-mono text-cyan-400">
                                    {wallpaper ? 'Custom URL' : 'Default Bloom'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Toast notification={toast} onClose={() => setToast(null)} />
        </div>
    );
}
