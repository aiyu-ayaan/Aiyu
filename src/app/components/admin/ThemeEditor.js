"use client";
import React, { useState, useEffect } from 'react';
import {
    FaFloppyDisk,
    FaMoon,
    FaSpinner,
    FaSun,
    FaWandMagicSparkles,
    FaXmark,
} from 'react-icons/fa6';
import Toast from './Toast';
import { Field, Panel } from './ui';
import '@/app/styles/admin-structure.css';

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

const COLOR_SECTIONS = [
    { title: 'Backgrounds and surfaces', category: 'backgrounds' },
    { title: 'Typography', category: 'text' },
    { title: 'Accent colours', category: 'accents' },
    { title: 'Borders and dividers', category: 'borders' },
    { title: 'Status indicators', category: 'status' },
    { title: 'Code syntax tokens', category: 'syntax' },
    { title: 'Shadows and depth', category: 'shadows' },
];

const formatTokenLabel = (key) => {
    const spaced = key.replace(/([A-Z])/g, ' $1').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

function ColorInput({ label, value, onChange, category, colorKey, activeTab }) {
    const inputId = `theme-${activeTab}-${category}-${colorKey}`;
    const isHex = typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());

    return (
        <div className="adm-color-item">
            <label
                className="adm-color-swatch"
                style={{ backgroundColor: value }}
                title={`Pick colour for ${label}`}
            >
                <span className="sr-only">Pick colour for {label}</span>
                <input
                    type="color"
                    value={isHex ? value.trim() : '#0d1117'}
                    onChange={(e) => onChange(category, colorKey, e.target.value)}
                    aria-label={`Colour picker for ${label}`}
                />
            </label>
            <div className="min-w-0 flex-1">
                <label htmlFor={inputId} className="block truncate text-xs font-medium text-[var(--text-secondary)]">
                    {label}
                </label>
                <input
                    id={inputId}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(category, colorKey, e.target.value)}
                    className="adm-input mt-1 !min-h-8 !px-2 !py-1 font-mono text-xs"
                />
            </div>
        </div>
    );
}

export default function ThemeEditor({ theme, onSave, onCancel }) {
    const [name, setName] = useState(theme?.name || '');
    const [description, setDescription] = useState(theme?.description || '');
    const [activeTab, setActiveTab] = useState('light');
    const [lightVariant, setLightVariant] = useState(theme?.variants?.light || defaultVariant);
    const [darkVariant, setDarkVariant] = useState(theme?.variants?.dark || defaultVariant);
    const [notification, setNotification] = useState(null);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');

    useEffect(() => {
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

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim() || aiGenerating) return;
        setAiGenerating(true);

        try {
            const res = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'generate_theme',
                    prompt: aiPrompt,
                }),
            });

            const data = await res.json();

            if (data.success) {
                try {
                    const parsedTheme = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;

                    const mergeVariant = (defaultVar, newVar) => {
                        if (!newVar) return defaultVar;
                        const merged = { ...defaultVar };
                        for (const category in defaultVar) {
                            if (newVar[category]) {
                                merged[category] = { ...defaultVar[category], ...newVar[category] };
                            }
                        }
                        return merged;
                    };

                    if (parsedTheme.light) setLightVariant(mergeVariant(defaultVariant, parsedTheme.light));
                    if (parsedTheme.dark) setDarkVariant(mergeVariant(defaultVariant, parsedTheme.dark));

                    showNotification(true, 'Theme palette generated');
                } catch (parseError) {
                    console.error('Failed to parse AI theme JSON:', parseError);
                    showNotification(false, 'Could not parse generated theme JSON');
                }
            } else {
                showNotification(false, data.error || 'AI theme generation failed');
            }
        } catch (error) {
            console.error('AI Error:', error);
            showNotification(false, 'Could not reach AI service');
        } finally {
            setAiGenerating(false);
        }
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const currentVariant = activeTab === 'light' ? lightVariant : darkVariant;
    const setCurrentVariant = activeTab === 'light' ? setLightVariant : setDarkVariant;

    const updateColor = (category, key, value) => {
        setCurrentVariant((prev) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value,
            },
        }));
    };

    const handleSubmit = () => {
        if (!name.trim()) {
            showNotification(false, 'Please enter a theme name');
            return;
        }

        onSave({
            name: name.trim(),
            description: description.trim(),
            variants: {
                light: lightVariant,
                dark: darkVariant,
            },
        });
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-editor-title"
            className="adm-overlay"
        >
            <div className="adm-dialog adm-dialog-framed adm-dialog-wide">
                <header className="adm-dialog-head">
                    <div>
                        <h2 id="theme-editor-title" className="text-lg font-semibold text-[var(--text-bright)]">
                            {theme ? `Edit theme: ${theme.name}` : 'Create custom theme'}
                        </h2>
                        <p className="adm-help">
                            Configure colour tokens and syntax highlighting for both light and dark variants.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="adm-icon-btn"
                        aria-label="Close theme editor"
                    >
                        <FaXmark aria-hidden="true" />
                    </button>
                </header>

                <div className="adm-dialog-body space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Theme name">
                            <input
                                type="text"
                                placeholder="Solarized Ocean"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="adm-input"
                            />
                        </Field>
                        <Field label="Description">
                            <input
                                type="text"
                                placeholder="Short summary of the palette mood and contrast"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="adm-input"
                            />
                        </Field>
                    </div>

                    {aiEnabled && (
                        <div className="adm-field">
                            <label htmlFor="ai-theme-prompt" className="adm-label">
                                Generate palette with AI
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <input
                                    id="ai-theme-prompt"
                                    type="text"
                                    placeholder="Describe a palette (e.g. Warm editorial paper & deep slate)"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    className="adm-input flex-1 basis-64"
                                />
                                <button
                                    type="button"
                                    onClick={handleAiGenerate}
                                    disabled={aiGenerating || !aiPrompt.trim()}
                                    className="adm-btn"
                                >
                                    {aiGenerating ? (
                                        <FaSpinner className="animate-spin" aria-hidden="true" />
                                    ) : (
                                        <FaWandMagicSparkles aria-hidden="true" />
                                    )}
                                    {aiGenerating ? 'Generating' : 'Generate palette'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--hairline)] pb-3">
                        <div role="tablist" aria-label="Theme variant" className="adm-tabs !border-b-0">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'light'}
                                onClick={() => setActiveTab('light')}
                                className="adm-tab"
                            >
                                <FaSun aria-hidden="true" /> Light variant
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'dark'}
                                onClick={() => setActiveTab('dark')}
                                className="adm-tab"
                            >
                                <FaMoon aria-hidden="true" /> Dark variant
                            </button>
                        </div>

                        {/* Intentional live colour sample for the selected variant */}
                        <div
                            className="flex items-center gap-3 rounded-[10px] border px-3.5 py-2 text-xs font-mono"
                            style={{
                                backgroundColor: currentVariant.backgrounds?.primary,
                                borderColor: currentVariant.borders?.primary,
                                color: currentVariant.text?.primary,
                            }}
                        >
                            <span>Sample surface</span>
                            <span style={{ color: currentVariant.accents?.cyan }}>--accent-cyan</span>
                            <span style={{ color: currentVariant.accents?.purple }}>~/path</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {COLOR_SECTIONS.map(({ title, category }) => {
                            const colors = currentVariant[category] || {};
                            return (
                                <Panel key={category} title={title}>
                                    <div className="adm-color-grid">
                                        {Object.entries(colors).map(([key, value]) => (
                                            <ColorInput
                                                key={key}
                                                label={formatTokenLabel(key)}
                                                value={value}
                                                onChange={updateColor}
                                                category={category}
                                                colorKey={key}
                                                activeTab={activeTab}
                                            />
                                        ))}
                                    </div>
                                </Panel>
                            );
                        })}
                    </div>
                </div>

                <footer className="adm-dialog-foot">
                    <button type="button" onClick={onCancel} className="adm-btn">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} className="adm-btn adm-btn-primary">
                        <FaFloppyDisk aria-hidden="true" />
                        {theme ? 'Save changes' : 'Create theme'}
                    </button>
                </footer>
            </div>

            <Toast notification={notification} />
        </div>
    );
}
