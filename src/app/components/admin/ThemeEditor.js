"use client";
import React, { useState, useEffect } from 'react';
import { X, Save, Eraser, Palette, Eye, Layout, Type, Box, Hash, Sun, Moon, Layers } from 'lucide-react';

const defaultVariant = {
    backgrounds: {
        primary: '#0d1117',
        secondary: '#0a1929',
        tertiary: '#080a0e',
        surface: '#1e1433',
        elevated: '#1a0f2e',
        hover: '#1e3a5f',
    },
    text: {
        primary: '#e5e7eb',
        secondary: '#cbd5e1',
        tertiary: '#94a3b8',
        muted: '#64748b',
        bright: '#ffffff',
    },
    accents: {
        cyan: '#22d3ee',
        cyanBright: '#00ffff',
        purple: '#c084fc',
        purpleDark: '#7c3aed',
        purpleDarker: '#4c1d95',
        pink: '#ec4899',
        pinkBright: '#f472b6',
        pinkHot: '#ff0080',
        orange: '#f97316',
        orangeBright: '#ff9500',
    },
    borders: {
        primary: '#1e293b',
        secondary: '#374151',
        accent: '#4c1d95',
        cyan: '#22d3ee',
    },
    status: {
        error: '#f87171',
        warning: '#fbbf24',
        success: '#34d399',
        info: '#22d3ee',
    },
    syntax: {
        comment: '#a78bfa',
        keyword: '#d946ef',
        control: '#ff0080',
        function: '#00ffff',
        class: '#c084fc',
        string: '#00ff88',
        number: '#ff9500',
        variable: '#a5f3fc',
        property: '#38bdf8',
        operator: '#a855f7',
        punctuation: '#fde047',
    },
    shadows: {
        sm: 'rgba(0, 0, 0, 0.3)',
        md: 'rgba(0, 0, 0, 0.5)',
        lg: 'rgba(34, 211, 238, 0.3)',
    },
    overlays: {
        bg: 'rgba(0, 0, 0, 0.5)',
        hover: 'rgba(34, 211, 238, 0.15)',
    },
};

export default function ThemeEditor({ theme, onSave, onCancel }) {
    const [name, setName] = useState(theme?.name || '');
    const [description, setDescription] = useState(theme?.description || '');
    const [activeTab, setActiveTab] = useState('light');
    const [lightVariant, setLightVariant] = useState(theme?.variants?.light || defaultVariant);
    const [darkVariant, setDarkVariant] = useState(theme?.variants?.dark || defaultVariant);

    const currentVariant = activeTab === 'light' ? lightVariant : darkVariant;
    const setCurrentVariant = activeTab === 'light' ? setLightVariant : setDarkVariant;

    const updateColor = (category, key, value) => {
        setCurrentVariant(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('Please enter a theme name');
            return;
        }

        onSave({
            name: name.trim(),
            description: description.trim(),
            variants: {
                light: lightVariant,
                dark: darkVariant
            }
        });
    };

    const ColorInput = ({ label, value, onChange, category, colorKey }) => (
        <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg hover:border-white/20 transition-colors group">
            <div className="relative">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(category, colorKey, e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer opacity-0 absolute inset-0 z-10"
                />
                <div
                    className="w-10 h-10 rounded border border-white/10 shadow-inner"
                    style={{ backgroundColor: value }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-400 block mb-1 truncate font-mono uppercase tracking-wide">{label}</label>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(category, colorKey, e.target.value)}
                    className="w-full bg-slate-950/50 text-slate-200 px-2 py-1 rounded text-xs font-mono border border-white/10 focus:border-cyan-500/50 outline-none"
                />
            </div>
        </div>
    );

    const ColorSection = ({ title, icon: Icon, category, colors }) => (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h4>
                <div className="h-px bg-white/10 flex-1 ml-4" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Object.entries(colors).map(([key, value]) => (
                    <ColorInput
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1').trim()}
                        value={value}
                        onChange={updateColor}
                        category={category}
                        colorKey={key}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-white/10 shadow-2xl relative overflow-hidden">

                {/* Background Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-start bg-slate-900/50 relative z-10 shrink-0">
                    <div className="flex-1 max-w-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                                <Palette className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {theme ? 'Edit System Theme' : 'Initialize New Theme'}
                                </h2>
                                <p className="text-sm text-slate-500 font-mono">Configure color variables and syntax highlighting.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="THEME_DESIGNATION"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-950/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-cyan-500/50 outline-none text-sm font-bold placeholder:text-slate-700 font-mono"
                            />
                            <input
                                type="text"
                                placeholder="Description (Optional context)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-950/50 text-slate-300 px-4 py-3 rounded-xl border border-white/10 focus:border-cyan-500/50 outline-none text-sm placeholder:text-slate-700"
                            />
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Variant Tabs */}
                <div className="flex px-6 pt-6 gap-2 bg-slate-900/50 shrink-0 relative z-10">
                    <button
                        onClick={() => setActiveTab('light')}
                        className={`px-6 py-3 rounded-t-xl transition-all flex items-center gap-2 text-sm font-bold border-t border-x ${activeTab === 'light'
                            ? 'bg-slate-900 border-white/10 text-white border-b-transparent translate-y-px z-10'
                            : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}
                    >
                        <Sun className="w-4 h-4" /> Light Mode
                    </button>
                    <button
                        onClick={() => setActiveTab('dark')}
                        className={`px-6 py-3 rounded-t-xl transition-all flex items-center gap-2 text-sm font-bold border-t border-x ${activeTab === 'dark'
                            ? 'bg-slate-900 border-white/10 text-white border-b-transparent translate-y-px z-10'
                            : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}
                    >
                        <Moon className="w-4 h-4" /> Dark Mode
                    </button>
                </div>

                <div className="h-px bg-white/10 w-full shrink-0 relative z-0" />

                {/* Color Editor Content */}
                <div className="flex-1 overflow-y-auto p-8 hide-scrollbar relative z-10 scroll-smooth">
                    <div className="max-w-5xl mx-auto space-y-2">
                        <ColorSection
                            title="Structure & Backgrounds"
                            icon={Layout}
                            category="backgrounds"
                            colors={currentVariant.backgrounds}
                        />
                        <ColorSection
                            title="Typography"
                            icon={Type}
                            category="text"
                            colors={currentVariant.text}
                        />
                        <ColorSection
                            title="Primary Accents"
                            icon={Eraser}
                            category="accents"
                            colors={currentVariant.accents}
                        />
                        <ColorSection
                            title="Borders & Dividers"
                            icon={Box}
                            category="borders"
                            colors={currentVariant.borders}
                        />
                        <ColorSection
                            title="UI Indicators"
                            icon={Layers}
                            category="status"
                            colors={currentVariant.status}
                        />
                        <ColorSection
                            title="Code Syntax"
                            icon={Hash}
                            category="syntax"
                            colors={currentVariant.syntax}
                        />
                        <ColorSection
                            title="Depth & Shadow"
                            icon={Eye}
                            category="shadows"
                            colors={currentVariant.shadows}
                        />
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-6 border-t border-white/10 bg-slate-900 flex gap-4 justify-end shrink-0 relative z-10">
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-sm font-bold"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all text-sm font-bold tracking-wide flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {theme ? 'SAVE_MODIFICATIONS' : 'CREATE_THEME'}
                    </button>
                </div>
            </div>
        </div>
    );
}
