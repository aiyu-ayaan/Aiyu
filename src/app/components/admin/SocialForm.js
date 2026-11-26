"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaFloppyDisk, FaLink, FaSpinner } from 'react-icons/fa6';
import Toast from './Toast';
import { Badge, Field, Panel } from './ui';
import { getIconByName } from '@/lib/icons';
import '@/app/styles/admin-structure.css';

const KNOWN_ICONS = [
    { key: 'FaGithub', label: 'GitHub' },
    { key: 'FaLinkedin', label: 'LinkedIn' },
    { key: 'FaInstagram', label: 'Instagram' },
    { key: 'FaEnvelope', label: 'Email' },
    { key: 'FaCoffee', label: 'Coffee' },
    { key: 'SiBuymeacoffee', label: 'Buy Me a Coffee' },
];

const SocialForm = ({ initialData, isEdit = false }) => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        iconName: '',
        isHidden: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const url = isEdit ? `/api/socials/${initialData._id}` : '/api/socials';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                showNotification(true, isEdit ? 'Social link updated' : 'Social link created');
                setTimeout(() => {
                    router.push('/admin/footer');
                    router.refresh();
                }, 1500);
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to save');
            }
        } catch {
            setError('An error occurred');
            showNotification(false, 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const PreviewIcon = getIconByName(formData.iconName) || FaLink;

    return (
        <form onSubmit={handleSubmit} className="adm-split">
            <div className="adm-stack">
                {error && (
                    <div role="alert" className="adm-notice adm-notice-error">
                        {error}
                    </div>
                )}

                <Panel title="Profile details">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Network name" help="Label shown in tooltips and assistive text.">
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="adm-input"
                                placeholder="GitHub"
                                required
                            />
                        </Field>

                        <Field label="Icon identifier" help="Must match an icon key exported in src/lib/icons.js.">
                            <input
                                type="text"
                                name="iconName"
                                value={formData.iconName}
                                onChange={handleChange}
                                className="adm-input font-mono"
                                placeholder="FaGithub"
                                required
                            />
                        </Field>
                    </div>

                    <div className="mt-4">
                        <p className="adm-help mb-2">Available icon presets:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {KNOWN_ICONS.map((item) => {
                                const Icon = getIconByName(item.key) || FaLink;
                                const selected = formData.iconName === item.key;
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => setFormData((prev) => ({
                                            ...prev,
                                            iconName: item.key,
                                            name: prev.name || item.label,
                                        }))}
                                        className="adm-btn text-xs"
                                    >
                                        <Icon aria-hidden="true" />
                                        <span className="font-mono">{item.key}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <Field label="Destination URL" help="Full https:// link or mailto: address." className="mt-4">
                        <input
                            type="url"
                            name="url"
                            value={formData.url}
                            onChange={handleChange}
                            className="adm-input font-mono"
                            placeholder="https://github.com/username"
                            required
                        />
                    </Field>
                </Panel>

                <Panel title="Visibility">
                    <label className="adm-choice">
                        <input
                            type="checkbox"
                            id="isHidden"
                            name="isHidden"
                            checked={formData.isHidden || false}
                            onChange={(e) => setFormData((prev) => ({ ...prev, isHidden: e.target.checked }))}
                            className="adm-check"
                        />
                        <div>
                            <span className="font-medium text-[var(--text-bright)]">Hide this social link</span>
                            <p className="adm-help">Keep the record saved without showing it in the public footer.</p>
                        </div>
                    </label>
                </Panel>
            </div>

            <aside className="adm-stack adm-side">
                <Panel title="Publish">
                    <div className="mb-4 flex items-center gap-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-secondary)] p-3">
                        <PreviewIcon aria-hidden="true" className="text-lg text-[var(--accent-cyan)] shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-[var(--text-bright)]">
                                {formData.name || 'Untitled network'}
                            </p>
                            <p className="truncate font-mono text-xs text-[var(--text-secondary)]">
                                {formData.url || 'https://…'}
                            </p>
                        </div>
                        <Badge tone={formData.isHidden ? 'warn' : 'ok'}>
                            {formData.isHidden ? 'Hidden' : 'Visible'}
                        </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="adm-btn adm-btn-primary flex-1"
                        >
                            {loading ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                            {loading ? 'Saving' : isEdit ? 'Save changes' : 'Create social link'}
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
            </aside>

            <Toast notification={notification} />
        </form>
    );
};

export default SocialForm;
