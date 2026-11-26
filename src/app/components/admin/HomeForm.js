"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FaArrowDown,
    FaArrowUp,
    FaFloppyDisk,
    FaPlus,
    FaSpinner,
    FaTrash,
    FaWandMagicSparkles,
} from 'react-icons/fa6';
import { getIconNames, getIcon } from '@/lib/iconLibrary';
import Toast from './Toast';
import { Badge, EmptyState, Field, Loading, Panel } from './ui';
import '@/app/styles/admin-showcase.css';

const SECTIONS = [
    { id: 'home-identity', label: 'Hero identity' },
    { id: 'home-terminal', label: 'Terminal snippets' },
    { id: 'home-resume', label: 'Resume badge' },
    { id: 'home-status', label: 'Live status strip' },
    { id: 'home-showcase', label: 'Focus areas' },
    { id: 'home-interface', label: 'Hero interface style' },
];

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
                    showNotification(true, 'Terminal snippets generated');
                } else {
                    setFormData(prev => ({ ...prev, homeRoles: data.data }));
                    showNotification(true, 'Roles refined');
                }
            } else {
                showNotification(false, data.error || 'AI generation failed');
            }
        } catch (error) {
            console.error('AI Error:', error);
            showNotification(false, 'Could not reach the AI service');
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
                {
                    title: '',
                    description: '',
                    icon: 'Code',
                    accent: 'var(--accent-cyan)',
                    tags: ''
                },
                ...prev.showcasePanels
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
                showNotification(true, 'Home page saved');
                fetchData();
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to update');
            }
        } catch {
            setError('An error occurred');
            showNotification(false, 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Panel><Loading label="Loading home page settings" rows={6} /></Panel>;
    }

    return (
        <form onSubmit={handleSubmit} className="adm-sc-split">
            <div className="adm-sc-col">
                {error && <div role="alert" className="adm-notice adm-notice-error">{error}</div>}

                <Panel id="home-identity" title="Hero identity" className="adm-sc-anchor">
                    <div className="space-y-4">
                        <div className="adm-sc-fields">
                            <Field label="Display name" help="Shown in the hero heading.">
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="adm-input"
                                    required
                                />
                            </Field>

                            <Field label="GitHub profile URL" help="Linked from the hero actions.">
                                <input
                                    type="url"
                                    name="githubLink"
                                    value={formData.githubLink}
                                    onChange={handleChange}
                                    className="adm-input font-mono"
                                    required
                                />
                            </Field>
                        </div>

                        <div className="adm-field">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <label htmlFor="home-roles-input" className="adm-label">Roles</label>
                                {aiEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleAiAction('roles')}
                                        disabled={aiGenerating || !formData.homeRoles}
                                        className="adm-btn adm-btn-quiet"
                                    >
                                        {aiGenerating && aiAction === 'roles' ? (
                                            <FaSpinner className="animate-spin" aria-hidden="true" />
                                        ) : (
                                            <FaWandMagicSparkles aria-hidden="true" />
                                        )}
                                        Refine roles
                                    </button>
                                )}
                            </div>
                            <input
                                id="home-roles-input"
                                type="text"
                                name="homeRoles"
                                value={formData.homeRoles}
                                onChange={handleChange}
                                className="adm-input"
                                placeholder="e.g. Full Stack Developer, UI/UX Designer"
                                required
                            />
                            <p className="adm-help">Comma-separated list rotated in the hero banner.</p>
                        </div>
                    </div>
                </Panel>

                <Panel
                    id="home-terminal"
                    title="Terminal snippets"
                    className="adm-sc-anchor"
                    actions={
                        aiEnabled ? (
                            <button
                                type="button"
                                onClick={() => handleAiAction('code')}
                                disabled={aiGenerating || !formData.name}
                                className="adm-btn"
                            >
                                {aiGenerating && aiAction === 'code' ? (
                                    <FaSpinner className="animate-spin" aria-hidden="true" />
                                ) : (
                                    <FaWandMagicSparkles aria-hidden="true" />
                                )}
                                Generate snippets
                            </button>
                        ) : null
                    }
                >
                    <Field
                        label="Code lines"
                        help="Displayed in the hero terminal background. Put one statement per line."
                    >
                        <textarea
                            name="codeSnippets"
                            value={formData.codeSnippets}
                            onChange={handleChange}
                            rows={6}
                            className="adm-input font-mono"
                            placeholder="const future = await build();"
                        />
                    </Field>
                </Panel>

                <Panel id="home-resume" title="Resume badge" className="adm-sc-anchor">
                    <div className="adm-sc-fields">
                        <Field label="Status label">
                            <input
                                type="text"
                                name="resumeStatus"
                                value={formData.resumeStatus || 'ONLINE'}
                                onChange={handleChange}
                                className="adm-input font-mono"
                            />
                        </Field>
                        <Field label="Mode identifier">
                            <input
                                type="text"
                                name="resumeMode"
                                value={formData.resumeMode || 'DEV_01'}
                                onChange={handleChange}
                                className="adm-input font-mono"
                            />
                        </Field>
                        <Field label="Icon">
                            <select
                                name="resumeIcon"
                                value={formData.resumeIcon || 'FaBolt'}
                                onChange={handleChange}
                                className="adm-input"
                            >
                                <option value="FaBolt">Bolt</option>
                                <option value="FaCode">Code</option>
                                <option value="FaTerminal">Terminal</option>
                                <option value="FaRobot">Robot</option>
                                <option value="FaRocket">Rocket</option>
                                <option value="FaBrain">Brain</option>
                            </select>
                        </Field>
                    </div>
                </Panel>

                <Panel
                    id="home-status"
                    title="Live status strip"
                    className="adm-sc-anchor"
                    actions={
                        <div className="flex items-center gap-2">
                            <span className="adm-help">{formData.statusEnabled ? 'Visible' : 'Hidden'}</span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={!!formData.statusEnabled}
                                aria-label="Show live status section on homepage"
                                onClick={() => setFormData((prev) => ({ ...prev, statusEnabled: !prev.statusEnabled }))}
                                className="adm-switch"
                            />
                        </div>
                    }
                >
                    <div className="adm-sc-fields">
                        <Field label="Section headline">
                            <input
                                type="text"
                                name="statusHeadline"
                                value={formData.statusHeadline}
                                onChange={handleChange}
                                placeholder="Mission Control"
                                className="adm-input"
                            />
                        </Field>
                        <Field label="Availability">
                            <input
                                type="text"
                                name="statusAvailability"
                                value={formData.statusAvailability}
                                onChange={handleChange}
                                placeholder="Open to collaborations"
                                className="adm-input"
                            />
                        </Field>
                        <Field label="Current focus">
                            <input
                                type="text"
                                name="statusFocus"
                                value={formData.statusFocus}
                                onChange={handleChange}
                                placeholder="Building delightful web experiences"
                                className="adm-input"
                            />
                        </Field>
                        <Field label="Now learning">
                            <input
                                type="text"
                                name="statusLearning"
                                value={formData.statusLearning}
                                onChange={handleChange}
                                placeholder="Exploring new tools and patterns"
                                className="adm-input"
                            />
                        </Field>
                    </div>
                </Panel>

                <Panel
                    id="home-showcase"
                    title="Focus areas"
                    className="adm-sc-anchor"
                    actions={
                        <button
                            type="button"
                            onClick={handleAddPanel}
                            className="adm-btn"
                        >
                            <FaPlus aria-hidden="true" /> Add card
                        </button>
                    }
                >
                    <div className="space-y-4">
                        <div className="adm-sc-fields">
                            <Field label="Section eyebrow">
                                <input
                                    type="text"
                                    name="showcaseEyebrow"
                                    value={formData.showcaseEyebrow || ''}
                                    onChange={handleChange}
                                    placeholder="How I Work"
                                    className="adm-input"
                                />
                            </Field>
                            <Field label="Section headline">
                                <input
                                    type="text"
                                    name="showcaseHeadline"
                                    value={formData.showcaseHeadline || ''}
                                    onChange={handleChange}
                                    placeholder="Focus areas, side to side."
                                    className="adm-input"
                                />
                            </Field>
                        </div>

                        <Field label="Section description">
                            <input
                                type="text"
                                name="showcaseDescription"
                                value={formData.showcaseDescription || ''}
                                onChange={handleChange}
                                placeholder="Keep scrolling — this rail moves sideways with you, then hands you back to the page."
                                className="adm-input"
                            />
                        </Field>

                        {formData.showcasePanels.length === 0 ? (
                            <EmptyState
                                title="No focus area cards configured"
                                description="The homepage will fall back to the default panels until you add a card."
                                action={
                                    <button type="button" onClick={handleAddPanel} className="adm-btn">
                                        <FaPlus aria-hidden="true" /> Add first card
                                    </button>
                                }
                            />
                        ) : (
                            <div className="space-y-3">
                                {formData.showcasePanels.map((panel, index) => {
                                    const IconComponent = getIcon(panel.icon);
                                    return (
                                        <div key={index} className="adm-sc-item">
                                            <div className="adm-sc-item-head">
                                                <span
                                                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--hairline)] bg-[var(--bg-secondary)]"
                                                    style={{ color: panel.accent || 'var(--accent-cyan)' }}
                                                    aria-hidden="true"
                                                >
                                                    <IconComponent size={15} />
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-bright)]">
                                                    {panel.title || `Card ${index + 1}`}
                                                </span>
                                                <div className="adm-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMovePanel(index, -1)}
                                                        disabled={index === 0}
                                                        className="adm-icon-btn"
                                                        title="Move up"
                                                        aria-label={`Move card ${index + 1} up`}
                                                    >
                                                        <FaArrowUp aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMovePanel(index, 1)}
                                                        disabled={index === formData.showcasePanels.length - 1}
                                                        className="adm-icon-btn"
                                                        title="Move down"
                                                        aria-label={`Move card ${index + 1} down`}
                                                    >
                                                        <FaArrowDown aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePanel(index)}
                                                        className="adm-icon-btn"
                                                        title="Delete card"
                                                        aria-label={`Delete card ${index + 1}`}
                                                    >
                                                        <FaTrash aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="adm-sc-item-body">
                                                <div className="adm-sc-fields">
                                                    <Field label="Card title">
                                                        <input
                                                            type="text"
                                                            value={panel.title}
                                                            onChange={(e) => handlePanelChange(index, 'title', e.target.value)}
                                                            placeholder="e.g. Product Engineering"
                                                            className="adm-input"
                                                            required
                                                        />
                                                    </Field>

                                                    <Field label="Icon">
                                                        <select
                                                            value={panel.icon || 'Code'}
                                                            onChange={(e) => handlePanelChange(index, 'icon', e.target.value)}
                                                            className="adm-input"
                                                        >
                                                            {getIconNames().map(name => (
                                                                <option key={name} value={name}>{name}</option>
                                                            ))}
                                                        </select>
                                                    </Field>

                                                    <Field label="Accent colour">
                                                        <select
                                                            value={panel.accent || 'var(--accent-cyan)'}
                                                            onChange={(e) => handlePanelChange(index, 'accent', e.target.value)}
                                                            className="adm-input"
                                                        >
                                                            <option value="var(--accent-cyan)">Cyan</option>
                                                            <option value="var(--accent-purple)">Purple</option>
                                                            <option value="var(--accent-orange)">Orange</option>
                                                            <option value="var(--accent-pink)">Pink</option>
                                                            <option value="var(--accent-teal)">Teal</option>
                                                            <option value="var(--accent-green)">Green</option>
                                                        </select>
                                                    </Field>
                                                </div>

                                                <Field label="Description">
                                                    <textarea
                                                        value={panel.description}
                                                        onChange={(e) => handlePanelChange(index, 'description', e.target.value)}
                                                        placeholder="Describe this focus area…"
                                                        rows={2}
                                                        className="adm-input"
                                                        required
                                                    />
                                                </Field>

                                                <Field label="Tags" help="Comma-separated list of technologies or topics.">
                                                    <input
                                                        type="text"
                                                        value={panel.tags}
                                                        onChange={(e) => handlePanelChange(index, 'tags', e.target.value)}
                                                        placeholder="Next.js, React, Tailwind"
                                                        className="adm-input"
                                                    />
                                                </Field>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Panel>

                <Panel id="home-interface" title="Hero interface style" className="adm-sc-anchor">
                    <div className="adm-sc-fields">
                        <label className="adm-sc-choice">
                            <input
                                type="radio"
                                name="heroSectionType"
                                value="futuristic"
                                checked={formData.heroSectionType === 'futuristic'}
                                onChange={handleChange}
                                className="adm-check mt-1"
                            />
                            <div className="min-w-0">
                                <p className="font-semibold text-[var(--text-bright)]">Futuristic card</p>
                                <p className="adm-help mt-1">
                                    3D card layout with terminal code preview and status accents.
                                </p>
                            </div>
                        </label>

                        <label className="adm-sc-choice">
                            <input
                                type="radio"
                                name="heroSectionType"
                                value="game"
                                checked={formData.heroSectionType === 'game'}
                                onChange={handleChange}
                                className="adm-check mt-1"
                            />
                            <div className="min-w-0">
                                <p className="font-semibold text-[var(--text-bright)]">Retro arcade</p>
                                <p className="adm-help mt-1">
                                    Interactive arcade widget with playable Snake and Tic-Tac-Toe.
                                </p>
                            </div>
                        </label>
                    </div>
                </Panel>
            </div>

            <aside className="adm-sc-aside">
                <Panel title="Publish" className="adm-sc-save">
                    <p className="adm-help mb-4">Save updates to apply them on the public homepage.</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="adm-btn adm-btn-primary flex-1"
                        >
                            {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                            {saving ? 'Saving' : 'Save changes'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="adm-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </Panel>

                <Panel title="On this page" flush>
                    <nav aria-label="Home sections">
                        <ul className="adm-list">
                            {SECTIONS.map((s) => (
                                <li key={s.id}>
                                    <a href={`#${s.id}`} className="adm-row justify-between">
                                        <span>{s.label}</span>
                                        {s.id === 'home-showcase' && (
                                            <Badge>{formData.showcasePanels.length}</Badge>
                                        )}
                                        {s.id === 'home-status' && (
                                            <Badge tone={formData.statusEnabled ? 'ok' : undefined}>
                                                {formData.statusEnabled ? 'On' : 'Off'}
                                            </Badge>
                                        )}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </Panel>

                <Panel title="Appearance & themes" flush>
                    <ul className="adm-list">
                        <li>
                            <Link href="/admin/themes" className="adm-row adm-link">
                                Theme and colour presets
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/header" className="adm-row adm-link">
                                Navigation header
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/terminal" className="adm-row adm-link">
                                Interactive terminal
                            </Link>
                        </li>
                    </ul>
                </Panel>
            </aside>

            <Toast notification={notification} />
        </form>
    );
};

export default HomeForm;
