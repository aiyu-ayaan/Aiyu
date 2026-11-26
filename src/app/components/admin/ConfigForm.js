"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaDownload, FaFileArrowUp, FaFloppyDisk, FaSpinner, FaWandMagicSparkles } from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Field, Loading, Panel } from './ui';
import '@/app/styles/admin-system.css';

const PAGE_HEADERS = [
    { section: 'projects' },
    { section: 'blogs', multiline: true },
    { section: 'gallery' },
];

const ConfigForm = () => {
    const router = useRouter();
    const { toast } = useAdminFeedback();
    const [formData, setFormData] = useState({
        googleAnalyticsId: '',
        logoText: '< aiyu />',
        resume: {
            type: 'url',
            value: '',
            filename: '',
        },
        projectsTitle: '',
        projectsSubtitle: '',
        blogsTitle: '',
        blogsSubtitle: '',
        galleryTitle: '',
        gallerySubtitle: '',
        desktopWallpaper: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(null); // 'projects', 'blogs', 'gallery'

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

    const handleAiAction = async (section) => {
        if (aiGenerating) return;
        setAiGenerating(section);

        try {
            const titleMap = {
                projects: formData.projectsTitle,
                blogs: formData.blogsTitle,
                gallery: formData.galleryTitle
            };

            const res = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'generate_subtitle',
                    prompt: titleMap[section],
                    context: { section }
                })
            });

            const data = await res.json();

            if (data.success) {
                const key = `${section}Subtitle`;
                setFormData(prev => ({ ...prev, [key]: data.data }));
                showNotification(true, `${section.charAt(0).toUpperCase() + section.slice(1)} subtitle generated!`);
            } else {
                showNotification(false, data.error || 'Could not generate a subtitle. Try again.');
            }
        } catch (error) {
            console.error('AI Error:', error);
            showNotification(false, 'Could not reach the AI service. Try again.');
        } finally {
            setAiGenerating(null);
        }
    };

    const fetchData = async () => {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        googleAnalyticsId: data.googleAnalyticsId || '',
                        logoText: data.logoText || '< aiyu />',
                        resume: {
                            type: data.resume?.type || 'url',
                            value: data.resume?.value || '',
                            filename: data.resume?.filename || '',
                        },
                        projectsTitle: data.projectsTitle || 'Projects Portfolio',
                        projectsSubtitle: data.projectsSubtitle || 'A collection of my work',
                        blogsTitle: data.blogsTitle || 'Latest Insights',
                        blogsSubtitle: data.blogsSubtitle || 'Thoughts, tutorials, and updates on web development and technology.',
                        galleryTitle: data.galleryTitle || 'Gallery',
                        gallerySubtitle: data.gallerySubtitle || 'A visual journey through my lens.',
                        desktopWallpaper: data.desktopWallpaper || '',
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch config', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const showNotification = (success, message) => {
        toast(message, { success });
    };

    // Resume Handlers
    const handleResumeTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            resume: { ...prev.resume, type }
        }));
    };

    const handleResumeValueChange = (value) => {
        setFormData(prev => ({
            ...prev,
            resume: { ...prev.resume, value }
        }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError("File size too large. Max 5MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    resume: {
                        ...prev.resume,
                        type: 'file',
                        value: reader.result, // Base64 string
                        filename: file.name
                    }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch('/api/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                showNotification(true, 'Changes saved');
                router.refresh();
                fetchData(); // Refresh data
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

    if (loading) return <section className="adm-panel"><Loading label="Loading settings" rows={6} /></section>;

    const resumeType = formData.resume.type;

    return (
        <form onSubmit={handleSubmit} className="adm-split">
            <div className="adm-stack">
                {error && <div role="alert" className="adm-notice adm-notice-error">{error}</div>}

                <div className="grid gap-6 lg:grid-cols-2">
                    <Panel title="Branding">
                        <Field label="Logo text" help="Shown at the top left of the site header.">
                            <input type="text" name="logoText" value={formData.logoText} onChange={handleChange} placeholder="< aiyu />" className="adm-input font-mono" />
                        </Field>
                    </Panel>
                    <Panel title="Analytics">
                        <Field label="Google Analytics measurement ID" help="Starts with G-.">
                            <input type="text" name="googleAnalyticsId" value={formData.googleAnalyticsId} onChange={handleChange} placeholder="G-XXXXXXXXXX" className="adm-input font-mono" />
                        </Field>
                    </Panel>
                </div>

                <Panel title="Page headers" flush>
                    <ul className="adm-list">
                        {PAGE_HEADERS.map(({ section, multiline }) => {
                            const Subtitle = multiline ? 'textarea' : 'input';
                            return (
                                <li key={section} className="grid gap-4 p-4 sm:px-5 md:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1.5fr)]">
                                    <h3 className="font-mono text-sm text-[var(--text-bright)] md:pt-8">/{section}</h3>
                                    <Field label="Title">
                                        <input type="text" name={`${section}Title`} value={formData[`${section}Title`]} onChange={handleChange} className="adm-input" />
                                    </Field>
                                    <div className="adm-field">
                                        <div className="flex min-h-5 items-center justify-between gap-2">
                                            <label htmlFor={`${section}Subtitle`} className="adm-label">Subtitle</label>
                                            {aiEnabled && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAiAction(section)}
                                                    disabled={aiGenerating === section || !formData[`${section}Title`]}
                                                    className="adm-btn adm-btn-quiet -my-2"
                                                    aria-label={`Suggest ${section} subtitle with AI`}
                                                >
                                                    {aiGenerating === section ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaWandMagicSparkles aria-hidden="true" />}
                                                    Suggest
                                                </button>
                                            )}
                                        </div>
                                        <Subtitle
                                            id={`${section}Subtitle`}
                                            name={`${section}Subtitle`}
                                            value={formData[`${section}Subtitle`]}
                                            onChange={handleChange}
                                            {...(multiline ? { rows: 2 } : { type: 'text' })}
                                            className={`adm-input ${multiline ? '!min-h-10' : ''}`}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Panel>

                <Panel title="Desktop (Aiyu OS)">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <Field className="flex-1" label="Wallpaper URL" help="Background of /desktop. Leave blank for the default bloom.">
                            <input type="text" name="desktopWallpaper" value={formData.desktopWallpaper} onChange={handleChange} placeholder="https://… or /uploads/wallpaper.webp" className="adm-input font-mono" />
                        </Field>
                        <div
                            role="img"
                            aria-label="Wallpaper preview"
                            className="aspect-video w-full shrink-0 rounded-[10px] border border-[var(--hairline-strong)] bg-cover bg-center sm:w-56"
                            style={
                                formData.desktopWallpaper
                                    ? { backgroundImage: `url(${formData.desktopWallpaper})` }
                                    : { background: 'radial-gradient(140% 120% at 28% 18%, #58a6ff 0%, #2f7be0 28%, #1e4fb0 52%, #122a7a 74%, #0a1550 100%)' }
                            }
                        />
                    </div>
                </Panel>

                <Panel title="Resume">
                    <div className="space-y-4">
                        <fieldset>
                            <legend className="adm-label mb-1.5">Source</legend>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {[['url', 'Link to a file'], ['file', 'Upload a file']].map(([type, label]) => (
                                    <label key={type} className="adm-choice">
                                        <input type="radio" name="resumeType" checked={resumeType === type} onChange={() => handleResumeTypeChange(type)} className="adm-check" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        {resumeType === 'url' ? (
                            <Field label="Resume URL">
                                <input type="url" value={formData.resume.value} onChange={(e) => handleResumeValueChange(e.target.value)} placeholder="https://example.com/my-resume.pdf" className="adm-input font-mono" />
                            </Field>
                        ) : (
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="adm-choice flex-1 basis-64">
                                    <FaFileArrowUp aria-hidden="true" className="shrink-0" />
                                    <span className="truncate">{formData.resume.filename || 'Choose a PDF or Word file (max 5MB)'}</span>
                                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} className="sr-only" />
                                </label>
                                {formData.resume.value && formData.resume.type === 'file' && formData.resume.value.startsWith('data:') && (
                                    <a href={formData.resume.value} download={formData.resume.filename || 'resume.pdf'} className="adm-btn">
                                        <FaDownload aria-hidden="true" /> Download current
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </Panel>
            </div>

            <aside className="adm-stack adm-side">
                <Panel title="Publish">
                    <p className="adm-help mb-4">Changes apply to the public site once saved.</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={saving} className="adm-btn adm-btn-primary flex-1">
                            {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                            {saving ? 'Saving' : 'Save changes'}
                        </button>
                        <button type="button" onClick={() => router.back()} className="adm-btn">Cancel</button>
                    </div>
                </Panel>
                <Panel title="Related" flush>
                    <ul className="adm-list">
                        <li><Link href="/admin/social" className="adm-row adm-link">Social and metadata (SEO)</Link></li>
                        <li><Link href="/admin/resources" className="adm-row adm-link">Upload storage</Link></li>
                        <li><Link href="/admin/settings" className="adm-row adm-link">Section stages</Link></li>
                    </ul>
                </Panel>
            </aside>

        </form>
    );
};

export default ConfigForm;