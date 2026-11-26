"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    FaArrowUpRightFromSquare,
    FaEye,
    FaPen,
    FaCheck,
    FaSpinner,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import LegalContent from '@/app/components/legal/LegalContent';
import { LEGAL_KINDS, legalKindLabel } from '@/lib/legalKinds';
import { Panel, Badge, Field } from '@/app/components/admin/ui';
import { slugify, requestJson } from './legalUi';
import '@/app/styles/admin-blogs.css';

const FORMAT_OPTIONS = [
    { value: 'markdown', label: 'Markdown' },
    { value: 'html', label: 'HTML' },
];

/**
 * Editor for one legal page. Picking a preset kind fills the title and slug
 * (until the admin edits them by hand); "Custom" leaves both free. Content is
 * Markdown or raw HTML — the preview runs the exact renderer the public page
 * uses, including sanitization, so what you see is what ships.
 */
export default function LegalDocumentForm({ app, initialData = null, defaultKind = 'privacy-policy' }) {
    const router = useRouter();
    const { toast } = useAdminFeedback();
    const isEdit = Boolean(initialData?._id);
    const startKind = initialData?.kind || defaultKind;

    const [form, setForm] = useState(() => ({
        kind: startKind,
        title: initialData?.title ?? (startKind === 'custom' ? '' : legalKindLabel(startKind)),
        slug: initialData?.slug ?? (startKind === 'custom' ? '' : startKind),
        format: initialData?.format || 'markdown',
        content: initialData?.content || '',
        seoDescription: initialData?.seoDescription || '',
        effectiveDate: initialData?.effectiveDate || '',
        published: initialData?.published ?? true,
        noIndex: initialData?.noIndex ?? false,
    }));
    const [touched, setTouched] = useState({ title: isEdit, slug: isEdit });
    const [tab, setTab] = useState('write');
    const [saving, setSaving] = useState(false);

    const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

    const handleKind = (kind) => setForm((prev) => {
        const next = { ...prev, kind };
        if (!touched.title) next.title = kind === 'custom' ? '' : legalKindLabel(kind);
        if (!touched.slug) next.slug = kind === 'custom' ? slugify(next.title) : kind;
        return next;
    });

    const handleTitle = (title) => {
        setTouched((t) => ({ ...t, title: true }));
        setForm((prev) => ({
            ...prev,
            title,
            slug: touched.slug ? prev.slug : slugify(title),
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, slug: form.slug || slugify(form.title) };
            const saved = await requestJson(
                isEdit ? `/api/legal/documents/${initialData._id}` : `/api/legal/apps/${app._id}/documents`,
                { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) },
            );
            toast.success(isEdit ? 'Page saved.' : 'Page created.');
            if (isEdit) {
                setForm((prev) => ({ ...prev, slug: saved.slug }));
                router.refresh();
            } else {
                router.push(`/admin/legal/${app._id}/pages/${saved._id}`);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const publicPath = `/${app.slug}/${form.slug || slugify(form.title) || 'page'}`;

    return (
        <form onSubmit={handleSubmit} className="adm-split">
            <div className="adm-stack">
                <Panel
                    title="Document content"
                    actions={
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="adm-tabs border-b-0" role="group" aria-label="Content format">
                                {FORMAT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        aria-pressed={form.format === opt.value}
                                        onClick={() => set('format', opt.value)}
                                        className="adm-tab"
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <div className="adm-tabs border-b-0" role="group" aria-label="Editor view mode">
                                <button
                                    type="button"
                                    aria-pressed={tab === 'write'}
                                    onClick={() => setTab('write')}
                                    className="adm-tab"
                                >
                                    <FaPen aria-hidden="true" className="w-3 h-3" /> Write
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={tab === 'preview'}
                                    onClick={() => setTab('preview')}
                                    className="adm-tab"
                                >
                                    <FaEye aria-hidden="true" className="w-3 h-3" /> Preview
                                </button>
                            </div>
                        </div>
                    }
                    flush
                >
                    {tab === 'write' ? (
                        <>
                            <textarea
                                aria-label="Page content"
                                value={form.content}
                                onChange={(e) => set('content', e.target.value)}
                                rows={28}
                                spellCheck
                                className="adm-editor-textarea"
                                placeholder={
                                    form.format === 'html'
                                        ? '<h2>Information we collect</h2>\n<p>…</p>'
                                        : '## Information we collect\n\n…'
                                }
                            />
                            <div className="adm-panel-foot">
                                <span>
                                    {form.format === 'html'
                                        ? 'Paste HTML from a policy generator. Scripts, styles, iframes, and event handlers are stripped when rendered.'
                                        : 'Markdown with GitHub tables and lists. Inline HTML is allowed and sanitized.'}
                                    {' '}Use ## headings for sections; the page title is rendered above the content.
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="adm-legal-preview prose adm-prose max-w-none">
                            <h1 className="mb-6 text-2xl sm:text-3xl font-bold text-[var(--text-bright)]">
                                {form.title || 'Untitled'}
                            </h1>
                            <LegalContent content={form.content} format={form.format} />
                        </div>
                    )}
                </Panel>
            </div>

            <aside className="adm-stack adm-side">
                <Panel
                    title="Publish"
                    actions={
                        <Badge tone={form.published ? 'ok' : 'warn'}>
                            {form.published ? 'Published' : 'Draft'}
                        </Badge>
                    }
                >
                    <div className="space-y-3">
                        <button type="submit" disabled={saving} className="adm-btn adm-btn-primary w-full">
                            {saving ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaCheck aria-hidden="true" />}
                            {saving ? 'Saving...' : isEdit ? 'Save page' : 'Create page'}
                        </button>
                        {isEdit && initialData.published && (
                            <a
                                href={`/${app.slug}/${initialData.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="adm-btn w-full"
                            >
                                View live <FaArrowUpRightFromSquare aria-hidden="true" />
                            </a>
                        )}
                    </div>
                </Panel>

                <Panel title="Page details">
                    <div className="space-y-4">
                        <Field id="doc-kind" label="Type">
                            <select
                                id="doc-kind"
                                className="adm-input"
                                value={form.kind}
                                onChange={(e) => handleKind(e.target.value)}
                            >
                                {LEGAL_KINDS.map((k) => (
                                    <option key={k.value} value={k.value}>{k.label}</option>
                                ))}
                            </select>
                        </Field>

                        <Field id="doc-title" label="Title">
                            <input
                                id="doc-title"
                                className="adm-input"
                                value={form.title}
                                onChange={(e) => handleTitle(e.target.value)}
                                placeholder="Privacy Policy"
                                required
                            />
                        </Field>

                        <Field id="doc-slug" label="URL slug" help={`Public route: ${publicPath}`}>
                            <input
                                id="doc-slug"
                                className="adm-input font-mono"
                                value={form.slug}
                                onChange={(e) => {
                                    setTouched((t) => ({ ...t, slug: true }));
                                    set('slug', slugify(e.target.value));
                                }}
                                placeholder="privacy-policy"
                            />
                        </Field>

                        <Field id="doc-effective" label="Effective date">
                            <input
                                id="doc-effective"
                                type="date"
                                className="adm-input font-mono"
                                value={form.effectiveDate}
                                onChange={(e) => set('effectiveDate', e.target.value)}
                            />
                        </Field>
                    </div>
                </Panel>

                <Panel title="SEO & visibility">
                    <div className="space-y-4">
                        <Field
                            id="doc-seo"
                            label="Meta description"
                            help={`${form.seoDescription.length}/160 characters recommended`}
                        >
                            <textarea
                                id="doc-seo"
                                rows={3}
                                maxLength={300}
                                className="adm-input"
                                value={form.seoDescription}
                                onChange={(e) => set('seoDescription', e.target.value)}
                                placeholder="Auto-generated from the title and app name when empty."
                            />
                        </Field>

                        <div>
                            <Toggle
                                id="doc-published-check"
                                label="Published"
                                hint="Drafts return 404 publicly."
                                checked={form.published}
                                onChange={(v) => set('published', v)}
                            />
                            <Toggle
                                id="doc-noindex-check"
                                label="Hide from search engines"
                                hint="Adds noindex and leaves it out of the sitemap."
                                checked={form.noIndex}
                                onChange={(v) => set('noIndex', v)}
                            />
                        </div>
                    </div>
                </Panel>
            </aside>
        </form>
    );
}

function Toggle({ id, label, hint, checked, onChange }) {
    return (
        <div className="adm-switch-row">
            <label htmlFor={id} className="adm-label cursor-pointer">
                {label}
                <span className="block adm-help font-normal mt-0.5">{hint}</span>
            </label>
            <input
                id={id}
                type="checkbox"
                className="adm-check mt-1"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </div>
    );
}
