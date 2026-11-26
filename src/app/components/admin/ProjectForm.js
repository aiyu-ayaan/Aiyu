"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FaArrowUpRightFromSquare,
    FaCodeBranch,
    FaFileArrowUp,
    FaFloppyDisk,
    FaImage,
    FaLock,
    FaLockOpen,
    FaSpinner,
    FaWandMagicSparkles,
} from 'react-icons/fa6';
import { PINNABLE_FIELDS } from '@/lib/projectSyncFields';
import Toast from './Toast';
import BlogLinkInput from './BlogLinkInput';
import DatePickerInput from './DatePickerInput';
import ProjectAppLinks from './ProjectAppLinks';
import { Badge, Field, Panel } from './ui';
import '@/app/styles/admin-projects.css';

const getStatusMeta = (status) => {
    const safeStatus = String(status || '').trim().toLowerCase();

    if (safeStatus === 'done' || safeStatus === 'completed') {
        return {
            tone: 'ok',
            label: 'Completed',
            message: 'Stable and published',
        };
    }

    if (safeStatus === 'deferred' || safeStatus === 'deffered' || safeStatus === 'on hold') {
        return {
            tone: undefined,
            label: 'Deferred',
            message: 'On hold or archived',
        };
    }

    return {
        tone: 'warn',
        label: 'In progress',
        message: 'Active work in progress',
    };
};

const ProjectForm = ({ initialData, isEdit = false }) => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        techStack: '',
        year: '',
        status: 'Done',
        projectType: '',
        description: '',
        codeLink: '',
        blogLink: '',
        image: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(null); // 'name', 'description', 'tech'
    const [uploadingFile, setUploadingFile] = useState(false);
    // Mirrors Project.pinnedFields. Sent explicitly on save so an unpin sticks —
    // the API only auto-pins when the body omits this field.
    const [pinnedFields, setPinnedFields] = useState([]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                techStack: Array.isArray(initialData.techStack) ? initialData.techStack.join(', ') : '',
            });
            setPinnedFields(Array.isArray(initialData.pinnedFields) ? initialData.pinnedFields : []);
        }
        checkAiConfig();
    }, [initialData]);

    const togglePinned = (field) => {
        setPinnedFields((current) =>
            current.includes(field)
                ? current.filter((entry) => entry !== field)
                : [...current, field]
        );
    };

    const checkAiConfig = async () => {
        try {
            const res = await fetch('/api/admin/ai/config');
            const data = await res.json();
            if (data.success && data.data) {
                setAiEnabled(data.data.enabled);
            }
        } catch (err) {
            console.error('Failed to fetch AI config:', err);
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
                context = { techStack: formData.techStack };
            } else if (mode === 'description') {
                apiMode = 'refine_project_description';
                prompt = formData.description;
            } else if (mode === 'tech') {
                apiMode = 'suggest_tech_stack';
                prompt = formData.description;
            }

            const res = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: apiMode,
                    prompt,
                    context,
                }),
            });

            const data = await res.json();

            if (data.success) {
                if (mode === 'name') {
                    const names = data.data.split(',').map((n) => n.trim());
                    setFormData((prev) => ({ ...prev, name: names[0] }));
                    showNotification(true, 'Project name suggested');
                } else if (mode === 'description') {
                    setFormData((prev) => ({ ...prev, description: data.data }));
                    showNotification(true, 'Description refined');
                } else if (mode === 'tech') {
                    setFormData((prev) => ({ ...prev, techStack: data.data }));
                    showNotification(true, 'Tech stack suggested');
                }
            } else {
                showNotification(false, data.error || 'AI suggestion failed');
            }
        } catch (err) {
            console.error('AI Error:', err);
            showNotification(false, 'Could not reach the AI service');
        } finally {
            setAiGenerating(null);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingFile(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData,
            });

            const data = await res.json();

            if (data.success) {
                setFormData((prev) => ({ ...prev, image: data.url }));
                showNotification(true, 'Image uploaded');
            } else {
                showNotification(false, data.error || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            showNotification(false, 'Upload failed');
        } finally {
            setUploadingFile(false);
        }
    };

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

        const techStack = formData.techStack
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        const payload = { ...formData, techStack };

        if (isSynced) {
            const edited = PINNABLE_FIELDS.filter((field) => {
                const next = field === 'techStack' ? techStack : formData[field];
                const previous = initialData?.[field];
                return JSON.stringify(next ?? '') !== JSON.stringify(previous ?? '');
            });
            payload.pinnedFields = [...new Set([...pinnedFields, ...edited])];
        }

        try {
            const url = isEdit ? `/api/projects/${initialData._id}` : '/api/projects';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showNotification(true, isEdit ? 'Project saved' : 'Project created');
                setTimeout(() => {
                    router.push('/admin/projects');
                    router.refresh();
                }, 1200);
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to save project');
            }
        } catch {
            setError('An error occurred while saving the project.');
            showNotification(false, 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const statusMeta = getStatusMeta(formData.status);
    const isSynced = initialData?.source === 'github';

    return (
        <form onSubmit={handleSubmit} className="adm-prj-split">
            <div className="adm-prj-stack">
                {error && (
                    <div role="alert" className="adm-notice adm-notice-error">
                        {error}
                    </div>
                )}

                {isSynced && (
                    <Panel
                        title="GitHub sync"
                        actions={
                            <Badge tone="info">
                                <FaCodeBranch aria-hidden="true" /> {initialData.repoFullName || 'Synced'}
                            </Badge>
                        }
                    >
                        <p className="adm-help mb-3">
                            Editing a field pins it so future repository syncs preserve your version. Unpin a field to allow GitHub to refresh it.
                            {initialData.syncedAt && (
                                <span className="ml-1 font-mono">
                                    (Last synced {new Date(initialData.syncedAt).toLocaleDateString()})
                                </span>
                            )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {PINNABLE_FIELDS.map((field) => {
                                const pinned = pinnedFields.includes(field);
                                return (
                                    <button
                                        key={field}
                                        type="button"
                                        onClick={() => togglePinned(field)}
                                        aria-pressed={pinned}
                                        className="adm-prj-chip"
                                    >
                                        {pinned ? (
                                            <FaLock aria-hidden="true" />
                                        ) : (
                                            <FaLockOpen aria-hidden="true" />
                                        )}
                                        <span>{field}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Panel>
                )}

                <Panel title="Project identity">
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="adm-field md:col-span-1">
                                <div className="flex min-h-5 items-center justify-between gap-2">
                                    <label htmlFor="project-name" className="adm-label">
                                        Project name
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
                                    id="project-name"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="adm-input"
                                    required
                                    placeholder="e.g. Portfolio CMS"
                                />
                            </div>

                            <Field label="Category">
                                <input
                                    type="text"
                                    name="projectType"
                                    value={formData.projectType}
                                    onChange={handleChange}
                                    className="adm-input"
                                    required
                                    placeholder="Web app / CLI / Library"
                                />
                            </Field>

                            <div className="adm-field">
                                <label htmlFor="project-year" className="adm-label">
                                    Timeline or year
                                </label>
                                <DatePickerInput
                                    name="year"
                                    value={formData.year}
                                    onChange={(val) => setFormData((prev) => ({ ...prev, year: val }))}
                                    mode="single"
                                    placeholder="2025"
                                    required
                                />
                            </div>
                        </div>

                        <div className="adm-field">
                            <div className="flex min-h-5 items-center justify-between gap-2">
                                <label htmlFor="project-description" className="adm-label">
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
                                id="project-description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                                className="adm-input"
                                required
                                placeholder="Summarize what this project does and how it is built..."
                            />
                        </div>
                    </div>
                </Panel>

                <Panel title="Technical details and links">
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="adm-field">
                                <div className="flex min-h-5 items-center justify-between gap-2">
                                    <label htmlFor="project-techStack" className="adm-label">
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
                                    id="project-techStack"
                                    type="text"
                                    name="techStack"
                                    value={formData.techStack}
                                    onChange={handleChange}
                                    className="adm-input font-mono"
                                    placeholder="React, Next.js, Tailwind, PostgreSQL"
                                    required
                                />
                                <p className="adm-help">Comma-separated list of languages, frameworks, and tools.</p>
                            </div>

                            <Field label="Repository or live URL" help="Source repository or primary project link.">
                                <input
                                    type="url"
                                    name="codeLink"
                                    value={formData.codeLink}
                                    onChange={handleChange}
                                    className="adm-input font-mono"
                                    placeholder="https://github.com/..."
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
                        <Field label="Development status" help={statusMeta.message}>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="adm-input"
                            >
                                <option value="Done">Done (Completed)</option>
                                <option value="In Progress">In Progress (Active)</option>
                                <option value="Deferred">Deferred (On Hold)</option>
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
                                {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create project'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="adm-btn"
                            >
                                Cancel
                            </button>
                        </div>

                        {(initialData?.slug || formData.codeLink) && (
                            <div className="pt-3 border-t border-[var(--hairline)] flex flex-wrap gap-2">
                                {initialData?.slug && (
                                    <Link
                                        href={`/projects/${initialData.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="adm-btn flex-1"
                                    >
                                        View page <FaArrowUpRightFromSquare aria-hidden="true" className="text-xs" />
                                    </Link>
                                )}
                                {formData.codeLink && (
                                    <a
                                        href={formData.codeLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="adm-btn flex-1"
                                    >
                                        Open repo <FaArrowUpRightFromSquare aria-hidden="true" className="text-xs" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </Panel>

                {isEdit && initialData?._id && <ProjectAppLinks project={initialData} />}

                <Panel
                    title="Cover image"
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
                                    alt="Project cover preview"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <>
                                    <FaImage aria-hidden="true" className="text-lg" />
                                    <span>No image selected</span>
                                </>
                            )}
                        </div>
                    </div>
                </Panel>
            </aside>

            <Toast notification={notification} />
        </form>
    );
};

export default ProjectForm;
