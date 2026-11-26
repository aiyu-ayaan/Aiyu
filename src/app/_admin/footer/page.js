"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaEye, FaEyeSlash, FaFloppyDisk, FaLink, FaPenToSquare, FaPlus, FaSpinner, FaTrashCan } from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Field, Loading, PageHeader, Panel, Stat } from '@/app/components/admin/ui';
import { getIconByName } from '@/lib/icons';
import '@/app/styles/admin-structure.css';

export default function AdminFooter() {
    const { confirm, toast } = useAdminFeedback();
    const [socials, setSocials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState({
        footerText: '',
        workStatus: '',
        showWorkStatus: true,
    });
    const [saving, setSaving] = useState(false);
    const showNotification = (success, message) => toast(message, { success });

    useEffect(() => {
        fetchSocials();
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data) {
                setConfig({
                    footerText: data.footerText || '',
                    workStatus: data.workStatus || '',
                    showWorkStatus: data.showWorkStatus ?? true,
                });
            }
        } catch (error) {
            console.error('Failed to fetch config', error);
        }
    };

    const fetchSocials = async () => {
        try {
            const res = await fetch('/api/socials');
            const data = await res.json();
            setSocials(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch socials', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                showNotification(true, 'Footer settings saved');
            } else {
                showNotification(false, 'Failed to update footer settings');
            }
        } catch (error) {
            console.error('Error updating config', error);
            showNotification(false, 'An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleVisibility = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/socials/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isHidden: !currentStatus }),
            });
            if (res.ok) {
                setSocials(socials.map((s) => (s._id === id ? { ...s, isHidden: !currentStatus } : s)));
                showNotification(true, currentStatus ? 'Social link shown' : 'Social link hidden');
            } else {
                showNotification(false, 'Failed to update visibility');
            }
        } catch (error) {
            console.error('Error updating visibility', error);
            showNotification(false, 'Could not update visibility');
        }
    };

    const handleDelete = async (id) => {
        if (!(await confirm({
            title: 'Delete social link?',
            message: 'Are you sure you want to delete this social link? This action cannot be undone.',
            confirmText: 'Delete',
            danger: true,
        }))) return;

        try {
            const res = await fetch(`/api/socials/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setSocials(socials.filter((s) => s._id !== id));
                showNotification(true, 'Social link deleted');
            } else {
                showNotification(false, 'Failed to delete social link');
            }
        } catch (error) {
            console.error('Error deleting social link', error);
            showNotification(false, 'Could not delete social link');
        }
    };

    const visibleCount = socials.filter((s) => !s.isHidden).length;
    const hiddenCount = socials.length - visibleCount;

    return (
        <div className="adm-page adm-structure">
            <PageHeader
                command="ls"
                title="Footer and social links"
                description="Manage footer copyright text, availability indicator, and external profile links."
                actions={
                    <Link href="/admin/footer/new" className="adm-btn adm-btn-primary">
                        <FaPlus aria-hidden="true" /> Add social link
                    </Link>
                }
            />

            <div className="adm-stats">
                <Stat
                    label="Social links"
                    value={socials.length}
                    hint={`${visibleCount} visible, ${hiddenCount} hidden`}
                />
                <Stat
                    label="Availability badge"
                    value={config.showWorkStatus ? 'Visible' : 'Hidden'}
                    hint={config.workStatus || 'Default status text'}
                />
                <Stat
                    label="Copyright notice"
                    value={config.footerText ? 'Custom' : 'Default'}
                    hint={config.footerText || 'Using site default'}
                />
            </div>

            {loading ? (
                <section className="adm-panel">
                    <Loading label="Loading footer settings" rows={5} />
                </section>
            ) : (
                <div className="adm-split">
                    <div className="adm-stack">
                        <Panel
                            title="Social links"
                            actions={
                                <Badge tone={visibleCount > 0 ? 'ok' : 'warn'}>
                                    {visibleCount} active
                                </Badge>
                            }
                            flush
                        >
                            {socials.length === 0 ? (
                                <EmptyState
                                    title="No social links yet"
                                    description="Add your GitHub, LinkedIn, or other profiles to display in the site footer."
                                    action={
                                        <Link href="/admin/footer/new" className="adm-btn adm-btn-primary">
                                            <FaPlus aria-hidden="true" /> Add social link
                                        </Link>
                                    }
                                />
                            ) : (
                                <div className="adm-table-wrap">
                                    <table className="adm-table">
                                        <thead>
                                            <tr>
                                                <th>Network</th>
                                                <th>Destination URL</th>
                                                <th>Icon</th>
                                                <th>State</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {socials.map((social) => {
                                                const IconComponent = getIconByName(social.iconName) || FaLink;
                                                return (
                                                    <tr key={social._id}>
                                                        <td>
                                                            <div className="flex items-center gap-2.5 font-semibold text-[var(--text-bright)]">
                                                                <IconComponent aria-hidden="true" className="adm-nav-icon shrink-0" />
                                                                <span>{social.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="max-w-xs truncate font-mono text-xs">
                                                            <a
                                                                href={social.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="adm-link"
                                                            >
                                                                {social.url}
                                                            </a>
                                                        </td>
                                                        <td>
                                                            <code className="adm-code">{social.iconName}</code>
                                                        </td>
                                                        <td>
                                                            <Badge tone={social.isHidden ? 'warn' : 'ok'}>
                                                                {social.isHidden ? 'Hidden' : 'Visible'}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleVisibility(social._id, social.isHidden)}
                                                                    className="adm-btn adm-btn-quiet"
                                                                    aria-label={`${social.isHidden ? 'Show' : 'Hide'} ${social.name}`}
                                                                >
                                                                    {social.isHidden ? <FaEye aria-hidden="true" /> : <FaEyeSlash aria-hidden="true" />}
                                                                    <span>{social.isHidden ? 'Show' : 'Hide'}</span>
                                                                </button>
                                                                <Link
                                                                    href={`/admin/footer/${social._id}`}
                                                                    className="adm-icon-btn"
                                                                    aria-label={`Edit ${social.name}`}
                                                                >
                                                                    <FaPenToSquare aria-hidden="true" />
                                                                </Link>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(social._id)}
                                                                    className="adm-icon-btn"
                                                                    aria-label={`Delete ${social.name}`}
                                                                >
                                                                    <FaTrashCan aria-hidden="true" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>
                    </div>

                    <aside className="adm-stack adm-side">
                        <Panel title="Footer settings">
                            <form onSubmit={handleConfigSubmit} className="space-y-4">
                                <Field
                                    label="Copyright text"
                                    help="Shown at the bottom of public pages."
                                >
                                    <input
                                        type="text"
                                        value={config.footerText}
                                        onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                                        className="adm-input"
                                        placeholder="© 2025 Ayaan. All rights reserved."
                                    />
                                </Field>

                                <Field
                                    label="Availability status"
                                    help="Short message displayed beside the status indicator."
                                >
                                    <input
                                        type="text"
                                        value={config.workStatus}
                                        onChange={(e) => setConfig({ ...config, workStatus: e.target.value })}
                                        className="adm-input"
                                        placeholder="Available for work"
                                    />
                                </Field>

                                <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-secondary)] px-3.5 py-2.5">
                                    <div>
                                        <p id="show-work-status-label" className="text-sm font-medium text-[var(--text-bright)]">
                                            Show status indicator
                                        </p>
                                        <p className="adm-help">Display availability dot in the footer.</p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(config.showWorkStatus)}
                                        aria-labelledby="show-work-status-label"
                                        onClick={() => setConfig({ ...config, showWorkStatus: !config.showWorkStatus })}
                                        className="adm-switch"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="adm-btn adm-btn-primary w-full"
                                >
                                    {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                                    {saving ? 'Saving' : 'Save footer settings'}
                                </button>
                            </form>
                        </Panel>
                    </aside>
                </div>
            )}
        </div>
    );
}
