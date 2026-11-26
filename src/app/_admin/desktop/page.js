"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FaArrowUpRightFromSquare,
    FaCheck,
    FaFloppyDisk,
    FaRotateLeft,
    FaSpinner,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { APP_VERSION } from '@/lib/version';
import { Badge, Field, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import '@/app/styles/admin-structure.css';

const PRESET_WALLPAPERS = [
    {
        name: 'Windows Bloom (Default)',
        url: 'https://images.unsplash.com/photo-1702539336564-b37d0f3276e7?q=80&w=2064&auto=format&fit=crop',
    },
    {
        name: 'Dark Nebula',
        url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2064&auto=format&fit=crop',
    },
    {
        name: 'Cyberpunk Neon',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2064&auto=format&fit=crop',
    },
    {
        name: 'Minimal Mountain',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2064&auto=format&fit=crop',
    },
    {
        name: 'Abstract Fluid',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2064&auto=format&fit=crop',
    },
];

const DEFAULT_BLOOM_GRADIENT =
    'radial-gradient(140% 120% at 28% 18%, #58a6ff 0%, #2f7be0 28%, #1e4fb0 52%, #122a7a 74%, #0a1550 100%)';

export default function AdminDesktopPage() {
    const { toast } = useAdminFeedback();
    const [wallpaper, setWallpaper] = useState('');
    const [deviceName, setDeviceName] = useState('AiyuOS');
    const [osVersion, setOsVersion] = useState(APP_VERSION);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const showToast = (message, success = true) => toast(message, { success });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                setWallpaper(data.desktopWallpaper || '');
                setDeviceName(data.desktopDeviceName || 'AiyuOS');
                setOsVersion(data.desktopOsVersion || APP_VERSION);
            }
        } catch (err) {
            console.error('Failed to load desktop config:', err);
            showToast('Failed to load desktop settings', false);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e?.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    desktopWallpaper: wallpaper.trim(),
                    desktopDeviceName: deviceName.trim(),
                    desktopOsVersion: osVersion.trim(),
                }),
            });

            if (res.ok) {
                showToast('Desktop settings saved');
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.error || 'Failed to save desktop settings', false);
            }
        } catch (err) {
            console.error('Save error:', err);
            showToast('Network error while saving', false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="adm-page adm-structure">
            <PageHeader
                command="startx"
                title="Desktop environment"
                description="Configure the virtual Aiyu OS desktop wallpaper and device identity displayed at /desktop."
                actions={
                    <Link href="/desktop" target="_blank" className="adm-btn">
                        <FaArrowUpRightFromSquare aria-hidden="true" /> Open desktop
                    </Link>
                }
            />

            {loading ? (
                <section className="adm-panel">
                    <Loading label="Loading desktop configuration" rows={5} />
                </section>
            ) : (
                <form onSubmit={handleSave} className="adm-split">
                    <div className="adm-stack">
                        <Panel
                            title="Wallpaper background"
                            actions={
                                wallpaper ? (
                                    <button
                                        type="button"
                                        onClick={() => setWallpaper('')}
                                        className="adm-btn adm-btn-quiet"
                                    >
                                        <FaRotateLeft aria-hidden="true" /> Reset to default
                                    </button>
                                ) : (
                                    <Badge>Default bloom</Badge>
                                )
                            }
                        >
                            <div className="space-y-5">
                                <Field
                                    label="Custom wallpaper URL"
                                    help="Provide an image URL or /uploads/ asset path. Leave empty to use the default bloom gradient."
                                >
                                    <input
                                        type="text"
                                        inputMode="url"
                                        value={wallpaper}
                                        onChange={(e) => setWallpaper(e.target.value)}
                                        placeholder="https://images.unsplash.com/… or leave blank"
                                        className="adm-input font-mono"
                                    />
                                </Field>

                                <fieldset className="min-w-0">
                                    <legend className="adm-label mb-2">Preset wallpapers</legend>
                                    <div role="group" aria-label="Preset wallpapers" className="adm-wallpaper-grid">
                                        {PRESET_WALLPAPERS.map((preset) => {
                                            const isSelected = wallpaper === preset.url;
                                            return (
                                                <button
                                                    key={preset.name}
                                                    type="button"
                                                    aria-pressed={isSelected}
                                                    onClick={() => setWallpaper(preset.url)}
                                                    className="adm-wallpaper-card"
                                                    style={{ backgroundImage: `url(${preset.url})` }}
                                                >
                                                    <span className="adm-wallpaper-label">
                                                        <span className="truncate">{preset.name}</span>
                                                        {isSelected && <FaCheck aria-hidden="true" className="text-[var(--accent-cyan)] shrink-0" />}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            </div>
                        </Panel>

                        <Panel title="Device identity">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Virtual device name"
                                    help="Hostname shown in the Settings app and system properties."
                                >
                                    <input
                                        type="text"
                                        value={deviceName}
                                        onChange={(e) => setDeviceName(e.target.value)}
                                        placeholder="AiyuOS"
                                        className="adm-input font-mono"
                                    />
                                </Field>

                                <Field
                                    label="Virtual OS version"
                                    help="Release string displayed in system properties."
                                >
                                    <input
                                        type="text"
                                        value={osVersion}
                                        onChange={(e) => setOsVersion(e.target.value)}
                                        placeholder={APP_VERSION}
                                        className="adm-input font-mono"
                                    />
                                </Field>
                            </div>
                        </Panel>
                    </div>

                    <aside className="adm-stack adm-side">
                        <Panel title="Publish">
                            <p className="adm-help mb-4">
                                Changes update the <code className="adm-code">/desktop</code> workspace immediately after saving.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button type="submit" disabled={saving} className="adm-btn adm-btn-primary flex-1">
                                    {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                                    {saving ? 'Saving' : 'Save changes'}
                                </button>
                                <Link href="/desktop" target="_blank" className="adm-btn">
                                    Preview
                                </Link>
                            </div>
                        </Panel>

                        <Panel title="Desktop preview">
                            <div
                                role="img"
                                aria-label="Virtual desktop preview"
                                className="relative flex h-52 flex-col justify-between overflow-hidden rounded-[10px] border border-[var(--hairline-strong)] bg-cover bg-center"
                                style={
                                    wallpaper
                                        ? { backgroundImage: `url(${wallpaper})` }
                                        : { background: DEFAULT_BLOOM_GRADIENT }
                                }
                            >
                                <div className="grid w-16 gap-2 p-3">
                                    {['Explorer', 'Photos', 'GitHub'].map((appLabel) => (
                                        <div
                                            key={appLabel}
                                            className="flex h-10 w-12 items-center justify-center rounded-md border border-[var(--hairline)] bg-[var(--bg-secondary)] text-[10px] font-medium text-[var(--text-bright)]"
                                        >
                                            {appLabel}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex h-8 items-center justify-center gap-2 border-t border-[var(--hairline)] bg-[var(--bg-secondary)] px-3">
                                    <span className="h-3.5 w-3.5 rounded-sm bg-[var(--accent-cyan)]" />
                                    <span className="h-3.5 w-3.5 rounded-sm bg-[var(--accent-purple)]" />
                                    <span className="h-3.5 w-3.5 rounded-sm bg-[var(--status-success)]" />
                                </div>
                            </div>

                            <dl className="adm-facts mt-4">
                                <div>
                                    <dt>Device</dt>
                                    <dd>{deviceName || 'AiyuOS'}</dd>
                                </div>
                                <div>
                                    <dt>Version</dt>
                                    <dd>{osVersion || APP_VERSION}</dd>
                                </div>
                                <div>
                                    <dt>Wallpaper</dt>
                                    <dd>{wallpaper ? 'Custom URL' : 'Default bloom'}</dd>
                                </div>
                            </dl>
                        </Panel>
                    </aside>
                </form>
            )}
        </div>
    );
}
