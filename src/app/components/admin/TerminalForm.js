"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSave, FaTerminal, FaUndo } from 'react-icons/fa';
import Toast from './Toast';

export default function TerminalForm() {
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
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                    <FaTerminal size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Terminal Configuration</h1>
                    <p className="text-slate-400">Customize the appearance and behavior of the terminal component</p>
                </div>
            </div>

            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
                onSubmit={handleSubmit}
            >
                {/* Visual Settings */}
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        Appearance
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="guest"
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                            />
                            <p className="text-xs text-slate-500">Displayed in whoami command</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Prompt Symbol</label>
                            <input
                                type="text"
                                name="promptSymbol"
                                value={formData.promptSymbol}
                                onChange={handleChange}
                                placeholder="➜"
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* ASCII Art Config */}
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            ASCII Art Collection
                        </h2>
                        <button
                            type="button"
                            onClick={addAsciiArt}
                            className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20"
                        >
                            + Add New
                        </button>
                    </div>

                    <div className="space-y-6">
                        {(formData.asciiArts || []).map((item, index) => (
                            <div key={index} className="p-4 bg-slate-800/30 rounded-xl border border-white/5 relative group">
                                <button
                                    type="button"
                                    onClick={() => removeAsciiArt(index)}
                                    className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Remove
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1">
                                        <label className="text-xs font-medium text-slate-400 block mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleAsciiChange(index, 'name', e.target.value)}
                                            placeholder="e.g. robot"
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-slate-400 block mb-1">Art</label>
                                        <textarea
                                            value={item.art}
                                            onChange={(e) => handleAsciiChange(index, 'art', e.target.value)}
                                            placeholder="Paste ASCII art here..."
                                            rows={4}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-amber-500 font-mono text-xs focus:outline-none focus:border-amber-500/50 whitespace-pre"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!formData.asciiArts || formData.asciiArts.length === 0) && (
                            <div className="text-center py-8 text-slate-500 italic">
                                No custom ASCII art defined yet. Custom arts will be added to the default collection.
                            </div>
                        )}
                    </div>
                </div>

                {/* Toggles */}
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold text-white mb-6">Display Options</h2>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-6 rounded-full transition-colors relative ${formData.showDate ? 'bg-amber-500' : 'bg-slate-600'}`}>
                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.showDate ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <div>
                                    <span className="block font-medium text-white group-hover:text-amber-400 transition-colors">Show Date Command</span>
                                    <span className="text-sm text-slate-400">Allow users to check system date</span>
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

                        <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-6 rounded-full transition-colors relative ${formData.showGitBranch ? 'bg-amber-500' : 'bg-slate-600'}`}>
                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.showGitBranch ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <div>
                                    <span className="block font-medium text-white group-hover:text-amber-400 transition-colors">Show Git Branch</span>
                                    <span className="text-sm text-slate-400">Display "git:(branch)" in the prompt</span>
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

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <FaSave />
                                Save Configuration
                            </>
                        )}
                    </button>
                </div>
            </motion.form>

            <AnimatePreview
                username={formData.username}
                symbol={formData.promptSymbol}
                showBranch={formData.showGitBranch}
            />

            {toast && (
                <Toast
                    notification={toast}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
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
