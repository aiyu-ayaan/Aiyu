"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FaArrowUpRightFromSquare,
    FaFileArrowUp,
    FaFloppyDisk,
    FaImage,
    FaPlus,
    FaScaleBalanced,
    FaSpinner,
    FaWandMagicSparkles,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import BlogLinkInput from './BlogLinkInput';
import { Badge, Field, Panel } from './ui';
import '@/app/styles/admin-projects.css';

const getStatusMeta = (status) => {
    const safeStatus = String(status || '').trim().toLowerCase();

    if (safeStatus === 'live') {
        return {
            tone: 'ok',
            label: 'Live',
            message: 'Serving public traffic',
        };
    }

    if (safeStatus === 'maintenance') {
        return {
            tone: 'warn',
            label: 'Maintenance',
            message: 'In a maintenance window',
        };
    }

    if (safeStatus === 'private') {
        return {
            tone: 'info',
            label: 'Private',
            message: 'Internal access only',
        };
    }

    return {
        tone: undefined,
        label: 'Archived',
        message: 'Retired or offline',
    };
};

export default function DeploymentForm({ initialData, isEdit = false, defaultProjectId = '' }) {
    const router = useRouter();
    const { toast } = useAdminFeedback();
    const [formData, setFormData] = useState({
        name: '',
        appType: '',
        environment: 'Production',
        status: 'Live',
        hostingProvider: '',
        description: '',
        hostedUrl: '',
        blogLink: '',
        techStack: '',
        image: '',
        projectId: '',
    });
    const [projects, setProjects] = useState([]);
    const [legalApp, setLegalApp] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(null);

    useEffect(() => {
        if (!initialData) return;

        setFormData({
            ...initialData,
            techStack: Array.isArray(initialData.techStack) ? initialData.techStack.join(', ') : '',
            projectId: initialData.projectId || '',
        });
    }, [initialData]);

    useEffect(() => {
        fetch('/api/projects')
            .then((response) => (response.ok ? response.json() : []))
            .then((rows) => setProjects(Array.isArray(rows) ? rows : []))
            .catch(() => setProjects([]));
    }, []);

    // Legal pages are owned by a LegalApp that points at this deployment.
    useEffect(() => {
        if (!isEdit || !initialData?._id) return;
        fetch('/api/legal/apps')
            .then((response) => (response.ok ? response.json() : []))
            .then((apps) => setLegalApp((Array.isArray(apps) ? apps : []).find((app) => app.deploymentId === initialData._id) || null))
            .catch(() => setLegalApp(null));
    }, [isEdit, initialData?._id]);

    // /admin/apps/new?projectId=… arrives here once the project list loads.
    useEffect(() => {
        if (isEdit || !defaultProjectId || projects.length === 0) return;
        applyProject(defaultProjectId);
    }, [isEdit, defaultProjectId, projects]);

    /**
     * Link a project. On a new app, empty fields are pre-filled from the
     * project so publishing an existing project as an app is one click; the
     * matching name also gives /apps/<slug> the same slug as /projects/<slug>.
     */
    const applyProject = (projectId) => {
        const project = projects.find((item) => item._id === projectId);
        setFormData((previous) => {
            const next = { ...previous, projectId };
            if (!project || isEdit) return next;
            return {
                ...next,
                name: previous.name || project.name || '',
                description: previous.description || project.description || '',
                techStack: previous.techStack || (Array.isArray(project.techStack) ? project.techStack.join(', ') : ''),
                image: previous.image || project.image || '',
                blogLink: previous.blogLink || project.blogLink || '',
                hostedUrl: previous.hostedUrl || project.repoData?.homepage || '',
            };
        });
    };

    const linkedProject = projects.find((item) => item._id === formData.projectId);

    useEffect(() => {
        checkAiConfig();
    }, []);

    const checkAiConfig = async () => {
        try {
            const response = await fetch('/api/admin/ai/config');
            const data = await response.json();
            if (data.success && data.data) {
                setAiEnabled(data.data.enabled);
            }
        } catch (configError) {
            console.error('Failed to fetch AI config:', configError);
        }
    };

    const showNotification = (success, message) => {
        if (success) {
            toast.success(message);
        } else {
            toast.error(message);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadingFile(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData,
            });
            const data = await response.json();

            if (data.success) {
                setFormData((previous) => ({ ...previous, image: data.url }));
                showNotification(true, 'Preview image uploaded');
            } else {
                showNotification(false, data.error || 'Upload failed');
            }
        } catch (uploadError) {
            console.error('Upload error:', uploadError);
            showNotification(false, 'Upload failed');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleAiAction = async (mode) => {
        if (aiGenerating) return;
        setAiGenerating(mode);

        try {
            let apiMode = 'proofread';
            let prompt = '';
            let context = {};

            if (mode === 'name') {
                apiMode = 'suggest_project_name';
                prompt = formData.description;
                context = {
                    appType: formData.appType,
                    hostingProvider: formData.hostingProvider,
                    environment: formData.environment,
                    techStack: formData.techStack,
                };
            } else if (mode === 'description') {
                apiMode = 'refine_project_description';
                prompt = formData.description;
                context = {
                    name: formData.name,
                    appType: formData.appType,
                    hostingProvider: formData.hostingProvider,
                };
            } else if (mode === 'tech') {
                apiMode = 'suggest_tech_stack';
                prompt = `${formData.name}\n${formData.description}`;
                context = {
                    appType: formData.appType,
                    environment: formData.environment,
                    hostingProvider: formData.hostingProvider,
                };
            }

            const response = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: apiMode,
                    prompt,
                    context,
                }),
            });

            const data = await response.json();

            if (data.success) {
                if (mode === 'name') {
                    const names = String(data.data || '')
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean);
                    if (names.length > 0) {
                        setFormData((previous) => ({ ...previous, name: names[0] }));
                    }
                    showNotification(true, 'App name suggested');
                } else if (mode === 'description') {
                    setFormData((previous) => ({ ...previous, description: data.data }));
                    showNotification(true, 'Description refined');
                } else if (mode === 'tech') {
                    setFormData((previous) => ({ ...previous, techStack: data.data }));
                    showNotification(true, 'Tech stack suggested');
                }
            } else {
                showNotification(false, data.error || 'AI suggestion failed');
            }
        } catch (aiError) {
            console.error('AI Error:', aiError);
            showNotification(false, 'AI suggestion failed');
        } finally {
            setAiGenerating(null);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            ...formData,
            techStack: formData.techStack
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            hostedUrl: (formData.hostedUrl || '').trim(),
            blogLink: formData.blogLink ? formData.blogLink.trim() : '',
            image: (formData.image || '').trim(),
            projectId: formData.projectId || null,
        };

        try {
            const url = isEdit ? `/api/deployments/${initialData._id}` : '/api/deployments';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showNotification(true, isEdit ? 'App saved' : 'App created');
                setTimeout(() => {
                    router.push('/admin/apps');
                    router.refresh();
                }, 1200);
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to save app');
            }
        } catch (submitError) {
            console.error('Save app error:', submitError);
            setError('An error occurred while saving the app.');
            showNotification(false, 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const statusMeta = getStatusMeta(formData.status);

    return (
        <form onSubmit={handleSubmit} className="adm-prj-split">
            <div className="adm-prj-stack">
                {error && (
                    <div role="alert" className="adm-notice adm-notice-error">
                        {error}
                    </div>
                )}

                <Panel title="App identity">
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="adm-field">
                                <div className="flex min-h-5 items-center justify-between gap-2">
                                    <label htmlFor="app-name" className="adm-label">
                                        App name
                                    </label>
                                    {aiEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleAiAction('name')}
                                            disabled={aiGenerating === 'name' || !formData.description}
                                            className="adm-btn adm-btn-quiet -my-2 !px-2 text-xs"
                                        >
                                            {aiGenerating === 'name' ? (
                                                <FaSpinner className="animate-spin" aria-hidden="true" />
                                            ) : (
                                                <FaWandMagicSparkles aria-hidden="true" />
                                            )}
                                            Suggest
                                        </button>
                                    )}
                                </div>
                                <input
                                    id="app-name"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="adm-input"
                                    placeholder="Payments API"
                                    required
                                />
                            </div>

                            <Field label="App type">
                                <input
                                    type="text"
                                    name="appType"
                                    value={formData.appType}
                                    onChange={handleChange}
                                    className="adm-input"
                                    placeholder="API / Web app / Worker"
                                    required
                                />
                            </Field>
                        </div>

                        <div className="adm-field">
                            <div className="flex min-h-5 items-center justify-between gap-2">
                                <label htmlFor="app-description" className="adm-label">
                                    Description
                                </label>
                                {aiEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleAiAction('description')}
                                        disabled={aiGenerating === 'description' || !formData.description}
                                        className="adm-btn adm-btn-quiet -my-2 !px-2 text-xs"
                                    >
                                        {aiGenerating === 'description' ? (
                                            <FaSpinner className="animate-spin" aria-hidden="true" />
                                        ) : (
                                            <FaWandMagicSparkles aria-hidden="true" />
                                        )}
                                        Refine
                                    </button>
                                )}
                            </div>
                            <textarea
                                id="app-description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="5"
                                className="adm-input"
                                placeholder="Explain what this app does and why it exists..."
                                required
                            />
                        </div>
                    </div>
                </Panel>

                <Panel title="Runtime and links">
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Hosting provider">
                                <input
                                    type="text"
                                    name="hostingProvider"
                                    value={formData.hostingProvider}
                                    onChange={handleChange}
                                    className="adm-input"
                                    placeholder="Vercel / AWS / Cloudflare"
                                    required
                                />
                            </Field>

                            <Field label="Environment">
                                <input
                                    type="text"
                                    name="environment"
                                    value={formData.environment}
                                    onChange={handleChange}
                                    className="adm-input"
                                    placeholder="Production / Staging"
                                    required
                                />
                            </Field>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="adm-field">
                                <div className="flex min-h-5 items-center justify-between gap-2">
                                    <label htmlFor="app-techStack" className="adm-label">
                                        Tech stack
                                    </label>
                                    {aiEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleAiAction('tech')}
                                            disabled={aiGenerating === 'tech' || !formData.description}
                                            className="adm-btn adm-btn-quiet -my-2 !px-2 text-xs"
                                        >
                                            {aiGenerating === 'tech' ? (
                                                <FaSpinner className="animate-spin" aria-hidden="true" />
                                            ) : (
                                                <FaWandMagicSparkles aria-hidden="true" />
                                            )}
                                            Suggest
                                        </button>
                                    )}
                                </div>
                                <input
                                    id="app-techStack"
                                    type="text"
                                    name="techStack"
                                    value={formData.techStack}
                                    onChange={handleChange}
                                    className="adm-input font-mono"
                                    placeholder="Next.js, Node.js, PostgreSQL"
                                    required
                                />
                                <p className="adm-help">Comma-separated list of technologies.</p>
                            </div>

                            <Field label="Hosted URL" help="Public endpoint or web application address.">
                                <input
                                    type="url"
                                    name="hostedUrl"
                                    value={formData.hostedUrl}
                                    onChange={handleChange}
                                    className="adm-input font-mono"
                                    placeholder="https://app.example.com"
                                />
                            </Field>
                        </div>

                        <BlogLinkInput value={formData.blogLink} onChange={handleChange} />
                    </div>
                </Panel>
            </div>

            <aside className="adm-prj-stack adm-prj-side">
                <Panel
                    title="Publish"
                    actions={<Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>}
                >
                    <div className="space-y-4">
                        <Field label="App status" help={statusMeta.message}>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="adm-input"
                            >
                                <option value="Live">Live</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Private">Private</option>
                                <option value="Archived">Archived</option>
                            </select>
                        </Field>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="adm-btn adm-btn-primary flex-1"
                            >
                                {loading ? (
                                    <FaSpinner className="animate-spin" aria-hidden="true" />
                                ) : (
                                    <FaFloppyDisk aria-hidden="true" />
                                )}
                                {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create app'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="adm-btn"
                            >
                                Cancel
                            </button>
                        </div>

                        {(initialData?.slug || formData.hostedUrl) && (
                            <div className="pt-3 border-t border-[var(--hairline)] flex flex-wrap gap-2">
                                {initialData?.slug && (
                                    <Link
                                        href={`/apps/${initialData.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="adm-btn flex-1"
                                    >
                                        View page <FaArrowUpRightFromSquare aria-hidden="true" className="text-xs" />
                                    </Link>
                                )}
                                {formData.hostedUrl && (
                                    <a
                                        href={formData.hostedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="adm-btn flex-1"
                                    >
                                        Open URL <FaArrowUpRightFromSquare aria-hidden="true" className="text-xs" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </Panel>

                <Panel title="Related links">
                    <div className="space-y-4">
                        <Field
                            id="deployment-project"
                            label="Linked project"
                            help={
                                linkedProject
                                    ? `Cross-links with /projects/${linkedProject.slug || linkedProject._id}.`
                                    : 'Link the portfolio project this app is built from.'
                            }
                        >
                            <select
                                id="deployment-project"
                                value={formData.projectId}
                                onChange={(event) => applyProject(event.target.value)}
                                className="adm-input"
                            >
                                <option value="">Not linked</option>
                                {projects.map((project) => (
                                    <option key={project._id} value={project._id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <div className="pt-3 border-t border-[var(--hairline)] space-y-2">
                            <p className="adm-label flex items-center gap-2">
                                <FaScaleBalanced aria-hidden="true" className="text-[var(--adm-hint)]" />
                                <span>Legal pages</span>
                            </p>
                            {legalApp ? (
                                <div className="space-y-2">
                                    <ul className="space-y-1">
                                        {(legalApp.documents || []).map((doc) => (
                                            <li
                                                key={doc._id}
                                                className="font-mono text-xs text-[var(--text-secondary)] break-all"
                                            >
                                                /{legalApp.slug}/{doc.slug}
                                                {!doc.published && ' (draft)'}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link href={`/admin/legal/${legalApp._id}`} className="adm-btn w-full">
                                        Manage legal pages
                                    </Link>
                                </div>
                            ) : isEdit && initialData?._id ? (
                                <Link
                                    href={`/admin/legal/new?deploymentId=${initialData._id}`}
                                    className="adm-btn w-full"
                                >
                                    <FaPlus aria-hidden="true" /> Add privacy policy or terms
                                </Link>
                            ) : (
                                <p className="adm-help">Save the app first, then attach its legal pages.</p>
                            )}
                        </div>
                    </div>
                </Panel>

                <Panel
                    title="Preview image"
                    actions={
                        <label className="adm-btn cursor-pointer">
                            {uploadingFile ? (
                                <FaSpinner className="animate-spin" aria-hidden="true" />
                            ) : (
                                <FaFileArrowUp aria-hidden="true" />
                            )}
                            <span>{uploadingFile ? 'Uploading...' : 'Upload'}</span>
                            <input
                                type="file"
                                className="sr-only"
                                accept="image/*,.heic,.heif"
                                onChange={handleFileUpload}
                                disabled={uploadingFile}
                            />
                        </label>
                    }
                >
                    <div className="space-y-3">
                        <Field label="Image URL">
                            <input
                                type="text"
                                name="image"
                                value={formData.image}
                                onChange={handleChange}
                                className="adm-input font-mono"
                                placeholder="/uploads/... or https://..."
                            />
                        </Field>
                        <div className="adm-prj-preview">
                            {formData.image ? (
                                <img
                                    src={formData.image}
                                    alt="App cover preview"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <>
                                    <FaImage aria-hidden="true" className="text-lg" />
                                    <span>No preview image</span>
                                </>
                            )}
                        </div>
                    </div>
                </Panel>
            </aside>

        </form>
    );
}
