"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, Wand2, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { getIconNames } from '@/lib/iconLibrary';
import Toast from './Toast';

const HomeForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        homeRoles: '',
        githubLink: '',
        codeSnippets: '',
        statusEnabled: true,
        statusHeadline: '',
        statusFocus: '',
        statusLearning: '',
        statusAvailability: '',
        showcaseEyebrow: '',
        showcaseHeadline: '',
        showcaseDescription: '',
        showcasePanels: [],
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
                    const dbPanels = data.showcaseSection?.panels || [];
                    const panelsForEditing = dbPanels.length > 0
                        ? dbPanels.map(p => ({
                            ...p,
                            tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '')
                          }))
                        : [];

                    setFormData({
                        ...data,
                        homeRoles: data.homeRoles ? data.homeRoles.join(', ') : '',
                        codeSnippets: data.codeSnippets ? data.codeSnippets.join('\n') : '',
                        statusEnabled: data.statusSection?.enabled !== false,
                        statusHeadline: data.statusSection?.headline || '',
                        statusFocus: data.statusSection?.focus || '',
                        statusLearning: data.statusSection?.learning || '',
                        statusAvailability: data.statusSection?.availability || '',
                        showcaseEyebrow: data.showcaseSection?.eyebrow || 'How I Work',
                        showcaseHeadline: data.showcaseSection?.headline || 'Focus areas, side to side.',
                        showcaseDescription: data.showcaseSection?.description || 'Keep scrolling — this rail moves sideways with you, then hands you back to the page.',
                        showcasePanels: panelsForEditing,
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
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleAddPanel = () => {
        setFormData(prev => ({
            ...prev,
            showcasePanels: [
                ...prev.showcasePanels,
                {
                    title: '',
                    description: '',
                    icon: 'Code',
                    accent: 'var(--accent-cyan)',
                    tags: ''
                }
            ]
        }));
    };

    const handleRemovePanel = (index) => {
        setFormData(prev => ({
            ...prev,
            showcasePanels: prev.showcasePanels.filter((_, idx) => idx !== index)
        }));
    };

    const handlePanelChange = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.showcasePanels];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, showcasePanels: updated };
        });
    };

    const handleMovePanel = (index, direction) => {
        setFormData(prev => {
            const panels = [...prev.showcasePanels];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= panels.length) return prev;
            
            const temp = panels[index];
            panels[index] = panels[targetIndex];
            panels[targetIndex] = temp;
            
            return { ...prev, showcasePanels: panels };
        });
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const showcaseSection = {
            eyebrow: formData.showcaseEyebrow.trim() || 'How I Work',
            headline: formData.showcaseHeadline.trim() || 'Focus areas, side to side.',
            description: formData.showcaseDescription.trim() || 'Keep scrolling — this rail moves sideways with you, then hands you back to the page.',
            panels: formData.showcasePanels.map(p => ({
                title: p.title.trim(),
                description: p.description.trim(),
                icon: p.icon || 'Code',
                accent: p.accent || 'var(--accent-cyan)',
                tags: typeof p.tags === 'string'
                    ? p.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
                    : (Array.isArray(p.tags) ? p.tags : [])
            }))
        };

        const payload = {
            ...formData,
            homeRoles: formData.homeRoles.split(',').map((item) => item.trim()),
            codeSnippets: formData.codeSnippets.split('\n').filter((item) => item.trim() !== ''),
            statusSection: {
                enabled: formData.statusEnabled,
                headline: formData.statusHeadline.trim() || 'Mission Control',
                focus: formData.statusFocus.trim(),
                learning: formData.statusLearning.trim(),
                availability: formData.statusAvailability.trim(),
            },
            showcaseSection,
        };
        delete payload.statusEnabled;
        delete payload.statusHeadline;
        delete payload.statusFocus;
        delete payload.statusLearning;
        delete payload.statusAvailability;
        delete payload.showcaseEyebrow;
        delete payload.showcaseHeadline;
        delete payload.showcaseDescription;
        delete payload.showcasePanels;

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

            {/* Mission Control Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-pink-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Mission Control
                    <div className="h-px bg-pink-500/20 flex-grow" />
                </h2>

                <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/40 border border-white/5 mb-6 cursor-pointer">
                    <div>
                        <p className="text-sm font-bold text-white">Show Live Status Section</p>
                        <p className="text-xs text-slate-500 mt-1 font-mono">{'// Renders the Mission Control strip on the homepage'}</p>
                    </div>
                    <input
                        type="checkbox"
                        name="statusEnabled"
                        checked={formData.statusEnabled}
                        onChange={handleChange}
                        className="h-5 w-5 accent-pink-500 cursor-pointer"
                    />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Section Headline</label>
                        <input
                            type="text"
                            name="statusHeadline"
                            value={formData.statusHeadline}
                            onChange={handleChange}
                            placeholder="Mission Control"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Availability</label>
                        <input
                            type="text"
                            name="statusAvailability"
                            value={formData.statusAvailability}
                            onChange={handleChange}
                            placeholder="Open to collaborations"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Current Focus</label>
                        <input
                            type="text"
                            name="statusFocus"
                            value={formData.statusFocus}
                            onChange={handleChange}
                            placeholder="Building delightful web experiences"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Now Learning</label>
                        <input
                            type="text"
                            name="statusLearning"
                            value={formData.statusLearning}
                            onChange={handleChange}
                            placeholder="Exploring new tools and patterns"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>
                </div>
            </div>

            {/* Showcase Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Showcase Focus Areas
                    <div className="h-px bg-cyan-500/20 flex-grow" />
                </h2>

                <div className="grid grid-cols-1 gap-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Section Eyebrow</label>
                            <input
                                type="text"
                                name="showcaseEyebrow"
                                value={formData.showcaseEyebrow || ''}
                                onChange={handleChange}
                                placeholder="How I Work"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Section Headline</label>
                            <input
                                type="text"
                                name="showcaseHeadline"
                                value={formData.showcaseHeadline || ''}
                                onChange={handleChange}
                                placeholder="Focus areas, side to side."
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-bold"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Section Description</label>
                        <input
                            type="text"
                            name="showcaseDescription"
                            value={formData.showcaseDescription || ''}
                            onChange={handleChange}
                            placeholder="Keep scrolling — this rail moves sideways with you, then hands you back to the page."
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-bold"
                        />
                    </div>
                </div>

                {/* Cards List */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider">Focus Area Cards</h3>
                        <button
                            type="button"
                            onClick={handleAddPanel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Card
                        </button>
                    </div>

                    {formData.showcasePanels.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-slate-500 font-mono text-xs">
                            {"// No focus area cards configured. Falls back to default panels."}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {formData.showcasePanels.map((panel, index) => (
                                <div key={index} className="p-5 bg-slate-950/40 border border-white/5 rounded-xl relative group/item">
                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleMovePanel(index, -1)}
                                            disabled={index === 0}
                                            className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                            title="Move Up"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMovePanel(index, 1)}
                                            disabled={index === formData.showcasePanels.length - 1}
                                            className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                            title="Move Down"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePanel(index)}
                                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-all cursor-pointer"
                                            title="Delete Card"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pr-24">
                                        <div className="md:col-span-2">
                                            <label className="block text-slate-500 mb-1 text-[10px] font-mono uppercase tracking-wider">Card Title</label>
                                            <input
                                                type="text"
                                                value={panel.title}
                                                onChange={(e) => handlePanelChange(index, 'title', e.target.value)}
                                                placeholder="e.g. Product Engineering"
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-cyan-500/50 outline-none text-sm font-bold"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-500 mb-1 text-[10px] font-mono uppercase tracking-wider">Icon</label>
                                            <select
                                                value={panel.icon || 'Code'}
                                                onChange={(e) => handlePanelChange(index, 'icon', e.target.value)}
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-300 focus:border-cyan-500/50 outline-none text-sm cursor-pointer"
                                            >
                                                {getIconNames().map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-3">
                                            <label className="block text-slate-500 mb-1 text-[10px] font-mono uppercase tracking-wider">Card Description</label>
                                            <textarea
                                                value={panel.description}
                                                onChange={(e) => handlePanelChange(index, 'description', e.target.value)}
                                                placeholder="Describe this focus area..."
                                                rows="2"
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-300 focus:border-cyan-500/50 outline-none text-sm"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-500 mb-1 text-[10px] font-mono uppercase tracking-wider">Accent Color</label>
                                            <select
                                                value={panel.accent || 'var(--accent-cyan)'}
                                                onChange={(e) => handlePanelChange(index, 'accent', e.target.value)}
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-300 focus:border-cyan-500/50 outline-none text-sm cursor-pointer"
                                            >
                                                <option value="var(--accent-cyan)">Cyan</option>
                                                <option value="var(--accent-purple)">Purple</option>
                                                <option value="var(--accent-orange)">Orange</option>
                                                <option value="var(--accent-pink)">Pink</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-slate-500 mb-1 text-[10px] font-mono uppercase tracking-wider">Tags (comma-separated)</label>
                                            <input
                                                type="text"
                                                value={panel.tags}
                                                onChange={(e) => handlePanelChange(index, 'tags', e.target.value)}
                                                placeholder="Next.js, React, Tailwind"
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-300 focus:border-cyan-500/50 outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
