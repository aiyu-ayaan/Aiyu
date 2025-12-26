"use client";
import React, { useState, useEffect } from 'react';

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
        <div className="flex items-center gap-3 group">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(category, colorKey, e.target.value)}
                className="w-12 h-10 rounded cursor-pointer border-2 border-gray-600 hover:border-cyan-400 transition-colors"
            />
            <div className="flex-1">
                <label className="text-sm text-gray-300 block">{label}</label>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(category, colorKey, e.target.value)}
                    className="w-full bg-gray-700 text-gray-200 px-3 py-1 rounded text-xs font-mono border border-gray-600 focus:border-cyan-400 outline-none"
                    pattern="^#[0-9A-Fa-f]{6}$|^rgba?\([^)]+\)$"
                />
            </div>
        </div>
    );

    const ColorSection = ({ title, category, colors }) => (
        <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-gray-700">{title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {theme ? 'Edit Theme' : 'Create Custom Theme'}
                        </h2>
                        <input
                            type="text"
                            placeholder="Theme Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full max-w-md bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-cyan-400 outline-none mb-2"
                        />
                        <input
                            type="text"
                            placeholder="Description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full max-w-md bg-gray-700 text-gray-300 px-4 py-2 rounded text-sm border border-gray-600 focus:border-cyan-400 outline-none"
                        />
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white transition-colors ml-4"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Variant Tabs */}
                <div className="flex gap-2 p-4 bg-gray-800 border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('light')}
                        className={`px-6 py-2 rounded transition-colors ${activeTab === 'light'
                                ? 'bg-cyan-500 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                    >
                        Light Mode
                    </button>
                    <button
                        onClick={() => setActiveTab('dark')}
                        className={`px-6 py-2 rounded transition-colors ${activeTab === 'dark'
                                ? 'bg-cyan-500 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                    >
                        Dark Mode
                    </button>
                </div>

                {/* Color Editor */}
                <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
                    <div className="max-w-4xl mx-auto">
                        <ColorSection
                            title="Background Colors"
                            category="backgrounds"
                            colors={currentVariant.backgrounds}
                        />
                        <ColorSection
                            title="Text Colors"
                            category="text"
                            colors={currentVariant.text}
                        />
                        <ColorSection
                            title="Accent Colors"
                            category="accents"
                            colors={currentVariant.accents}
                        />
                        <ColorSection
                            title="Border Colors"
                            category="borders"
                            colors={currentVariant.borders}
                        />
                        <ColorSection
                            title="Status Colors"
                            category="status"
                            colors={currentVariant.status}
                        />
                        <ColorSection
                            title="Syntax Colors"
                            category="syntax"
                            colors={currentVariant.syntax}
                        />
                        <ColorSection
                            title="Shadow Colors"
                            category="shadows"
                            colors={currentVariant.shadows}
                        />
                        <ColorSection
                            title="Overlay Colors"
                            category="overlays"
                            colors={currentVariant.overlays}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-700 bg-gray-800 flex gap-4 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded transition-colors"
                    >
                        {theme ? 'Update Theme' : 'Create Theme'}
                    </button>
                </div>
            </div>
        </div>
    );
}
