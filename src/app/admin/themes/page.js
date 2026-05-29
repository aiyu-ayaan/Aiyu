"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ThemePreviewCard from '@/app/components/admin/ThemePreviewCard';
import ThemeEditor from '@/app/components/admin/ThemeEditor';
import Toast from '@/app/components/admin/Toast';
import { Paintbrush, Plus, Layout, Moon, Sun, Sparkles, RefreshCw, Wand2, Save } from 'lucide-react';

const DYNAMIC_SEEDS = [
    {
        id: 'cyber-neon',
        name: 'Cyber Neon',
        baseColor: '#030712',
        description: 'Vaporwave electric neons over absolute midnight base',
        lightBg: '#f8fafc',
        accents: {
            dark: { cyan: '#00ffcc', purple: '#bd34fa', pink: '#ff007f', orange: '#ffaa00' },
            light: { cyan: '#0f766e', purple: '#7c3aed', pink: '#db2777', orange: '#ea580c' }
        }
    },
    {
        id: 'emerald-coast',
        name: 'Emerald Coast',
        baseColor: '#060f0e',
        description: 'Smooth, cohesive greens and aquatic teals',
        lightBg: '#f0f9f6',
        accents: {
            dark: { cyan: '#10b981', purple: '#059669', pink: '#6ee7b7', orange: '#a3e635' },
            light: { cyan: '#047857', purple: '#065f46', pink: '#059669', orange: '#65a30d' }
        }
    },
    {
        id: 'cozy-coffee',
        name: 'Cozy Coffee',
        baseColor: '#16110f',
        description: 'Warm cream, roasted mocha, and luxurious sand',
        lightBg: '#faf8f5',
        accents: {
            dark: { cyan: '#ebdcc5', purple: '#c5a059', pink: '#dfceb5', orange: '#a3907c' },
            light: { cyan: '#8b7355', purple: '#8b6508', pink: '#5c4d3a', orange: '#9c7c38' }
        }
    },
    {
        id: 'tokyo-drift',
        name: 'Tokyo Drift',
        baseColor: '#000000',
        description: 'Bioluminescent magenta and violet over pure carbon',
        lightBg: '#fafafa',
        accents: {
            dark: { cyan: '#00ffff', purple: '#8800ff', pink: '#ff0055', orange: '#fbbf24' },
            light: { cyan: '#0284c7', purple: '#6d28d9', pink: '#be185d', orange: '#d97706' }
        }
    },
    {
        id: 'sunset-amber',
        name: 'Sunset Amber',
        baseColor: '#0f0806',
        description: 'Glowing golden amber, orange-red, and peach dawn',
        lightBg: '#fffbeb',
        accents: {
            dark: { cyan: '#f97316', purple: '#ea580c', pink: '#fcd34d', orange: '#fbbf24' },
            light: { cyan: '#ea580c', purple: '#c2410c', pink: '#d97706', orange: '#b45309' }
        }
    },
    {
        id: 'soft-lavender',
        name: 'Soft Lavender',
        baseColor: '#0e0a14',
        description: 'Mist of luminous lilac and rich royal violet',
        lightBg: '#fdfbfe',
        accents: {
            dark: { cyan: '#a78bfa', purple: '#8b5cf6', pink: '#ddd6fe', orange: '#fb7185' },
            light: { cyan: '#7c3aed', purple: '#6d28d9', pink: '#a21caf', orange: '#be185d' }
        }
    },
    {
        id: 'minimalist-slate',
        name: 'Minimalist Slate',
        baseColor: '#0b0f19',
        description: 'Ultra-clean dark slate with cold blue highlighting',
        lightBg: '#f1f5f9',
        accents: {
            dark: { cyan: '#38bdf8', purple: '#60a5fa', pink: '#a5f3fc', orange: '#fbbf24' },
            light: { cyan: '#0284c7', purple: '#2563eb', pink: '#0891b2', orange: '#d97706' }
        }
    },
    {
        id: 'sakura-blossom',
        name: 'Sakura Blossom',
        baseColor: '#170c10',
        description: 'Ethereal cherry blossoms, rose petals, and plum nights',
        lightBg: '#fff1f2',
        accents: {
            dark: { cyan: '#f43f5e', purple: '#d946ef', pink: '#fda4af', orange: '#fb923c' },
            light: { cyan: '#db2777', purple: '#9333ea', pink: '#be185d', orange: '#c2410c' }
        }
    },
    {
        id: 'solar-flare',
        name: 'Solar Flare',
        baseColor: '#0d0a09',
        description: 'Blazing eclipse embers and volcanic elements',
        lightBg: '#fffbeb',
        accents: {
            dark: { cyan: '#f97316', purple: '#ea580c', pink: '#fcd34d', orange: '#fbbf24' },
            light: { cyan: '#ea580c', purple: '#c2410c', pink: '#d97706', orange: '#b45309' }
        }
    },
    {
        id: 'cyber-midnight',
        name: 'Cyber Midnight',
        baseColor: '#020306',
        description: 'Vivid deep tech neon blues and toxic green signals',
        lightBg: '#f4fbf7',
        accents: {
            dark: { cyan: '#10b981', purple: '#a855f7', pink: '#06b6d4', orange: '#fb923c' },
            light: { cyan: '#059669', purple: '#7c3aed', pink: '#0891b2', orange: '#d97706' }
        }
    }
];

const adjustColorBrightness = (hex, factor) => {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.min(255, Math.max(0, Math.floor(r * factor)));
    g = Math.min(255, Math.max(0, Math.floor(g * factor)));
    b = Math.min(255, Math.max(0, Math.floor(b * factor)));

    const rs = r.toString(16).padStart(2, '0');
    const gs = g.toString(16).padStart(2, '0');
    const bs = b.toString(16).padStart(2, '0');

    return `#${rs}${gs}${bs}`;
};

const generateThemeFromSeed = (seed) => {
    const suffix = Math.floor(Math.random() * 900) + 100;
    const themeName = `${seed.name} Synth #${suffix}`;
    const slug = themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const buildVariant = (isDark) => {
        const bgPrimary = isDark ? seed.baseColor : seed.lightBg;
        const bgSecondary = isDark ? adjustColorBrightness(bgPrimary, 1.4) : adjustColorBrightness(bgPrimary, 0.95);
        const bgTertiary = isDark ? adjustColorBrightness(bgPrimary, 0.6) : adjustColorBrightness(bgPrimary, 0.9);
        const bgSurface = isDark ? adjustColorBrightness(bgPrimary, 2.2) : adjustColorBrightness(bgPrimary, 0.85);
        const bgElevated = isDark ? adjustColorBrightness(bgPrimary, 2.5) : adjustColorBrightness(bgPrimary, 0.9);
        const bgHover = isDark ? adjustColorBrightness(bgPrimary, 3.2) : adjustColorBrightness(bgPrimary, 0.8);

        const textPrimary = isDark ? '#f8fafc' : '#0f172a';
        const textSecondary = isDark ? '#cbd5e1' : '#334155';
        const textTertiary = isDark ? '#94a3b8' : '#475569';
        const textMuted = isDark ? '#64748b' : '#64748b';
        const textBright = isDark ? '#ffffff' : '#000000';

        const acc = isDark ? seed.accents.dark : seed.accents.light;

        const borderPrimary = isDark ? adjustColorBrightness(bgPrimary, 2.0) : adjustColorBrightness(bgPrimary, 0.9);
        const borderSecondary = isDark ? adjustColorBrightness(bgPrimary, 3.0) : adjustColorBrightness(bgPrimary, 0.8);
        const borderAccent = acc.purple;
        const borderCyan = acc.cyan;

        return {
            backgrounds: { primary: bgPrimary, secondary: bgSecondary, tertiary: bgTertiary, surface: bgSurface, elevated: bgElevated, hover: bgHover },
            text: { primary: textPrimary, secondary: textSecondary, tertiary: textTertiary, muted: textMuted, bright: textBright },
            accents: {
                cyan: acc.cyan, cyanBright: acc.cyan, purple: acc.purple, purpleDark: acc.purple, purpleDarker: acc.purple,
                pink: acc.pink, pinkBright: acc.pink, pinkHot: acc.pink, orange: acc.orange, orangeBright: acc.orange
            },
            borders: { primary: borderPrimary, secondary: borderSecondary, accent: borderAccent, cyan: borderCyan },
            status: { error: isDark ? '#ef4444' : '#dc2626', warning: isDark ? '#fbbf24' : '#d97706', success: isDark ? '#10b981' : '#16a34a', info: isDark ? '#3b82f6' : '#2563eb' },
            syntax: {
                comment: textMuted, keyword: acc.purple, control: acc.pink, function: acc.cyan,
                class: textSecondary, string: isDark ? '#34d399' : '#16a34a', number: acc.orange, variable: textSecondary,
                property: acc.cyan, operator: acc.purple, punctuation: textPrimary
            },
            shadows: {
                sm: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
                md: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)',
                lg: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.15)'
            },
            overlays: {
                bg: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.3)',
                hover: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
            }
        };
    };

    return {
        name: themeName,
        slug: slug,
        description: `${seed.description} (dynamic synthesis)`,
        isPredefined: false,
        isCustom: true,
        variants: {
            dark: buildVariant(true),
            light: buildVariant(false)
        }
    };
};

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

    // Dynamic generator states
    const [generatedTheme, setGeneratedTheme] = useState(null);
    const [selectedSeedId, setSelectedSeedId] = useState(DYNAMIC_SEEDS[0].id);

    const showToast = (message, success = true) => {
        setToast({ message, success });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchThemes();
        fetchActiveTheme();
        setGeneratedTheme(generateThemeFromSeed(DYNAMIC_SEEDS[0]));
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

    // Synthesizer custom handlers
    const handleSeedChange = (seedId) => {
        setSelectedSeedId(seedId);
        const seed = DYNAMIC_SEEDS.find(s => s.id === seedId);
        if (seed) {
            setGeneratedTheme(generateThemeFromSeed(seed));
        }
    };

    const handleRefreshGenerated = () => {
        const seed = DYNAMIC_SEEDS.find(s => s.id === selectedSeedId) || DYNAMIC_SEEDS[0];
        setGeneratedTheme(generateThemeFromSeed(seed));
        showToast('Theme colors re-synthesized');
    };

    const handleSaveGenerated = async () => {
        if (!generatedTheme) return;
        try {
            const response = await fetch('/api/themes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(generatedTheme)
            });

            const data = await response.json();
            if (data.success) {
                fetchThemes();
                showToast('Synthesized theme deployed to Overrides');
                // Auto-refresh for a new iteration
                const seed = DYNAMIC_SEEDS.find(s => s.id === selectedSeedId) || DYNAMIC_SEEDS[0];
                setGeneratedTheme(generateThemeFromSeed(seed));
            } else {
                showToast(data.error || 'Failed to deploy synthesized theme', false);
            }
        } catch (err) {
            showToast('Failed to deploy synthesized theme', false);
            console.error(err);
        }
    };

    const predefinedThemes = themes.filter(t => t.isPredefined && !t.isLegacy);
    const legacyThemes = themes.filter(t => t.isPredefined && t.isLegacy);
    const customThemes = themes.filter(t => t.isCustom);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="font-mono text-cyan-400 animate-pulse">LOADING_INTERFACE_SKINS...</span>
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

            {/* Dynamic Theme Synthesizer */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row gap-8">
                    {/* Left Panel: Generator Controls */}
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                                    <Sparkles className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        Dynamic Theme Synthesizer
                                    </h2>
                                    <p className="text-slate-400 text-sm">Generate instant, harmonized color schemes using modern seed algorithms.</p>
                                </div>
                            </div>

                            <div className="space-y-4 my-6">
                                <div>
                                    <label className="block text-xs font-mono text-emerald-400 uppercase tracking-widest mb-2">Aesthetic Seed</label>
                                    <select
                                        value={selectedSeedId}
                                        onChange={(e) => handleSeedChange(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                                    >
                                        {DYNAMIC_SEEDS.map(seed => (
                                            <option key={seed.id} value={seed.id}>
                                                {seed.name} — {seed.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 font-mono text-xs text-slate-400">
                                    <div className="flex justify-between mb-1">
                                        <span>SYNTH_NAME:</span>
                                        <span className="text-white font-bold">{generatedTheme?.name}</span>
                                    </div>
                                    <div className="flex justify-between mb-1">
                                        <span>SYNTH_SLUG:</span>
                                        <span className="text-emerald-400">{generatedTheme?.slug}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>STATUS:</span>
                                        <span className="text-amber-400 animate-pulse">MUTATION_READY</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={handleRefreshGenerated}
                                className="flex-1 bg-slate-950 hover:bg-slate-900 border border-white/10 text-white px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-bold text-sm tracking-wide shadow-md"
                            >
                                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin-once" />
                                MUTATE_SCHEMA
                            </button>
                            <button
                                onClick={handleSaveGenerated}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 font-bold text-sm tracking-wide"
                            >
                                <Save className="w-4 h-4" />
                                DEPLOY_SYNTHESIS
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Live Mockup Card */}
                    <div className="w-full lg:w-80 flex-shrink-0">
                        <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Live Synthesis Preview
                        </div>
                        {generatedTheme && (
                            <ThemePreviewCard
                                theme={generatedTheme}
                                variant={activeVariant}
                                isActive={false}
                                isPredefined={true}
                            />
                        )}
                    </div>
                </div>
            </div>

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

            {/* Legacy Presets Accordion */}
            {legacyThemes.length > 0 && (
                <details className="mb-12 group bg-slate-900/35 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
                    <summary className="p-6 cursor-pointer select-none flex justify-between items-center text-slate-400 hover:text-white transition-colors">
                        <div className="flex items-center gap-3 text-left">
                            <Paintbrush className="w-5 h-5 text-slate-500 group-open:rotate-12 transition-transform" />
                            <div>
                                <span className="font-mono text-sm uppercase tracking-wider font-bold">Legacy Presets ({legacyThemes.length})</span>
                                <p className="text-xs text-slate-500 mt-0.5">Access original system color configurations. Kept for full backward compatibility.</p>
                            </div>
                        </div>
                        <span className="text-xs font-mono border border-white/10 px-3 py-1 rounded-full group-open:bg-white/5">
                            Toggle View
                        </span>
                    </summary>
                    <div className="p-6 pt-0 border-t border-white/5 bg-slate-950/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            {legacyThemes.map((theme, index) => (
                                <motion.div
                                    key={theme.slug}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.02 }}
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
                    </div>
                </details>
            )}

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
