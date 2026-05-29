"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import Toast from './Toast';

const HomeForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        homeRoles: '',
        githubLink: '',
        codeSnippets: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiAction, setAiAction] = useState(null); // 'roles' or 'code'

    useEffect(() => {
        fetchData();
        checkAiConfig();
    }, []);

    const checkAiConfig = async () => {
        try {
            const res = await fetch('/api/admin/ai/config');
            const data = await res.json();
            if (data.success && data.data) {
                setAiEnabled(data.data.enabled);
            }
        } catch (error) {
            console.error('Failed to fetch AI config:', error);
        }
    };

    const fetchData = async () => {
        try {
            const res = await fetch('/api/home');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        ...data,
                        homeRoles: data.homeRoles ? data.homeRoles.join(', ') : '',
                        codeSnippets: data.codeSnippets ? data.codeSnippets.join('\n') : '',
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch home data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAiAction = async (mode) => {
        if (aiGenerating) return;
        setAiGenerating(true);
        setAiAction(mode);

        try {
            let prompt = '';
            let context = {};

            if (mode === 'code') {
                prompt = 'Generate code snippets';
                context = { name: formData.name, roles: formData.homeRoles };
            }

            const res = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: mode === 'code' ? 'generate_home_code' : 'proofread',
                    prompt: mode === 'code' ? prompt : formData.homeRoles,
                    context
                })
            });

            const data = await res.json();

            if (data.success) {
                if (mode === 'code') {
                    setFormData(prev => ({ ...prev, codeSnippets: data.data }));
                    showNotification(true, 'Terminal snippets synthesized!');
                } else {
                    setFormData(prev => ({ ...prev, homeRoles: data.data }));
                    showNotification(true, 'Role designations refined!');
                }
            } else {
                showNotification(false, data.error || 'AI synthesis failed');
            }
        } catch (error) {
            console.error('AI Error:', error);
            showNotification(false, 'AI uplink interrupted');
        } finally {
            setAiGenerating(false);
            setAiAction(null);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const payload = {
            ...formData,
            homeRoles: formData.homeRoles.split(',').map((item) => item.trim()),
            codeSnippets: formData.codeSnippets.split('\n').filter((item) => item.trim() !== ''),
        };

        try {
            const response = await fetch('/api/home', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showNotification(true, 'Landing Sequence Updated Successfully');
                fetchData(); // Refresh data
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to update');
            }
        } catch (err) {
            setError('An error occurred');
            showNotification(false, 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-white">Loading...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
                    <span className="text-xl">⚠️</span> {error}
                </div>
            )}

            {/* Core Data Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Core Identification
                    <div className="h-px bg-cyan-500/20 flex-grow" />
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Display Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-bold tracking-wide"
                            required
                        />
                        <p className="text-xs text-slate-500 mt-2 font-mono">{'// Primary user identifier'}</p>
                    </div>

                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">GitHub Uplink</label>
                        <input
                            type="url"
                            name="githubLink"
                            value={formData.githubLink}
                            onChange={handleChange}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-cyan-400 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-mono text-sm"
                            required
                        />
                    </div>

                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-slate-400 text-xs font-mono uppercase tracking-wider">Role Designations</label>
                            {aiEnabled && (
                                <button
                                    type="button"
                                    onClick={() => handleAiAction('roles')}
                                    disabled={aiGenerating || !formData.homeRoles}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/20 transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed group/ai"
                                >
                                    {aiGenerating && aiAction === 'roles' ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Wand2 className="w-3 h-3 group-hover/ai:scale-110 transition-transform" />
                                    )}
                                    Refine Roles
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            name="homeRoles"
                            value={formData.homeRoles}
                            onChange={handleChange}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                            placeholder="e.g. Full Stack Developer, UI/UX Designer"
                            required
                        />
                        <p className="text-xs text-slate-500 mt-2 font-mono">{'// Comma-separated list of active functions'}</p>
                    </div>
                </div>
            </div>

            {/* Code Snippets Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-green-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Terminal Output
                    <div className="h-px bg-green-500/20 flex-grow" />
                </h2>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-slate-400 text-xs font-mono uppercase tracking-wider">Code Snippets</label>
                        {aiEnabled && (
                            <button
                                type="button"
                                onClick={() => handleAiAction('code')}
                                disabled={aiGenerating || !formData.name}
                                className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg border border-green-500/20 transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed group/ai"
                            >
                                {aiGenerating && aiAction === 'code' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3 h-3 group-hover/ai:rotate-12 transition-transform" />
                                )}
                                Generate Snippets
                            </button>
                        )}
                    </div>
                    <textarea
                        name="codeSnippets"
                        value={formData.codeSnippets}
                        onChange={handleChange}
                        rows="6"
                        className="w-full bg-slate-950/80 border border-white/10 rounded-lg p-4 text-green-400 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none transition-all placeholder:text-slate-600 font-mono text-sm"
                        placeholder="const future = await build();"
                    />
                    <p className="text-xs text-slate-500 mt-2 font-mono">{'// Displayed in hero terminal background. One line per entry.'}</p>
                </div>
            </div>

            {/* Resume Configuration */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-orange-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Resume Module
                    <div className="h-px bg-orange-500/20 flex-grow" />
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Status</label>
                        <input
                            type="text"
                            name="resumeStatus"
                            value={formData.resumeStatus || 'ONLINE'}
                            onChange={handleChange}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-orange-400 font-bold text-center tracking-widest focus:border-orange-500/50 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Mode Identifier</label>
                        <input
                            type="text"
                            name="resumeMode"
                            value={formData.resumeMode || 'DEV_01'}
                            onChange={handleChange}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-300 font-mono text-center focus:border-orange-500/50 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Hologram Icon</label>
                        <select
                            name="resumeIcon"
                            value={formData.resumeIcon || 'FaBolt'}
                            onChange={handleChange}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-orange-500/50 outline-none appearance-none cursor-pointer"
                        >
                            <option value="FaBolt">⚡ Bolt</option>
                            <option value="FaCode">💻 Code</option>
                            <option value="FaTerminal">_ Terminal</option>
                            <option value="FaRobot">🤖 Robot</option>
                            <option value="FaRocket">🚀 Rocket</option>
                            <option value="FaBrain">🧠 Brain</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Visual Interface Selector */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-purple-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Interface Style
                    <div className="h-px bg-purple-500/20 flex-grow" />
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className={`relative overflow-hidden p-6 rounded-xl border cursor-pointer transition-all duration-300 group/card ${formData.heroSectionType === 'futuristic' ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'bg-slate-950/30 border-white/5 hover:border-white/20'}`}>
                        <input
                            type="radio"
                            name="heroSectionType"
                            value="futuristic"
                            checked={formData.heroSectionType === 'futuristic'}
                            onChange={handleChange}
                            className="hidden"
                        />
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="mb-4 text-3xl">🔮</div>
                            <div className="font-bold text-white mb-2 text-lg">Futuristic Card</div>
                            <div className="text-xs text-slate-400 leading-relaxed">
                                Advanced 3D styling with glitch effects, neon glows, and dynamic motion. Optimal for modern tech portfolios.
                            </div>
                        </div>
                        {formData.heroSectionType === 'futuristic' && (
                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,1)] animate-ping" />
                        )}
                    </label>

                    <label className={`relative overflow-hidden p-6 rounded-xl border cursor-pointer transition-all duration-300 group/card ${formData.heroSectionType === 'game' ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.15)]' : 'bg-slate-950/30 border-white/5 hover:border-white/20'}`}>
                        <input
                            type="radio"
                            name="heroSectionType"
                            value="game"
                            checked={formData.heroSectionType === 'game'}
                            onChange={handleChange}
                            className="hidden"
                        />
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="mb-4 text-3xl">🕹️</div>
                            <div className="font-bold text-white mb-2 text-lg">Retro Arcade</div>
                            <div className="text-xs text-slate-400 leading-relaxed">
                                Interactive gaming interface featuring playable Snake, Tic-Tac-Toe, and pixel art aesthetics.
                            </div>
                        </div>
                        {formData.heroSectionType === 'game' && (
                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)] animate-ping" />
                        )}
                    </label>
                </div>
            </div>

            {/* Active Theme & Skins Link Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-4">
                    Active Theme & Skins
                    <div className="h-px bg-purple-500/20 flex-grow" />
                </h2>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl select-none">
                            🎨
                        </div>
                        <div>
                            <p className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">INTERFACE CORE SKIN</p>
                            <p className="text-sm font-bold text-white font-mono mt-0.5">Activate & Edit Visual Skin Presets</p>
                        </div>
                    </div>
                    
                    <Link href="/admin/themes" className="w-full sm:w-auto">
                        <button type="button" className="w-full px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs tracking-wider transition-all font-mono cursor-pointer">
                            LAUNCH_SKINS_CONTROL_CENTER →
                        </button>
                    </Link>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-8 flex justify-end gap-4 pt-6 border-t border-white/5 bg-slate-900/90 backdrop-blur-lg p-4 rounded-xl border border-white/5 shadow-2xl z-50">
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
                    className="px-8 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
                >
                    {saving ? 'UPDATING_SYSTEM...' : 'CONFIRM_CHANGES'}
                </button>
            </div>

            {/* Toast Notification */}
            <Toast notification={notification} />
        </form>
    );
};

export default HomeForm;
