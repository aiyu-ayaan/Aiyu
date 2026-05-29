"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import MarkdownToolbar from '@/app/components/admin/MarkdownToolbar';
import Toast from '@/app/components/admin/Toast';

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

    const runAiAction = async (mode) => {
        if (aiLoading) return;
        if (!aiEnabled) {
            showNotification(false, 'AI is not enabled. Turn it on from Admin > AI.');
            return;
        }

        let prompt = '';
        let endpointMode = '';

        if (mode === 'suggest_title') {
            prompt = formData.content;
            endpointMode = 'suggest_title';
            if (!prompt.trim()) {
                showNotification(false, 'Add some content first.');
                return;
            }
        } else if (mode === 'suggest_excerpt') {
            prompt = formData.content || formData.title;
            endpointMode = 'suggest_excerpt';
            if (!prompt.trim()) {
                showNotification(false, 'Add a title or content first.');
                return;
            }
        } else if (mode === 'suggest_tags') {
            prompt = formData.content || formData.title;
            endpointMode = 'suggest_tags';
            if (!prompt.trim()) {
                showNotification(false, 'Add a title or content first.');
                return;
            }
        } else if (mode === 'proofread') {
            prompt = formData.content;
            endpointMode = 'proofread';
            if (!prompt.trim()) {
                showNotification(false, 'No content to refine.');
                return;
            }
        } else if (mode === 'continue') {
            prompt = formData.content;
            endpointMode = 'continue_blog';
            if (!prompt.trim()) {
                showNotification(false, 'No content to continue from.');
                return;
            }
        } else if (mode === 'generate') {
            prompt = formData.title;
            endpointMode = 'generate_blog';
            if (!prompt.trim()) {
                showNotification(false, 'Add a title first.');
                return;
            }
        }

        setAiLoading(true);
        setAiMode(mode);

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

            if (mode === 'suggest_title') {
                setFormData((prev) => ({ ...prev, title: String(data.data || '') }));
                showNotification(true, 'AI title applied');
            } else if (mode === 'suggest_excerpt') {
                setFormData((prev) => ({ ...prev, excerpt: String(data.data || '') }));
                showNotification(true, 'AI excerpt applied');
            } else if (mode === 'suggest_tags') {
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

    if (loading) {
        return (
            <div className="p-4 md:p-8 text-slate-300">
                Loading blog editor...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1300px] p-4 sm:p-6 lg:p-4 md:p-8">
            <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/blogs')}
                        className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
                    >
                        Back to blogs
                    </button>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                        {isEditMode ? 'Edit Post' : 'New Post'}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Blogger-style writing flow with quick settings on the right.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70 sm:p-6">
                        <div className="mb-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => runAiAction('suggest_title')}
                                disabled={aiLoading}
                                className="rounded-md border border-purple-400/40 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-500/20 disabled:opacity-50 dark:text-purple-300"
                            >
                                {aiLoading && aiMode === 'suggest_title' ? 'Thinking...' : 'AI Title'}
                            </button>
                            <button
                                type="button"
                                onClick={() => runAiAction('generate')}
                                disabled={aiLoading}
                                className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-500/20 disabled:opacity-50 dark:text-cyan-300"
                            >
                                {aiLoading && aiMode === 'generate' ? 'Generating...' : 'AI Draft'}
                            </button>
                        </div>

                        <input
                            type="text"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Title"
                            className="w-full border-0 bg-transparent px-0 py-2 text-3xl font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />

                        <div className="mt-3 border-t border-slate-200 pt-4 dark:border-white/10">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Excerpt
                                <button
                                    type="button"
                                    onClick={() => runAiAction('suggest_excerpt')}
                                    disabled={aiLoading}
                                    className="ml-2 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-500/20 disabled:opacity-50 dark:text-cyan-300"
                                >
                                    {aiLoading && aiMode === 'suggest_excerpt' ? 'Writing...' : 'AI Excerpt'}
                                </button>
                                <textarea
                                    name="excerpt"
                                    rows={3}
                                    value={formData.excerpt}
                                    onChange={handleChange}
                                    placeholder="A short summary shown in cards and search previews"
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                />
                            </label>
                        </div>

                        <div className="mt-4 min-h-[620px] border border-slate-200 bg-slate-950/95 dark:border-white/10">
                            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-900/80 px-3 py-2">
                                <button
                                    type="button"
                                    onClick={() => runAiAction('proofread')}
                                    disabled={aiLoading}
                                    className="rounded-md border border-purple-400/40 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 disabled:opacity-50"
                                >
                                    {aiLoading && aiMode === 'proofread' ? 'Refining...' : 'Refine & Proofread'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runAiAction('continue')}
                                    disabled={aiLoading}
                                    className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
                                >
                                    {aiLoading && aiMode === 'continue' ? 'Writing...' : 'Continue with AI'}
                                </button>
                            </div>

                            {showAiPreview ? (
                                <div className="border-b border-white/10 bg-slate-900/90 p-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">AI Suggestion</p>
                                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-white/10 bg-black/30 p-3 text-xs text-slate-200">{aiPreview}</pre>
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={applyAiPreview}
                                            className="rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
                                        >
                                            Apply
                                        </button>
                                        <button
                                            type="button"
                                            onClick={discardAiPreview}
                                            className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                                        >
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            ) : null}

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
                                    value={formData.content}
                                    onChange={handleChange}
                                    placeholder="Write your post..."
                                    className="h-full min-h-[560px] w-full resize-y bg-transparent p-5 font-mono text-sm text-slate-100 outline-none"
                                />
                            </MarkdownToolbar>
                        </div>
                    </section>

                    <aside className="space-y-4">
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Publish</h2>

                            <label className="mt-3 block text-sm text-slate-700 dark:text-slate-300">
                                Publish date
                                <input
                                    type="date"
                                    name="date"
                                    required
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
                                />
                            </label>

                            <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    name="published"
                                    checked={formData.published}
                                    onChange={handleChange}
                                    className="h-4 w-4"
                                />
                                Publish now
                            </label>

                            <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    name="noIndex"
                                    checked={formData.noIndex}
                                    onChange={handleChange}
                                    className="h-4 w-4"
                                />
                                Hide from search engines
                            </label>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Labels & Cover</h2>

                            <label className="mt-3 block text-sm text-slate-700 dark:text-slate-300">
                                Tags (comma separated)
                                <button
                                    type="button"
                                    onClick={() => runAiAction('suggest_tags')}
                                    disabled={aiLoading}
                                    className="ml-2 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-500/20 disabled:opacity-50 dark:text-cyan-300"
                                >
                                    {aiLoading && aiMode === 'suggest_tags' ? 'Analyzing...' : 'AI Suggest'}
                                </button>
                                <input
                                    type="text"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    placeholder="next.js, react, seo"
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                />
                            </label>

                            <label className="mt-3 block text-sm text-slate-700 dark:text-slate-300">
                                Cover image URL
                                <input
                                    type="text"
                                    name="image"
                                    value={formData.image}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                />
                            </label>

                            <div className="mt-2 flex gap-2">
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) => uploadImage(event.target.files?.[0], 'image')}
                                />
                                <button
                                    type="button"
                                    onClick={() => coverInputRef.current?.click()}
                                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 dark:border-white/15 dark:text-slate-200"
                                >
                                    {uploadingField === 'image' ? 'Uploading...' : 'Upload cover image'}
                                </button>
                            </div>

                            {hasCoverImage ? (
                                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-950/40">
                                    <img
                                        src={formData.image}
                                        alt={formData.imageAlt || 'Cover preview'}
                                        className="h-32 w-full rounded-md object-cover"
                                    />
                                    <div className="mt-2 flex gap-2">
                                        <a
                                            href={formData.image}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 dark:border-white/15 dark:text-slate-200"
                                        >
                                            View image
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                                            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 hover:border-red-500 dark:border-red-500/50 dark:text-red-400"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            <label className="mt-3 block text-sm text-slate-700 dark:text-slate-300">
                                Cover image alt text
                                <input
                                    type="text"
                                    name="imageAlt"
                                    value={formData.imageAlt}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
                                />
                            </label>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen((prev) => !prev)}
                                className="flex w-full items-center justify-between text-left"
                            >
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Advanced Options
                                </span>
                                <span className="text-xs font-semibold text-blue-600">
                                    {advancedOpen ? 'Hide' : 'Show'}
                                </span>
                            </button>

                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                SEO and social sharing fields are optional. If left empty, the system uses post title, excerpt, and cover image automatically.
                            </p>

                            {advancedOpen && (
                                <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-white/10">
                                    <div>
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">SEO</h3>
                                        <label className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
                                            SEO title
                                            <input
                                                type="text"
                                                name="seoTitle"
                                                value={formData.seoTitle}
                                                onChange={handleChange}
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
                                            />
                                        </label>

                                        <label className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
                                            SEO description
                                            <textarea
                                                name="seoDescription"
                                                rows={3}
                                                value={formData.seoDescription}
                                                onChange={handleChange}
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
                                            />
                                        </label>

                                        <label className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
                                            Canonical URL
                                            <input
                                                type="url"
                                                name="canonicalUrl"
                                                value={formData.canonicalUrl}
                                                onChange={handleChange}
                                                placeholder="https://example.com/blogs/post-slug"
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                            />
                                        </label>

                                        <label className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
                                            Keywords (comma separated)
                                            <input
                                                type="text"
                                                name="keywords"
                                                value={formData.keywords}
                                                onChange={handleChange}
                                                placeholder="blogger, writing, web development"
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                            />
                                        </label>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Social Sharing</h3>
                                        <label className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
                                            Social title
                                            <input
                                                type="text"
                                                name="socialTitle"
                                                value={formData.socialTitle}
                                                onChange={handleChange}
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
                                            />
                                        </label>

                                        <label className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
                                            Social description
                                            <textarea
                                                name="socialDescription"
                                                rows={3}
                                                value={formData.socialDescription}
                                                onChange={handleChange}
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
                                            />
                                        </label>

                                        <label className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
                                            Social image URL
                                            <input
                                                type="text"
                                                name="socialImage"
                                                value={formData.socialImage}
                                                onChange={handleChange}
                                                placeholder="https://..."
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                            />
                                        </label>

                                        <div className="mt-2">
                                            <input
                                                ref={socialInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(event) => uploadImage(event.target.files?.[0], 'socialImage')}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => socialInputRef.current?.click()}
                                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 dark:border-white/15 dark:text-slate-200"
                                            >
                                                {uploadingField === 'socialImage' ? 'Uploading...' : 'Upload social image'}
                                            </button>
                                        </div>

                                        {hasSocialImage ? (
                                            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-950/40">
                                                <img
                                                    src={formData.socialImage}
                                                    alt={formData.socialImageAlt || 'Social image preview'}
                                                    className="h-28 w-full rounded-md object-cover"
                                                />
                                                <div className="mt-2 flex gap-2">
                                                    <a
                                                        href={formData.socialImage}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 dark:border-white/15 dark:text-slate-200"
                                                    >
                                                        View image
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData((prev) => ({ ...prev, socialImage: '' }))}
                                                        className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 hover:border-red-500 dark:border-red-500/50 dark:text-red-400"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        <label className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
                                            Social image alt text
                                            <input
                                                type="text"
                                                name="socialImageAlt"
                                                value={formData.socialImageAlt}
                                                onChange={handleChange}
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
                                            />
                                        </label>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300">
                                        <p className="font-semibold text-slate-700 dark:text-slate-200">Effective preview values</p>
                                        <p className="mt-1"><span className="font-medium">SEO title:</span> {effectiveSeoTitle}</p>
                                        <p><span className="font-medium">SEO description:</span> {effectiveSeoDescription}</p>
                                        <p className="mt-1"><span className="font-medium">Social title:</span> {effectiveSocialTitle}</p>
                                        <p><span className="font-medium">Social description:</span> {effectiveSocialDescription}</p>
                                        <p><span className="font-medium">Social image:</span> {effectiveSocialImage}</p>
                                    </div>
                                </div>
                            )}
                        </section>
                    </aside>
                </div>

                <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-slate-900/85">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/blogs')}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 dark:border-white/20 dark:text-slate-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                    >
                        {submitting ? 'Saving...' : isEditMode ? 'Update Post' : 'Publish Post'}
                    </button>
                </div>
            </form>

            <Toast notification={notification} onClose={() => setNotification(null)} />
        </div>
    );
}
