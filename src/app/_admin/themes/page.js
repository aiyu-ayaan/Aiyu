"use client";
import React, { useState, useEffect } from 'react';
import { FaFloppyDisk, FaMoon, FaPlus, FaSun } from 'react-icons/fa6';
import ThemePreviewCard from '@/app/components/admin/ThemePreviewCard';
import ThemeEditor from '@/app/components/admin/ThemeEditor';
import Toast from '@/app/components/admin/Toast';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Field, Loading, PageHeader, Panel, Stat } from '@/app/components/admin/ui';
import '@/app/styles/admin-structure.css';

const ROUTE_TARGETS = [
    { path: '/', label: 'Home (/)' },
    { path: '/about-me', label: 'About (/about-me)' },
    { path: '/projects', label: 'Projects list (/projects)' },
    { path: '/projects/', label: 'Project details (/projects/...)' },
    { path: '/gallery', label: 'Gallery (/gallery)' },
    { path: '/blogs', label: 'Blogs list (/blogs)' },
    { path: '/blogs/', label: 'Blog details (/blogs/...)' },
    { path: '/contact-us', label: 'Contact (/contact-us)' },
    { path: '/github', label: 'GitHub showcase (/github)' },
];

export default function AdminThemesPage() {
    const { confirm } = useAdminFeedback();
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
    };

    const handlePerPageChange = (route, themeSlug) => {
        setPerPageConfig((prev) => ({
            ...prev,
            [route]: themeSlug,
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
                        pages: perPageConfig,
                    },
                }),
            });

            const data = await response.json();

            if (data.success) {
                showToast('Route theme assignments saved');
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
                body: JSON.stringify({ themeSlug, variant: activeVariant }),
            });

            const data = await response.json();
            if (data.success) {
                setActiveTheme(themeSlug);
                showToast('Theme activated');
            } else {
                showToast(data.error || 'Failed to activate theme', false);
            }
        } catch (err) {
            showToast('Failed to activate theme', false);
            console.error(err);
        }
    };

    const handleDeleteTheme = async (themeSlug) => {
        if (!(await confirm({
            title: 'Delete theme?',
            message: 'Are you sure you want to delete this theme? This action cannot be undone.',
            confirmText: 'Delete',
            danger: true,
        }))) return;

        try {
            const response = await fetch(`/api/themes/${themeSlug}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            if (data.success) {
                setThemes(themes.filter((t) => t.slug !== themeSlug));
                showToast('Theme deleted');
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
                body: JSON.stringify(themeData),
            });

            const data = await response.json();
            if (data.success) {
                setShowEditor(false);
                setEditingTheme(null);
                fetchThemes();
                showToast('Theme saved');
            } else {
                showToast(data.error || 'Failed to save theme', false);
            }
        } catch (err) {
            showToast('Failed to save theme', false);
            console.error(err);
        }
    };

    const predefinedThemes = themes.filter((t) => t.isPredefined && !t.isLegacy);
    const legacyThemes = themes.filter((t) => t.isPredefined && t.isLegacy);
    const customThemes = themes.filter((t) => t.isCustom);
    const activeThemeName = themes.find((t) => t.slug === activeTheme)?.name || activeTheme || 'Default';
    const overrideCount = Object.values(perPageConfig).filter(Boolean).length;

    return (
        <div className="adm-page">
            <PageHeader
                command="theme"
                title="Themes"
                description="Choose the site colour palette, preview light and dark variants, or assign themes to individual routes."
                actions={
                    <button type="button" onClick={handleCreateTheme} className="adm-btn adm-btn-primary">
                        <FaPlus aria-hidden="true" /> Create theme
                    </button>
                }
            />

            <div className="adm-stats">
                <Stat
                    label="Active theme"
                    value={activeThemeName}
                    hint={<Badge tone="ok">Live</Badge>}
                />
                <Stat
                    label="Preview variant"
                    value={activeVariant === 'light' ? 'Light' : 'Dark'}
                    hint="Default variant when activating"
                />
                <Stat
                    label="System presets"
                    value={predefinedThemes.length}
                    hint={`${legacyThemes.length} legacy presets`}
                />
                <Stat
                    label="Custom themes"
                    value={customThemes.length}
                    hint={perPageEnabled ? `${overrideCount} route overrides` : 'Global theme mode'}
                />
            </div>

            {error && (
                <div role="alert" className="adm-notice adm-notice-error">
                    {error}
                </div>
            )}

            {loading ? (
                <section className="adm-panel">
                    <Loading label="Loading themes" rows={6} />
                </section>
            ) : (
                <>
                    <Panel
                        title="Active theme and preview variant"
                        actions={
                            <div role="group" aria-label="Preview variant" className="flex items-center gap-1">
                                <button
                                    type="button"
                                    aria-pressed={activeVariant === 'light'}
                                    onClick={() => setActiveVariant('light')}
                                    className="adm-tab"
                                >
                                    <FaSun aria-hidden="true" /> Light
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={activeVariant === 'dark'}
                                    onClick={() => setActiveVariant('dark')}
                                    className="adm-tab"
                                >
                                    <FaMoon aria-hidden="true" /> Dark
                                </button>
                            </div>
                        }
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-bright)]">
                                    Currently active: {activeThemeName}
                                </p>
                                <p className="adm-help">
                                    Switch between Light and Dark above to preview every palette card in that variant before activating.
                                </p>
                            </div>
                            <Badge tone="ok">Active ({activeVariant})</Badge>
                        </div>
                    </Panel>

                    <Panel
                        title="Route-specific themes"
                        actions={
                            <div className="flex flex-wrap items-center gap-3">
                                <span id="per-page-theme-label" className="adm-help">
                                    {perPageEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={Boolean(perPageEnabled)}
                                    aria-labelledby="per-page-theme-label"
                                    onClick={handleTogglePerPage}
                                    className="adm-switch"
                                />
                                <button
                                    type="button"
                                    onClick={savePerPageConfig}
                                    className="adm-btn adm-btn-primary"
                                >
                                    <FaFloppyDisk aria-hidden="true" /> Save route rules
                                </button>
                            </div>
                        }
                    >
                        {perPageEnabled ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {ROUTE_TARGETS.map((routeObj) => (
                                    <Field key={routeObj.path} label={routeObj.label}>
                                        <select
                                            value={perPageConfig[routeObj.path] || ''}
                                            onChange={(e) => handlePerPageChange(routeObj.path, e.target.value)}
                                            className="adm-input"
                                        >
                                            <option value="">Global default ({activeThemeName})</option>
                                            {themes.map((theme) => (
                                                <option key={theme.slug} value={theme.slug}>
                                                    {theme.name}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                ))}
                            </div>
                        ) : (
                            <p className="adm-help">
                                Enable route-specific themes to assign distinct palettes to individual public routes such as <code className="adm-code">/projects</code> or <code className="adm-code">/blogs</code>.
                            </p>
                        )}
                    </Panel>

                    <Panel
                        title="System presets"
                        actions={<Badge>{predefinedThemes.length} presets</Badge>}
                    >
                        <div className="adm-theme-grid">
                            {predefinedThemes.map((theme) => (
                                <ThemePreviewCard
                                    key={theme.slug}
                                    theme={theme}
                                    variant={activeVariant}
                                    isActive={theme.slug === activeTheme}
                                    onActivate={() => handleActivateTheme(theme.slug)}
                                    isPredefined={true}
                                />
                            ))}
                        </div>
                    </Panel>

                    <Panel
                        title="Custom themes"
                        actions={
                            <button type="button" onClick={handleCreateTheme} className="adm-btn">
                                <FaPlus aria-hidden="true" /> New theme
                            </button>
                        }
                    >
                        {customThemes.length === 0 ? (
                            <EmptyState
                                title="No custom themes yet"
                                description="Create a custom colour palette or synthesize one from a prompt."
                                action={
                                    <button type="button" onClick={handleCreateTheme} className="adm-btn adm-btn-primary">
                                        <FaPlus aria-hidden="true" /> Create theme
                                    </button>
                                }
                            />
                        ) : (
                            <div className="adm-theme-grid">
                                {customThemes.map((theme) => (
                                    <ThemePreviewCard
                                        key={theme.slug}
                                        theme={theme}
                                        variant={activeVariant}
                                        isActive={theme.slug === activeTheme}
                                        onActivate={() => handleActivateTheme(theme.slug)}
                                        onEdit={() => handleEditTheme(theme)}
                                        onDelete={() => handleDeleteTheme(theme.slug)}
                                        isPredefined={false}
                                    />
                                ))}
                            </div>
                        )}
                    </Panel>

                    {legacyThemes.length > 0 && (
                        <details className="adm-panel">
                            <summary className="adm-panel-head cursor-pointer select-none">
                                <div>
                                    <h2 className="adm-panel-title">Legacy presets ({legacyThemes.length})</h2>
                                    <p className="adm-help">Original system colour configurations kept for backward compatibility.</p>
                                </div>
                                <Badge>Toggle list</Badge>
                            </summary>
                            <div className="adm-panel-body">
                                <div className="adm-theme-grid">
                                    {legacyThemes.map((theme) => (
                                        <ThemePreviewCard
                                            key={theme.slug}
                                            theme={theme}
                                            variant={activeVariant}
                                            isActive={theme.slug === activeTheme}
                                            onActivate={() => handleActivateTheme(theme.slug)}
                                            isPredefined={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        </details>
                    )}
                </>
            )}

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
