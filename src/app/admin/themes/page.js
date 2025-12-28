"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ThemePreviewCard from '@/app/components/admin/ThemePreviewCard';
import ThemeEditor from '@/app/components/admin/ThemeEditor';
import Toast from '@/app/components/admin/Toast';
import { Paintbrush, Plus, Layout, Moon, Sun } from 'lucide-react';

export default function AdminThemesPage() {
    const router = useRouter();
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTheme, setActiveTheme] = useState(null);
    const [activeVariant, setActiveVariant] = useState('dark');
    const [showEditor, setShowEditor] = useState(false);
    const [editingTheme, setEditingTheme] = useState(null);
    const [error, setError] = useState(null);
    const [perPageEnabled, setPerPageEnabled] = useState(false);
    const [perPageConfig, setPerPageConfig] = useState({});
    const [toast, setToast] = useState(null);

    const showToast = (message, success = true) => {
        setToast({ message, success });
        setTimeout(() => setToast(null), 3000);
    };


    useEffect(() => {
        fetchThemes();
        fetchActiveTheme();
    }, []);

    const fetchThemes = async () => {
        try {
            const response = await fetch('/api/themes');
            const data = await response.json();
            if (data.success) {
                setThemes(data.data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to load themes');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveTheme = async () => {
        try {
            const response = await fetch('/api/themes/active');
            const data = await response.json();
            if (data.success) {
                setActiveTheme(data.data.theme.slug);
                setActiveVariant(data.data.activeVariant);
                if (data.data.perPageThemes) {
                    setPerPageEnabled(data.data.perPageThemes.enabled);
                    setPerPageConfig(data.data.perPageThemes.pages || {});
                }
            }
        } catch (err) {
            console.error('Failed to fetch active theme:', err);
        }
    };

    const handleTogglePerPage = () => {
        setPerPageEnabled(!perPageEnabled);
        // We defer saving until the user clicks save, or we can auto-save.
        // Let's implement auto-save for toggle for better UX? 
        // Or wait for strict save button. The UI I added has a SAVE button. 
        // So just toggle state here.
    };

    const handlePerPageChange = (route, themeSlug) => {
        setPerPageConfig(prev => ({
            ...prev,
            [route]: themeSlug
        }));
    };

    const savePerPageConfig = async () => {
        try {
            const response = await fetch('/api/themes/active', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    perPageThemes: {
                        enabled: perPageEnabled,
                        pages: perPageConfig
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                showToast('Configuration saved successfully');
            } else {
                showToast(data.error || 'Failed to save configuration', false);
            }
        } catch (err) {
            showToast('Failed to save configuration', false);
            console.error(err);
        }
    };

    const handleActivateTheme = async (themeSlug) => {
        try {
            const response = await fetch('/api/themes/active', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ themeSlug, variant: activeVariant })
            });

            const data = await response.json();
            if (data.success) {
                setActiveTheme(themeSlug);
                showToast('Theme activated successfully');
            } else {
                showToast(data.error || 'Failed to activate theme', false);
            }
        } catch (err) {
            showToast('Failed to activate theme', false);
            console.error(err);
        }
    };

    const handleDeleteTheme = async (themeSlug) => {
        if (!confirm(`Are you sure you want to delete this theme?`)) return;

        try {
            const response = await fetch(`/api/themes/${themeSlug}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                setThemes(themes.filter(t => t.slug !== themeSlug));
                showToast('Theme deleted successfully');
            } else {
                showToast(data.error || 'Failed to delete theme', false);
            }
        } catch (err) {
            showToast('Failed to delete theme', false);
            console.error(err);
        }
    };

    const handleCreateTheme = () => {
        setEditingTheme(null);
        setShowEditor(true);
    };

    const handleEditTheme = (theme) => {
        setEditingTheme(theme);
        setShowEditor(true);
    };

    const handleSaveTheme = async (themeData) => {
        try {
            const url = editingTheme ? `/api/themes/${editingTheme.slug}` : '/api/themes';
            const method = editingTheme ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(themeData)
            });

            const data = await response.json();
            if (data.success) {
                setShowEditor(false);
                setEditingTheme(null);
                fetchThemes();
                showToast('Theme saved successfully');
            } else {
                showToast(data.error || 'Failed to save theme', false);
            }
        } catch (err) {
            showToast('Failed to save theme', false);
            console.error(err);
        }
    };

    const predefinedThemes = themes.filter(t => t.isPredefined);
    const customThemes = themes.filter(t => t.isCustom);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="font-mono text-cyan-400 animate-pulse">LOADING_INTERFACE_SKINS...</span>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-4 font-mono text-sm tracking-wide"
                    >
                        ← BACK_TO_COMMAND_CENTER
                    </Link>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Visual Interface</h1>
                    <p className="text-slate-400">Manage appearance presets and custom styling protocols.</p>
                </div>
                <button
                    onClick={handleCreateTheme}
                    className="bg-purple-500 hover:bg-purple-400 text-white px-6 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] flex items-center gap-2 font-bold text-sm tracking-wide"
                >
                    <Plus className="w-4 h-4" />
                    CREATE_THEME
                </button>
            </div>

            {/* Active Theme Status */}
            {activeTheme && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 mb-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-cyan-400">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xs font-mono text-cyan-500 uppercase tracking-widest mb-1">Current Implementation</div>
                                <div className="text-2xl font-bold text-white flex items-center gap-3">
                                    {themes.find(t => t.slug === activeTheme)?.name || activeTheme}
                                    <span className="text-xs bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20 flex items-center gap-1 font-mono">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                        ACTIVE
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Variant Toggle for Active Theme */}
                        <div className="flex bg-slate-950/50 p-1 rounded-lg border border-white/10">
                            <button
                                onClick={() => setActiveVariant('light')}
                                className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${activeVariant === 'light' ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Sun className="w-4 h-4" /> Light
                            </button>
                            <button
                                onClick={() => setActiveVariant('dark')}
                                className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${activeVariant === 'dark' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Moon className="w-4 h-4" /> Dark
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Per-Page Customization Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 mb-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/30 text-purple-400">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Route-Specific Customization</h2>
                                <p className="text-slate-400 text-sm">Assign different visual themes to specific application routes.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-mono ${perPageEnabled ? 'text-purple-400' : 'text-slate-500'}`}>
                                {perPageEnabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                            <button
                                onClick={handleTogglePerPage}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${perPageEnabled ? 'bg-purple-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${perPageEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {perPageEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 animate-fadeIn">
                            {[
                                { path: '/', label: 'Home (/)' },
                                { path: '/about-me', label: 'About Me (/about-me)' },
                                { path: '/projects', label: 'Projects List (/projects)' },
                                { path: '/projects/', label: 'Project Details (/projects/...)' },
                                { path: '/gallery', label: 'Gallery (/gallery)' },
                                { path: '/blogs', label: 'Blogs List (/blogs)' },
                                { path: '/blogs/', label: 'Blog Details (/blogs/...)' },
                                { path: '/contact-us', label: 'Contact Us (/contact-us)' },
                                { path: '/github', label: 'GitHub Showcase (/github)' },
                                { path: '/work-in-progress', label: 'Work In Progress (/work-in-progress)' }
                            ].map(routeObj => (
                                <div key={routeObj.path} className="bg-slate-950/50 p-4 rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-mono text-cyan-400 text-sm">{routeObj.label}</span>
                                    </div>
                                    <select
                                        value={perPageConfig[routeObj.path] || ''}
                                        onChange={(e) => handlePerPageChange(routeObj.path, e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="">Global Default</option>
                                        {themes.map(theme => (
                                            <option key={theme.slug} value={theme.slug}>
                                                {theme.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={savePerPageConfig}
                            className={`bg-purple-500 hover:bg-purple-400 text-white px-6 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] font-bold text-sm tracking-wide ${!perPageEnabled ? 'opacity-75 grayscale' : ''}`}
                        >
                            {perPageEnabled ? 'SAVE_CONFIGURATION' : 'SAVE_DISABLE_STATE'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 mb-8 font-mono text-sm">
                    ERROR: {error}
                </div>
            )}

            {/* Pre-defined Themes Grid */}
            <section className="mb-12">
                <h2 className="text-sm font-mono text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-4">
                    System Presets
                    <div className="h-px w-full bg-white/5" />
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {predefinedThemes.map((theme, index) => (
                        <motion.div
                            key={theme.slug}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <ThemePreviewCard
                                theme={theme}
                                variant={activeVariant}
                                isActive={theme.slug === activeTheme}
                                onActivate={() => handleActivateTheme(theme.slug)}
                                isPredefined={true}
                            />
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Custom Themes Grid */}
            <section>
                <h2 className="text-sm font-mono text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-4">
                    User Overrides
                    <div className="h-px w-full bg-white/5" />
                </h2>
                {customThemes.length === 0 ? (
                    <div className="bg-slate-900/30 border border-white/10 border-dashed rounded-2xl p-12 text-center group hover:border-white/20 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center text-slate-600 mb-4 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                            <Paintbrush className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 mb-4 font-mono text-sm">No custom themes detected.</p>
                        <button
                            onClick={handleCreateTheme}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors font-bold text-sm"
                        >
                            INITIALIZE_NEW_THEME →
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {customThemes.map((theme, index) => (
                            <motion.div
                                key={theme.slug}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <ThemePreviewCard
                                    theme={theme}
                                    variant={activeVariant}
                                    isActive={theme.slug === activeTheme}
                                    onActivate={() => handleActivateTheme(theme.slug)}
                                    onEdit={() => handleEditTheme(theme)}
                                    onDelete={() => handleDeleteTheme(theme.slug)}
                                    isPredefined={false}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* Theme Editor Modal */}
            {showEditor && (
                <ThemeEditor
                    theme={editingTheme}
                    onSave={handleSaveTheme}
                    onCancel={() => {
                        setShowEditor(false);
                        setEditingTheme(null);
                    }}
                />
            )}

            <Toast notification={toast} onClose={() => setToast(null)} />
        </div>
    );
}
