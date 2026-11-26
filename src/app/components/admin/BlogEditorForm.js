"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    FaArrowLeft,
    FaCheck,
    FaWandMagicSparkles,
    FaUpload,
    FaTrash,
    FaArrowUpRightFromSquare,
} from 'react-icons/fa6';
import MarkdownToolbar from '@/app/components/admin/MarkdownToolbar';
import Toast from '@/app/components/admin/Toast';
import { PageHeader, Panel, Badge, Loading, Field } from '@/app/components/admin/ui';
import '@/app/styles/admin-blogs.css';

function getTodayInputDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toInputDate(rawDate) {
    if (!rawDate) return getTodayInputDate();
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return getTodayInputDate();

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toDisplayDate(inputDate) {
    const [year, month, day] = String(inputDate || '').split('-').map(Number);
    if (!year || !month || !day) {
        return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function hasAnyAdvancedValue(blog = {}) {
    return [
        blog?.seoTitle,
        blog?.seoDescription,
        blog?.canonicalUrl,
        blog?.keywords,
        blog?.socialTitle,
        blog?.socialDescription,
        blog?.socialImage,
        blog?.socialImageAlt,
    ].some((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return String(value || '').trim().length > 0;
    }) || blog?.noIndex === true;
}

const defaultFormState = {
    title: '',
    seoTitle: '',
    excerpt: '',
    seoDescription: '',
    content: '',
    image: '',
    imageAlt: '',
    socialTitle: '',
    socialDescription: '',
    socialImage: '',
    socialImageAlt: '',
    canonicalUrl: '',
    tags: '',
    keywords: '',
    date: getTodayInputDate(),
    published: false,
    noIndex: false,
};

export default function BlogEditorForm({ mode = 'create', blogId = null }) {
    const router = useRouter();
    const contentRef = useRef(null);
    const coverInputRef = useRef(null);
    const socialInputRef = useRef(null);

    const isEditMode = mode === 'edit';
    const [loading, setLoading] = useState(isEditMode);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingField, setUploadingField] = useState('');
    const [formData, setFormData] = useState(defaultFormState);
    const [notification, setNotification] = useState(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPreview, setAiPreview] = useState('');
    const [aiMode, setAiMode] = useState('');
    const [showAiPreview, setShowAiPreview] = useState(false);

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        if (!isEditMode || !blogId) return;

        let isMounted = true;
        const fetchBlog = async () => {
            try {
                const res = await fetch(`/api/blogs/${blogId}`);
                const payload = await res.json();

                if (!res.ok || !payload?.success) {
                    throw new Error(payload?.error || 'Failed to load blog');
                }

                if (!isMounted) return;
                const blog = payload.data;
                setFormData({
                    title: blog?.title || '',
                    seoTitle: blog?.seoTitle || '',
                    excerpt: blog?.excerpt || '',
                    seoDescription: blog?.seoDescription || '',
                    content: blog?.content || '',
                    image: blog?.image || '',
                    imageAlt: blog?.imageAlt || '',
                    socialTitle: blog?.socialTitle || '',
                    socialDescription: blog?.socialDescription || '',
                    socialImage: blog?.socialImage || '',
                    socialImageAlt: blog?.socialImageAlt || '',
                    canonicalUrl: blog?.canonicalUrl || '',
                    tags: Array.isArray(blog?.tags) ? blog.tags.join(', ') : '',
                    keywords: Array.isArray(blog?.keywords) ? blog.keywords.join(', ') : '',
                    date: toInputDate(blog?.date),
                    published: blog?.published === true,
                    noIndex: blog?.noIndex === true,
                });

                if (hasAnyAdvancedValue(blog)) {
                    setAdvancedOpen(true);
                }
            } catch (error) {
                console.error(error);
                showNotification(false, 'Could not load this blog post');
                router.push('/admin/blogs');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchBlog();
        return () => {
            isMounted = false;
        };
    }, [blogId, isEditMode, router]);

    useEffect(() => {
        const fetchAiConfig = async () => {
            try {
                const res = await fetch('/api/admin/ai/config');
                const data = await res.json();
                if (data?.success && data?.data?.enabled) {
                    setAiEnabled(true);
                }
            } catch (error) {
                console.error('Failed to fetch AI config', error);
            }
        };

        fetchAiConfig();
    }, []);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const uploadImage = async (file, fieldName) => {
        if (!file) return;
        setUploadingField(fieldName);

        try {
            const body = new FormData();
            body.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body });
            const payload = await res.json();

            if (!res.ok || !payload?.success) {
                throw new Error(payload?.error || 'Upload failed');
            }

            setFormData((prev) => ({ ...prev, [fieldName]: payload.url }));
            showNotification(true, 'Image uploaded');
        } catch (error) {
            console.error(error);
            showNotification(false, error?.message || 'Upload failed');
        } finally {
            setUploadingField('');
        }
    };

    const runAiAction = async (actionMode) => {
        if (aiLoading) return;
        if (!aiEnabled) {
            showNotification(false, 'AI is not enabled. Turn it on from Admin > AI.');
            return;
        }

        let prompt = '';
        let endpointMode = '';

        if (actionMode === 'suggest_title') {
            prompt = formData.content;
            endpointMode = 'suggest_title';
            if (!prompt.trim()) {
                showNotification(false, 'Add some content first.');
                return;
            }
        } else if (actionMode === 'suggest_excerpt') {
            prompt = formData.content || formData.title;
            endpointMode = 'suggest_excerpt';
            if (!prompt.trim()) {
                showNotification(false, 'Add a title or content first.');
                return;
            }
        } else if (actionMode === 'suggest_tags') {
            prompt = formData.content || formData.title;
            endpointMode = 'suggest_tags';
            if (!prompt.trim()) {
                showNotification(false, 'Add a title or content first.');
                return;
            }
        } else if (actionMode === 'proofread') {
            prompt = formData.content;
            endpointMode = 'proofread';
            if (!prompt.trim()) {
                showNotification(false, 'No content to refine.');
                return;
            }
        } else if (actionMode === 'continue') {
            prompt = formData.content;
            endpointMode = 'continue_blog';
            if (!prompt.trim()) {
                showNotification(false, 'No content to continue from.');
                return;
            }
        } else if (actionMode === 'generate') {
            prompt = formData.title;
            endpointMode = 'generate_blog';
            if (!prompt.trim()) {
                showNotification(false, 'Add a title first.');
                return;
            }
        }

        setAiLoading(true);
        setAiMode(actionMode);

        try {
            const res = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: endpointMode,
                    prompt,
                    context: {
                        title: formData.title,
                        tags: formData.tags
                    }
                })
            });
            const data = await res.json();
            if (!data?.success) {
                throw new Error(data?.error || 'AI request failed');
            }

            if (actionMode === 'suggest_title') {
                setFormData((prev) => ({ ...prev, title: String(data.data || '') }));
                showNotification(true, 'AI title applied');
            } else if (actionMode === 'suggest_excerpt') {
                setFormData((prev) => ({ ...prev, excerpt: String(data.data || '') }));
                showNotification(true, 'AI excerpt applied');
            } else if (actionMode === 'suggest_tags') {
                setFormData((prev) => ({ ...prev, tags: String(data.data || '') }));
                showNotification(true, 'AI tags applied');
            } else {
                setAiPreview(String(data.data || ''));
                setShowAiPreview(true);
            }
        } catch (error) {
            console.error(error);
            showNotification(false, error?.message || 'AI action failed');
        } finally {
            setAiLoading(false);
        }
    };

    const applyAiPreview = () => {
        if (!aiPreview.trim()) return;
        if (aiMode === 'continue') {
            setFormData((prev) => ({ ...prev, content: `${prev.content}\n\n${aiPreview}` }));
        } else {
            setFormData((prev) => ({ ...prev, content: aiPreview }));
        }
        setShowAiPreview(false);
        setAiPreview('');
        setAiMode('');
        showNotification(true, 'AI content applied');
    };

    const discardAiPreview = () => {
        setShowAiPreview(false);
        setAiPreview('');
        setAiMode('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        const payload = {
            ...formData,
            date: toDisplayDate(formData.date),
            tags: formData.tags.split(',').map((entry) => entry.trim()).filter(Boolean),
            keywords: formData.keywords.split(',').map((entry) => entry.trim()).filter(Boolean),
        };

        try {
            const endpoint = isEditMode ? `/api/blogs/${blogId}` : '/api/blogs';
            const method = isEditMode ? 'PUT' : 'POST';
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const responsePayload = await res.json();

            if (!res.ok || !responsePayload?.success) {
                throw new Error(responsePayload?.error || 'Unable to save blog');
            }

            showNotification(true, isEditMode ? 'Blog updated' : 'Blog created');
            setTimeout(() => router.push('/admin/blogs'), 700);
        } catch (error) {
            console.error(error);
            showNotification(false, error?.message || 'Save failed');
        } finally {
            setSubmitting(false);
        }
    };

    const effectiveSeoTitle = formData.seoTitle.trim() || formData.title.trim() || '(no title yet)';
    const effectiveSeoDescription = formData.seoDescription.trim() || formData.excerpt.trim() || '(no description yet)';
    const effectiveSocialTitle = formData.socialTitle.trim() || effectiveSeoTitle;
    const effectiveSocialDescription = formData.socialDescription.trim() || effectiveSeoDescription;
    const effectiveSocialImage = formData.socialImage.trim() || formData.image.trim() || '(no image yet)';
    const hasCoverImage = Boolean(formData.image?.trim());
    const hasSocialImage = Boolean(formData.socialImage?.trim());
    const parsedTags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const wordCount = formData.content.trim() ? formData.content.trim().split(/\s+/).length : 0;

    if (loading) {
        return (
            <div className="adm-page">
                <PageHeader
                    command="vim"
                    title={isEditMode ? 'Edit post' : 'New post'}
                    description="Loading post editor..."
                />
                <Panel>
                    <Loading label="Loading blog editor" rows={8} />
                </Panel>
            </div>
        );
    }

    return (
        <div className="adm-page">
            <PageHeader
                command={isEditMode ? 'vim' : 'touch'}
                title={isEditMode ? 'Edit post' : 'New post'}
                description="Compose in Markdown, preview formatting, and configure publishing, tags, and search metadata."
                actions={
                    <>
                        <Badge tone={formData.published ? 'ok' : 'warn'}>
                            {formData.published ? 'Published' : 'Draft'}
                        </Badge>
                        <Link href="/admin/blogs" className="adm-btn">
                            <FaArrowLeft aria-hidden="true" /> Back to blogs
                        </Link>
                    </>
                }
            />

            <form onSubmit={handleSubmit} className="adm-split">
                <div className="adm-stack">
                    <Panel
                        title="Post details"
                        actions={
                            <div className="flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => runAiAction('suggest_title')}
                                    disabled={aiLoading}
                                    className="adm-btn"
                                >
                                    <FaWandMagicSparkles aria-hidden="true" />
                                    {aiLoading && aiMode === 'suggest_title' ? 'Thinking...' : 'Suggest title'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runAiAction('suggest_excerpt')}
                                    disabled={aiLoading}
                                    className="adm-btn"
                                >
                                    <FaWandMagicSparkles aria-hidden="true" />
                                    {aiLoading && aiMode === 'suggest_excerpt' ? 'Writing...' : 'Suggest excerpt'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runAiAction('generate')}
                                    disabled={aiLoading}
                                    className="adm-btn"
                                >
                                    <FaWandMagicSparkles aria-hidden="true" />
                                    {aiLoading && aiMode === 'generate' ? 'Generating...' : 'Generate draft'}
                                </button>
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <Field
                                label="Title"
                                help="Headline displayed on the blog index, article header, and default search title."
                            >
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Post title"
                                    className="adm-input"
                                />
                            </Field>

                            <Field
                                label="Excerpt"
                                help="Short summary shown on article cards and used as fallback meta description."
                            >
                                <textarea
                                    name="excerpt"
                                    rows={3}
                                    value={formData.excerpt}
                                    onChange={handleChange}
                                    placeholder="A short summary shown in cards and search previews"
                                    className="adm-input"
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel
                        title="Article body (Markdown)"
                        actions={
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="adm-help adm-num mr-1">{wordCount} words</span>
                                <button
                                    type="button"
                                    onClick={() => runAiAction('proofread')}
                                    disabled={aiLoading}
                                    className="adm-btn"
                                >
                                    <FaWandMagicSparkles aria-hidden="true" />
                                    {aiLoading && aiMode === 'proofread' ? 'Refining...' : 'Refine & proofread'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runAiAction('continue')}
                                    disabled={aiLoading}
                                    className="adm-btn"
                                >
                                    <FaWandMagicSparkles aria-hidden="true" />
                                    {aiLoading && aiMode === 'continue' ? 'Writing...' : 'Continue with AI'}
                                </button>
                            </div>
                        }
                        flush
                    >
                        {showAiPreview && (
                            <div className="p-4 border-b border-[var(--hairline)] bg-[var(--bg-secondary)] space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-[var(--text-bright)]">AI suggestion preview</p>
                                    <Badge tone="info">{aiMode === 'continue' ? 'Appends to end' : 'Replaces body'}</Badge>
                                </div>
                                <pre className="adm-code max-h-60 whitespace-pre-wrap">{aiPreview}</pre>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={applyAiPreview}
                                        className="adm-btn adm-btn-primary"
                                    >
                                        <FaCheck aria-hidden="true" /> Apply suggestion
                                    </button>
                                    <button
                                        type="button"
                                        onClick={discardAiPreview}
                                        className="adm-btn"
                                    >
                                        Discard
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="p-3 sm:p-4">
                            <MarkdownToolbar
                                textareaRef={contentRef}
                                value={formData.content}
                                onChange={(nextContent) => setFormData((prev) => ({ ...prev, content: nextContent }))}
                                showNotification={showNotification}
                            >
                                <textarea
                                    ref={contentRef}
                                    name="content"
                                    required
                                    aria-label="Post content"
                                    value={formData.content}
                                    onChange={handleChange}
                                    placeholder="Write your post in Markdown..."
                                    className="adm-editor-textarea"
                                />
                            </MarkdownToolbar>
                        </div>
                    </Panel>

                    <Panel
                        title="Search & social metadata"
                        actions={
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen((prev) => !prev)}
                                aria-expanded={advancedOpen}
                                className="adm-btn"
                            >
                                {advancedOpen ? 'Hide custom overrides' : 'Customize SEO & social'}
                            </button>
                        }
                    >
                        <div className="space-y-5">
                            <p className="adm-help">
                                Optional overrides for search engines and Open Graph cards. When left blank, the post title, excerpt, and cover image are used automatically.
                            </p>

                            <dl className="adm-facts">
                                <div>
                                    <dt>Effective SEO title</dt>
                                    <dd>{effectiveSeoTitle}</dd>
                                </div>
                                <div>
                                    <dt>Effective SEO description</dt>
                                    <dd>{effectiveSeoDescription}</dd>
                                </div>
                                <div>
                                    <dt>Effective social title</dt>
                                    <dd>{effectiveSocialTitle}</dd>
                                </div>
                                <div>
                                    <dt>Effective social image</dt>
                                    <dd className="font-mono text-xs">{effectiveSocialImage}</dd>
                                </div>
                            </dl>

                            {advancedOpen && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--hairline)]">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-[var(--text-bright)]">Search engine optimization</h3>
                                        <Field label="SEO title">
                                            <input
                                                type="text"
                                                name="seoTitle"
                                                value={formData.seoTitle}
                                                onChange={handleChange}
                                                placeholder={formData.title || 'Custom search title'}
                                                className="adm-input"
                                            />
                                        </Field>

                                        <Field label="SEO description">
                                            <textarea
                                                name="seoDescription"
                                                rows={3}
                                                value={formData.seoDescription}
                                                onChange={handleChange}
                                                placeholder={formData.excerpt || 'Custom search description'}
                                                className="adm-input"
                                            />
                                        </Field>

                                        <Field label="Canonical URL">
                                            <input
                                                type="url"
                                                name="canonicalUrl"
                                                value={formData.canonicalUrl}
                                                onChange={handleChange}
                                                placeholder="https://example.com/blogs/post-slug"
                                                className="adm-input font-mono"
                                            />
                                        </Field>

                                        <Field label="Keywords (comma-separated)">
                                            <input
                                                type="text"
                                                name="keywords"
                                                value={formData.keywords}
                                                onChange={handleChange}
                                                placeholder="next.js, rust, systems"
                                                className="adm-input"
                                            />
                                        </Field>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-[var(--text-bright)]">Social sharing card</h3>
                                        <Field label="Social title">
                                            <input
                                                type="text"
                                                name="socialTitle"
                                                value={formData.socialTitle}
                                                onChange={handleChange}
                                                placeholder={effectiveSeoTitle}
                                                className="adm-input"
                                            />
                                        </Field>

                                        <Field label="Social description">
                                            <textarea
                                                name="socialDescription"
                                                rows={3}
                                                value={formData.socialDescription}
                                                onChange={handleChange}
                                                placeholder={effectiveSeoDescription}
                                                className="adm-input"
                                            />
                                        </Field>

                                        <Field label="Social image URL">
                                            <input
                                                type="text"
                                                name="socialImage"
                                                value={formData.socialImage}
                                                onChange={handleChange}
                                                placeholder="https://..."
                                                className="adm-input font-mono"
                                            />
                                        </Field>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <input
                                                ref={socialInputRef}
                                                type="file"
                                                accept="image/*,.heic,.heif"
                                                className="hidden"
                                                onChange={(event) => uploadImage(event.target.files?.[0], 'socialImage')}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => socialInputRef.current?.click()}
                                                className="adm-btn"
                                            >
                                                <FaUpload aria-hidden="true" />
                                                {uploadingField === 'socialImage' ? 'Uploading...' : 'Upload social image'}
                                            </button>
                                        </div>

                                        {hasSocialImage && (
                                            <div className="adm-cover-preview p-2 space-y-2">
                                                <img
                                                    src={formData.socialImage}
                                                    alt={formData.socialImageAlt || 'Social image preview'}
                                                />
                                                <div className="flex flex-wrap gap-2">
                                                    <a
                                                        href={formData.socialImage}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="adm-btn"
                                                    >
                                                        View image <FaArrowUpRightFromSquare aria-hidden="true" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData((prev) => ({ ...prev, socialImage: '' }))}
                                                        className="adm-btn adm-btn-danger"
                                                    >
                                                        <FaTrash aria-hidden="true" /> Remove
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <Field label="Social image alt text">
                                            <input
                                                type="text"
                                                name="socialImageAlt"
                                                value={formData.socialImageAlt}
                                                onChange={handleChange}
                                                placeholder="Describe the social card preview image"
                                                className="adm-input"
                                            />
                                        </Field>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Panel>
                </div>

                <aside className="adm-stack adm-side">
                    <Panel
                        title="Publish"
                        actions={
                            <Badge tone={formData.published ? 'ok' : 'warn'}>
                                {formData.published ? 'Live' : 'Draft'}
                            </Badge>
                        }
                    >
                        <div className="space-y-4">
                            <Field label="Publish date">
                                <input
                                    type="date"
                                    name="date"
                                    required
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="adm-input font-mono"
                                />
                            </Field>

                            <div>
                                <div className="adm-switch-row">
                                    <label htmlFor="blog-published-check" className="adm-label cursor-pointer">
                                        Publish now
                                        <span className="block adm-help font-normal mt-0.5">
                                            Make this article visible on the public blog.
                                        </span>
                                    </label>
                                    <input
                                        id="blog-published-check"
                                        type="checkbox"
                                        name="published"
                                        checked={formData.published}
                                        onChange={handleChange}
                                        className="adm-check mt-1"
                                    />
                                </div>

                                <div className="adm-switch-row">
                                    <label htmlFor="blog-noindex-check" className="adm-label cursor-pointer">
                                        Hide from search engines
                                        <span className="block adm-help font-normal mt-0.5">
                                            Adds a noindex directive to this post.
                                        </span>
                                    </label>
                                    <input
                                        id="blog-noindex-check"
                                        type="checkbox"
                                        name="noIndex"
                                        checked={formData.noIndex}
                                        onChange={handleChange}
                                        className="adm-check mt-1"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--hairline)]">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="adm-btn adm-btn-primary w-full"
                                >
                                    <FaCheck aria-hidden="true" />
                                    {submitting ? 'Saving...' : isEditMode ? 'Update post' : 'Publish post'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push('/admin/blogs')}
                                    className="adm-btn w-full"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Panel>

                    <Panel
                        title="Labels & cover"
                        actions={
                            <button
                                type="button"
                                onClick={() => runAiAction('suggest_tags')}
                                disabled={aiLoading}
                                className="adm-btn"
                            >
                                <FaWandMagicSparkles aria-hidden="true" />
                                {aiLoading && aiMode === 'suggest_tags' ? 'Analyzing...' : 'AI tags'}
                            </button>
                        }
                    >
                        <div className="space-y-4">
                            <Field
                                label="Tags (comma-separated)"
                                help="Used to group posts on the public blog."
                            >
                                <input
                                    type="text"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    placeholder="next.js, react, seo"
                                    className="adm-input"
                                />
                            </Field>

                            {parsedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {parsedTags.map((tag) => (
                                        <Badge key={tag}>{tag}</Badge>
                                    ))}
                                </div>
                            )}

                            <Field label="Cover image URL">
                                <input
                                    type="text"
                                    name="image"
                                    value={formData.image}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="adm-input font-mono"
                                />
                            </Field>

                            <div className="flex flex-wrap gap-2">
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*,.heic,.heif"
                                    className="hidden"
                                    onChange={(event) => uploadImage(event.target.files?.[0], 'image')}
                                />
                                <button
                                    type="button"
                                    onClick={() => coverInputRef.current?.click()}
                                    className="adm-btn w-full"
                                >
                                    <FaUpload aria-hidden="true" />
                                    {uploadingField === 'image' ? 'Uploading...' : 'Upload cover image'}
                                </button>
                            </div>

                            {hasCoverImage && (
                                <div className="adm-cover-preview p-2 space-y-2">
                                    <img
                                        src={formData.image}
                                        alt={formData.imageAlt || 'Cover preview'}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={formData.image}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="adm-btn flex-1"
                                        >
                                            View <FaArrowUpRightFromSquare aria-hidden="true" />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                                            className="adm-btn adm-btn-danger flex-1"
                                        >
                                            <FaTrash aria-hidden="true" /> Remove
                                        </button>
                                    </div>
                                </div>
                            )}

                            <Field
                                label="Cover image alt text"
                                help="Describes the cover image for screen readers."
                            >
                                <input
                                    type="text"
                                    name="imageAlt"
                                    value={formData.imageAlt}
                                    onChange={handleChange}
                                    placeholder="Describe the cover image"
                                    className="adm-input"
                                />
                            </Field>
                        </div>
                    </Panel>
                </aside>
            </form>

            <Toast notification={notification} onClose={() => setNotification(null)} />
        </div>
    );
}
