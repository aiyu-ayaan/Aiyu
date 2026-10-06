"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import {
    panelClass, headingClass, labelClass, inputClass, hintClass, primaryButtonClass,
    slugify, requestJson,
} from './legalUi';

const EMPTY = { name: '', slug: '', packageName: '', description: '', contactEmail: '', deploymentId: '' };

/**
 * Create / edit a legal app: its name, URL slug (/<slug>/<page>), optional
 * package name, and an optional link to an /apps entry. Linking pre-fills the
 * name and slug from that app, so /apps/rewire and /rewire/privacy-policy share
 * one name.
 */
export default function LegalAppForm({ initialData = null, onSaved }) {
    const router = useRouter();
    const { toast } = useAdminFeedback();
    const isEdit = Boolean(initialData?._id);
    const [form, setForm] = useState(() => ({ ...EMPTY, ...pick(initialData) }));
    const [slugTouched, setSlugTouched] = useState(isEdit);
    const [deployments, setDeployments] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/deployments')
            .then((r) => (r.ok ? r.json() : []))
            .then((rows) => setDeployments(Array.isArray(rows) ? rows : []))
            .catch(() => setDeployments([]));
    }, []);

    const set = (name, value) => setForm((prev) => {
        const next = { ...prev, [name]: value };
        if (name === 'name' && !slugTouched) next.slug = slugify(value);
        return next;
    });

    const handleLink = (deploymentId) => {
        const linked = deployments.find((d) => d._id === deploymentId);
        setForm((prev) => ({
            ...prev,
            deploymentId,
            name: prev.name || linked?.name || '',
            slug: !slugTouched && linked ? (linked.slug || slugify(linked.name)) : prev.slug,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, slug: form.slug || slugify(form.name) };
            const saved = await requestJson(isEdit ? `/api/legal/apps/${initialData._id}` : '/api/legal/apps', {
                method: isEdit ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
            toast.success(isEdit ? 'Legal app updated.' : 'Legal app created.');
            if (isEdit) {
                onSaved?.(saved);
            } else {
                router.push(`/admin/legal/${saved._id}`);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const previewSlug = form.slug || slugify(form.name) || 'app';

    return (
        <form onSubmit={handleSubmit} className={panelClass}>
            <h2 className={headingClass}>
                Application
                <div className="h-px bg-cyan-500/20 grow" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className={labelClass} htmlFor="legal-link">Link to app on /apps (optional)</label>
                    <select
                        id="legal-link"
                        value={form.deploymentId}
                        onChange={(e) => handleLink(e.target.value)}
                        className={inputClass}
                    >
                        <option value="">— Not linked —</option>
                        {deployments.map((d) => (
                            <option key={d._id} value={d._id}>{d.name} (/apps/{d.slug})</option>
                        ))}
                    </select>
                    <p className={hintClass}>The app page will list these legal pages, and each legal page links back to the app.</p>
                </div>

                <div>
                    <label className={labelClass} htmlFor="legal-name">App name</label>
                    <input id="legal-name" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Rewire" required />
                </div>

                <div>
                    <label className={labelClass} htmlFor="legal-slug">URL slug</label>
                    <input
                        id="legal-slug"
                        className={`${inputClass} font-mono`}
                        value={form.slug}
                        onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
                        placeholder="rewire"
                    />
                    <p className={hintClass}>Pages live at <span className="font-mono text-slate-300">/{previewSlug}/privacy-policy</span></p>
                    {isEdit && form.slug !== initialData.slug && (
                        <p className="mt-2 text-xs text-amber-400">Changing the slug breaks links already submitted to app stores.</p>
                    )}
                </div>

                <div>
                    <label className={labelClass} htmlFor="legal-package">Package name (optional)</label>
                    <input id="legal-package" className={`${inputClass} font-mono`} value={form.packageName} onChange={(e) => set('packageName', e.target.value.trim())} placeholder="com.aiyu.rewire" />
                </div>

                <div>
                    <label className={labelClass} htmlFor="legal-email">Contact email (optional)</label>
                    <input id="legal-email" type="email" className={inputClass} value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="privacy@example.com" />
                    <p className={hintClass}>Shown at the bottom of every page of this app.</p>
                </div>

                <div className="md:col-span-2">
                    <label className={labelClass} htmlFor="legal-description">Short description (optional)</label>
                    <textarea id="legal-description" rows={2} maxLength={500} className={`${inputClass} resize-none`} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Legal information for the Rewire Android app." />
                    <p className={hintClass}>Used as the meta description of the /{previewSlug} hub.</p>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button type="submit" disabled={saving} className={primaryButtonClass}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isEdit ? 'Save app' : 'Create app'}
                </button>
            </div>
        </form>
    );
}

function pick(data) {
    if (!data) return {};
    return {
        name: data.name || '',
        slug: data.slug || '',
        packageName: data.packageName || '',
        description: data.description || '',
        contactEmail: data.contactEmail || '',
        deploymentId: data.deploymentId || '',
    };
}
