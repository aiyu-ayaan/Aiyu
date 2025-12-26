"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ThemePreviewCard from '@/app/components/admin/ThemePreviewCard';
import ThemeEditor from '@/app/components/admin/ThemeEditor';

export default function AdminThemesPage() {
    const router = useRouter();
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTheme, setActiveTheme] = useState(null);
    const [activeVariant, setActiveVariant] = useState('dark');
    const [showEditor, setShowEditor] = useState(false);
    const [editingTheme, setEditingTheme] = useState(null);
    const [error, setError] = useState(null);

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
            }
        } catch (err) {
            console.error('Failed to fetch active theme:', err);
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
                alert('Theme activated successfully! Refresh the page to see changes.');
            } else {
                alert(data.error || 'Failed to activate theme');
            }
        } catch (err) {
            alert('Failed to activate theme');
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
                alert('Theme deleted successfully');
            } else {
                alert(data.error || 'Failed to delete theme');
            }
        } catch (err) {
            alert('Failed to delete theme');
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
                alert(`Theme ${editingTheme ? 'updated' : 'created'} successfully!`);
            } else {
                alert(data.error || 'Failed to save theme');
            }
        } catch (err) {
            alert('Failed to save theme');
            console.error(err);
        }
    };

    const predefinedThemes = themes.filter(t => t.isPredefined);
    const customThemes = themes.filter(t => t.isCustom);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <Link
                        href="/admin"
                        className="text-gray-400 hover:text-cyan-400 transition-colors mb-2 inline-block"
                    >
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white">Theme Management</h1>
                    <p className="text-gray-400 mt-2">Customize your website&apos;s appearance with pre-defined or custom themes</p>
                </div>
                <button
                    onClick={handleCreateTheme}
                    className="bg-cyan-500 hover:bg-cyan-400 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Custom Theme
                </button>
            </div>

            {/* Active Theme Indicator */}
            {activeTheme && (
                <div className="bg-gray-800 border border-cyan-400 rounded-lg p-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                        <div>
                            <span className="text-gray-400">Active Theme:</span>
                            <span className="text-white ml-2 font-semibold">
                                {themes.find(t => t.slug === activeTheme)?.name || activeTheme}
                            </span>
                            <span className="text-gray-400 ml-2">({activeVariant} mode)</span>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-lg p-4 mb-8">
                    {error}
                </div>
            )}

            {/* Variant Toggle */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveVariant('light')}
                    className={`px-4 py-2 rounded-lg transition-colors ${activeVariant === 'light'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    Light Mode
                </button>
                <button
                    onClick={() => setActiveVariant('dark')}
                    className={`px-4 py-2 rounded-lg transition-colors ${activeVariant === 'dark'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    Dark Mode
                </button>
            </div>

            {/* Pre-defined Themes */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-4">Pre-defined Themes</h2>
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

            {/* Custom Themes */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-4">Custom Themes</h2>
                {customThemes.length === 0 ? (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                        <p className="text-gray-400 mb-4">No custom themes yet</p>
                        <button
                            onClick={handleCreateTheme}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            Create your first custom theme →
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
        </div>
    );
}
