"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaSave, FaTerminal, FaUndo } from 'react-icons/fa';
import Toast from './Toast';

export default function TerminalForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [formData, setFormData] = useState({
        username: 'guest',
        promptSymbol: '➜',
        welcomeMessage: '',
        showDate: true,
        showGitBranch: true,
        asciiArts: []
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data.terminal) {
                setFormData(data.terminal);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching config:', error);
            showToast('error', 'Failed to load configuration');
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAsciiChange = (index, field, value) => {
        const newArts = [...(formData.asciiArts || [])];
        if (!newArts[index]) newArts[index] = {};
        newArts[index][field] = value;
        setFormData(prev => ({ ...prev, asciiArts: newArts }));
    };

    const addAsciiArt = () => {
        setFormData(prev => ({
            ...prev,
            asciiArts: [...(prev.asciiArts || []), { name: '', art: '' }]
        }));
    };

    const removeAsciiArt = (index) => {
        const newArts = [...(formData.asciiArts || [])];
        newArts.splice(index, 1);
        setFormData(prev => ({ ...prev, asciiArts: newArts }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Need to update nested terminal object
            // First fetch current config to get other fields, or just send partial update if API supports it
            // Our API supports $set so we can send just the terminal object wrapped in "terminal" key

            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ terminal: formData })
            });

            if (res.ok) {
                showToast(true, 'Terminal configuration saved successfully');
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Error saving config:', error);
            showToast(false, 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const showToast = (success, message) => {
        setToast({ success, message });
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) return <div className="text-white">Loading...</div>;

    return (
        <>
            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
                onSubmit={handleSubmit}
            >
                {/* Visual Settings */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <h2 className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest mb-8 flex items-center gap-4 relative z-10">
                        Appearance
                        <div className="h-px bg-cyan-500/10 flex-grow" />
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-2">
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="guest"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                            />
                            <p className="text-xs text-slate-500 font-mono">{'// Displayed in whoami command'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Prompt Symbol</label>
                            <input
                                type="text"
                                name="promptSymbol"
                                value={formData.promptSymbol}
                                onChange={handleChange}
                                placeholder="➜"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* ASCII Art Config */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h2 className="text-sm font-mono text-emerald-500/70 uppercase tracking-widest flex items-center gap-4 flex-grow">
                            ASCII Art Collection
                            <div className="h-px bg-emerald-500/10 flex-grow" />
                        </h2>
                        <button
                            type="button"
                            onClick={addAsciiArt}
                            className="ml-4 text-[10px] px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20 font-bold uppercase tracking-wider"
                        >
                            + Add New
                        </button>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {(formData.asciiArts || []).map((item, index) => (
                            <div key={index} className="p-6 bg-white/[0.02] rounded-xl border border-white/5 relative group/item">
                                <button
                                    type="button"
                                    onClick={() => removeAsciiArt(index)}
                                    className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-widest"
                                >
                                    [Remove]
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] font-bold text-slate-500 block mb-2 uppercase tracking-wider">Asset Name</label>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleAsciiChange(index, 'name', e.target.value)}
                                            placeholder="e.g. robot"
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 font-mono"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 block mb-2 uppercase tracking-wider">ASCII Data</label>
                                        <textarea
                                            value={item.art}
                                            onChange={(e) => handleAsciiChange(index, 'art', e.target.value)}
                                            placeholder="Paste ASCII art here..."
                                            rows={4}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-emerald-500 font-mono text-xs focus:outline-none focus:border-emerald-500/50 whitespace-pre"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!formData.asciiArts || formData.asciiArts.length === 0) && (
                            <div className="text-center py-12 text-slate-600 italic font-mono text-sm border border-dashed border-white/5 rounded-xl">
                                [NO_CUSTOM_ASSETS_DEFINED]
                            </div>
                        )}
                    </div>
                </div>

                {/* Toggles */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <h2 className="text-sm font-mono text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-4">
                        Display Options
                        <div className="h-px bg-white/5 flex-grow" />
                    </h2>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all cursor-pointer group/label">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-6 rounded-full transition-colors relative ${formData.showDate ? 'bg-cyan-500' : 'bg-slate-800'}`}>
                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.showDate ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <div className="font-mono">
                                    <span className="block font-bold text-slate-200 group-hover/label:text-white transition-colors text-sm uppercase tracking-wide">Show Date Command</span>
                                    <span className="text-[10px] text-slate-500">Allow users to check system date</span>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                name="showDate"
                                checked={formData.showDate}
                                onChange={handleChange}
                                className="hidden"
                            />
                        </label>

                        <label className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all cursor-pointer group/label">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-6 rounded-full transition-colors relative ${formData.showGitBranch ? 'bg-cyan-500' : 'bg-slate-800'}`}>
                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.showGitBranch ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <div className="font-mono">
                                    <span className="block font-bold text-slate-200 group-hover/label:text-white transition-colors text-sm uppercase tracking-wide">Show Git Branch</span>
                                    <span className="text-[10px] text-slate-500">Display "git:(branch)" in the prompt</span>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                name="showGitBranch"
                                checked={formData.showGitBranch}
                                onChange={handleChange}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                <AnimatePreview
                    username={formData.username}
                    symbol={formData.promptSymbol}
                    showBranch={formData.showGitBranch}
                />

                {/* Sticky Action Footer */}
                <div className="sticky bottom-8 flex justify-end gap-4 pt-6 border-t border-white/5 bg-slate-900/90 backdrop-blur-lg p-4 rounded-xl border border-white/5 shadow-2xl z-50 mt-12">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors text-sm font-medium"
                    >
                        CANCEL
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide uppercase"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                UPDATING_SYSTEM...
                            </>
                        ) : (
                            'CONFIRM_UPDATE'
                        )}
                    </button>
                </div>
            </motion.form>

            {
                toast && (
                    <Toast
                        notification={toast}
                        onClose={() => setToast(null)}
                    />
                )
            }
        </>
    );
}

// Mini preview component
function AnimatePreview({ username, symbol, showBranch }) {
    return (
        <div className="mt-8 p-6 rounded-2xl bg-slate-900 border border-white/10 font-mono text-xs sm:text-sm">
            <h3 className="text-slate-400 mb-4 text-xs uppercase tracking-wider">Live Preview</h3>
            <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">{symbol}</span>
                <span className="text-white">~</span>
                {showBranch && (
                    <span className="text-slate-500">git:(master)</span>
                )}
                <span className="text-cyan-400">echo "Hello {username}!"</span>
            </div>
            <div className="mt-2 text-slate-300">
                Hello {username}!
            </div>
        </div>
    );
}
