"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Eye, Loader2, Pencil, Save } from 'lucide-react';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import LegalContent from '@/app/components/legal/LegalContent';
import { LEGAL_KINDS, legalKindLabel } from '@/lib/legalKinds';
import {
    panelClass, headingClass, labelClass, inputClass, hintClass, primaryButtonClass,
    slugify, requestJson,
} from './legalUi';

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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8 min-w-0">
                <div className={panelClass}>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/50 p-1" role="radiogroup" aria-label="Content format">
                            {FORMAT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.format === opt.value}
                                    onClick={() => set('format', opt.value)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${form.format === opt.value ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/50 p-1">
                            <button type="button" onClick={() => setTab('write')} className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider ${tab === 'write' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>
                                <Pencil className="w-3 h-3" /> Write
                            </button>
                            <button type="button" onClick={() => setTab('preview')} className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider ${tab === 'preview' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>
                                <Eye className="w-3 h-3" /> Preview
                            </button>
                        </div>
                    </div>

                    {tab === 'write' ? (
                        <>
                            <textarea
                                aria-label="Page content"
                                value={form.content}
                                onChange={(e) => set('content', e.target.value)}
                                rows={28}
                                spellCheck
                                className={`${inputClass} font-mono text-sm leading-relaxed resize-y min-h-[420px]`}
                                placeholder={form.format === 'html'
                                    ? '<h2>Information we collect</h2>\n<p>…</p>'
                                    : '## Information we collect\n\n…'}
                            />
                            <p className={hintClass}>
                                {form.format === 'html'
                                    ? 'Paste HTML from a policy generator. Scripts, styles, iframes and event handlers are stripped when rendered.'
                                    : 'Markdown with GitHub tables and lists. Inline HTML is allowed and sanitized.'}
                                {' '}Use ## headings for sections; the page title is rendered above the content.
                            </p>
                        </>
                    ) : (
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 md:p-8 min-h-[420px] [--text-bright:#f8fafc] [--text-primary:#e2e8f0] [--text-tertiary:#94a3b8] [--accent-cyan:#22d3ee] [--border-primary:rgba(255,255,255,0.1)] [--bg-tertiary:rgba(255,255,255,0.06)]">
                            <h1 className="mb-6 text-3xl font-bold text-white">{form.title || 'Untitled'}</h1>
                            <LegalContent content={form.content} format={form.format} />
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-8">
                <div className={panelClass}>
                    <h2 className={headingClass}>
                        Page
                        <div className="h-px bg-cyan-500/20 grow" />
                    </h2>
                    <div className="space-y-5">
                        <div>
                            <label className={labelClass} htmlFor="doc-kind">Type</label>
                            <select id="doc-kind" className={inputClass} value={form.kind} onChange={(e) => handleKind(e.target.value)}>
                                {LEGAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="doc-title">Title</label>
                            <input id="doc-title" className={inputClass} value={form.title} onChange={(e) => handleTitle(e.target.value)} placeholder="Privacy Policy" required />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="doc-slug">URL slug</label>
                            <input
                                id="doc-slug"
                                className={`${inputClass} font-mono`}
                                value={form.slug}
                                onChange={(e) => { setTouched((t) => ({ ...t, slug: true })); set('slug', slugify(e.target.value)); }}
                                placeholder="privacy-policy"
                            />
                            <p className={`${hintClass} font-mono break-all`}>{publicPath}</p>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="doc-effective">Effective date</label>
                            <input id="doc-effective" type="date" className={inputClass} value={form.effectiveDate} onChange={(e) => set('effectiveDate', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className={panelClass}>
                    <h2 className={headingClass}>
                        SEO & visibility
                        <div className="h-px bg-cyan-500/20 grow" />
                    </h2>
                    <div className="space-y-5">
                        <div>
                            <label className={labelClass} htmlFor="doc-seo">Meta description</label>
                            <textarea id="doc-seo" rows={3} maxLength={300} className={`${inputClass} resize-none text-sm`} value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} placeholder="Auto-generated from the title and app name when empty." />
                            <p className={hintClass}>{form.seoDescription.length}/160 recommended</p>
                        </div>
                        <Toggle label="Published" hint="Drafts return 404 publicly." checked={form.published} onChange={(v) => set('published', v)} />
                        <Toggle label="Hide from search engines" hint="Adds noindex and leaves it out of the sitemap." checked={form.noIndex} onChange={(v) => set('noIndex', v)} />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={saving} className={primaryButtonClass}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEdit ? 'Save page' : 'Create page'}
                    </button>
                    {isEdit && initialData.published && (
                        <a href={`/${app.slug}/${initialData.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-300">
                            View live <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            </div>
        </form>
    );
}

function Toggle({ label, hint, checked, onChange }) {
    return (
        <label className="flex items-start justify-between gap-4 cursor-pointer">
            <span>
                <span className="block text-sm text-slate-200">{label}</span>
                <span className="block text-xs text-slate-500">{hint}</span>
            </span>
            <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-500" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        </label>
    );
}
