"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaFloppyDisk, FaPlus, FaSpinner, FaTrashCan } from 'react-icons/fa6';
import Toast from './Toast';
import { Badge, EmptyState, Field, Loading, Panel } from './ui';
import '@/app/styles/admin-structure.css';

export default function TerminalForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [formData, setFormData] = useState({
        username: 'guest',
        promptSymbol: '➜',
        welcomeMessage: '',
        showDate: true,
        showGitBranch: true,
        asciiArts: [],
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data.terminal) {
                setFormData(data.terminal);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching config:', error);
            showToast(false, 'Failed to load configuration');
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleAsciiChange = (index, field, value) => {
        const newArts = [...(formData.asciiArts || [])];
        if (!newArts[index]) newArts[index] = {};
        newArts[index][field] = value;
        setFormData((prev) => ({ ...prev, asciiArts: newArts }));
    };

    const addAsciiArt = () => {
        setFormData((prev) => ({
            ...prev,
            asciiArts: [{ name: '', art: '' }, ...(prev.asciiArts || [])],
        }));
    };

    const removeAsciiArt = (index) => {
        const newArts = [...(formData.asciiArts || [])];
        newArts.splice(index, 1);
        setFormData((prev) => ({ ...prev, asciiArts: newArts }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ terminal: formData }),
            });

            if (res.ok) {
                showToast(true, 'Terminal configuration saved');
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Error saving config:', error);
            showToast(false, 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const showToast = (success, message) => {
        setToast({ success, message });
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) {
        return (
            <section className="adm-panel">
                <Loading label="Loading terminal configuration" rows={5} />
            </section>
        );
    }

    const asciiList = formData.asciiArts || [];

    return (
        <form onSubmit={handleSubmit} className="adm-split">
            <div className="adm-stack">
                <Panel title="Prompt appearance">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Username"
                            help="Displayed in the terminal prompt and returned by the whoami command."
                        >
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="guest"
                                className="adm-input font-mono"
                            />
                        </Field>

                        <Field
                            label="Prompt symbol"
                            help="Leading glyph shown before the working directory."
                        >
                            <input
                                type="text"
                                name="promptSymbol"
                                value={formData.promptSymbol}
                                onChange={handleChange}
                                placeholder="➜"
                                className="adm-input font-mono"
                            />
                        </Field>
                    </div>
                </Panel>

                <Panel title="Display options" flush>
                    <ul className="adm-list">
                        <li className="adm-row justify-between">
                            <div>
                                <p id="term-show-date" className="font-semibold text-[var(--text-bright)]">
                                    Show date command
                                </p>
                                <p className="adm-help">Allow visitors to check the system date in the terminal.</p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={Boolean(formData.showDate)}
                                aria-labelledby="term-show-date"
                                onClick={() => setFormData((prev) => ({ ...prev, showDate: !prev.showDate }))}
                                className="adm-switch"
                            />
                        </li>
                        <li className="adm-row justify-between">
                            <div>
                                <p id="term-show-branch" className="font-semibold text-[var(--text-bright)]">
                                    Show Git branch
                                </p>
                                <p className="adm-help">Display git:(master) next to the current directory in the prompt.</p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={Boolean(formData.showGitBranch)}
                                aria-labelledby="term-show-branch"
                                onClick={() => setFormData((prev) => ({ ...prev, showGitBranch: !prev.showGitBranch }))}
                                className="adm-switch"
                            />
                        </li>
                    </ul>
                </Panel>

                <Panel
                    title="ASCII art collection"
                    actions={
                        <button type="button" onClick={addAsciiArt} className="adm-btn">
                            <FaPlus aria-hidden="true" /> Add ASCII art
                        </button>
                    }
                    flush
                >
                    {asciiList.length === 0 ? (
                        <EmptyState
                            title="No custom ASCII art defined"
                            description="Add named ASCII art assets that can be rendered inside the interactive terminal."
                            action={
                                <button type="button" onClick={addAsciiArt} className="adm-btn adm-btn-primary">
                                    <FaPlus aria-hidden="true" /> Add first asset
                                </button>
                            }
                        />
                    ) : (
                        <ul className="adm-list">
                            {asciiList.map((item, index) => (
                                <li
                                    key={index}
                                    className="grid gap-4 p-4 sm:px-5 md:grid-cols-[14rem_minmax(0,1fr)_auto] md:items-start"
                                >
                                    <Field label="Asset name" help="Identifier used to summon this art.">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleAsciiChange(index, 'name', e.target.value)}
                                            placeholder="robot"
                                            className="adm-input font-mono"
                                        />
                                    </Field>

                                    <Field label="ASCII data">
                                        <textarea
                                            value={item.art}
                                            onChange={(e) => handleAsciiChange(index, 'art', e.target.value)}
                                            placeholder="Paste monospace ASCII art here…"
                                            rows={4}
                                            className="adm-input font-mono text-xs whitespace-pre"
                                        />
                                    </Field>

                                    <div className="flex justify-end md:pt-7">
                                        <button
                                            type="button"
                                            onClick={() => removeAsciiArt(index)}
                                            className="adm-icon-btn"
                                            aria-label={`Remove ASCII art ${item.name || index + 1}`}
                                        >
                                            <FaTrashCan aria-hidden="true" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>

            <aside className="adm-stack adm-side">
                <Panel title="Publish">
                    <dl className="adm-facts mb-4">
                        <div>
                            <dt>User</dt>
                            <dd>{formData.username || 'guest'}</dd>
                        </div>
                        <div>
                            <dt>ASCII assets</dt>
                            <dd>{asciiList.length}</dd>
                        </div>
                    </dl>
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={saving} className="adm-btn adm-btn-primary flex-1">
                            {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                            {saving ? 'Saving' : 'Save changes'}
                        </button>
                        <button type="button" onClick={() => router.back()} className="adm-btn">
                            Cancel
                        </button>
                    </div>
                </Panel>

                <Panel
                    title="Live prompt preview"
                    actions={<Badge tone="info">Interactive CLI</Badge>}
                >
                    <pre className="adm-code text-xs leading-relaxed">
                        <span className="text-[var(--adm-ok-ink)] font-semibold">{formData.promptSymbol || '➜'}</span>{' '}
                        <span className="text-[var(--text-bright)]">~</span>{' '}
                        {formData.showGitBranch && (
                            <span className="text-[var(--accent-purple)]">git:(master) </span>
                        )}
                        <span className="text-[var(--adm-accent-ink)]">
                            echo &quot;Hello {formData.username || 'guest'}!&quot;
                        </span>
                        {'\n'}
                        Hello {formData.username || 'guest'}!
                    </pre>
                </Panel>
            </aside>

            {toast && (
                <Toast
                    notification={toast}
                    onClose={() => setToast(null)}
                />
            )}
        </form>
    );
}
