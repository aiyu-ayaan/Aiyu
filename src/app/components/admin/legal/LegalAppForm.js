"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheck, FaSpinner } from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Panel, Field } from '@/app/components/admin/ui';
import { slugify, requestJson } from './legalUi';
import '@/app/styles/admin-blogs.css';

const EMPTY = { name: '', slug: '', packageName: '', description: '', contactEmail: '', deploymentId: '' };

/**
 * Create / edit a legal app: its name, URL slug (/<slug>/<page>), optional
 * package name, and an optional link to an /apps entry. Linking pre-fills the
 * name and slug from that app, so /apps/rewire and /rewire/privacy-policy share
 * one name.
 */
export default function LegalAppForm({ initialData = null, onSaved, defaultDeploymentId = '' }) {
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

    useEffect(() => {
        if (!isEdit && defaultDeploymentId && deployments.length > 0) handleLink(defaultDeploymentId);
    }, [isEdit, defaultDeploymentId, deployments]);

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
    const slugChanged = isEdit && form.slug !== initialData.slug;

    const fieldsPanel = (
        <Panel
            title="Application details"
            actions={
                isEdit ? (
                    <button type="submit" disabled={saving} className="adm-btn adm-btn-primary">
                        {saving ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaCheck aria-hidden="true" />}
                        {saving ? 'Saving...' : 'Save app'}
                    </button>
                ) : null
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field
                    id="legal-link"
                    label="Link to app on /apps (optional)"
                    help="The app page will list these legal pages, and each legal page links back to the app."
                    className="md:col-span-2"
                >
                    <select
                        id="legal-link"
                        value={form.deploymentId}
                        onChange={(e) => handleLink(e.target.value)}
                        className="adm-input"
                    >
                        <option value="">— Not linked —</option>
                        {deployments.map((d) => (
                            <option key={d._id} value={d._id}>{d.name} (/apps/{d.slug})</option>
                        ))}
                    </select>
                </Field>

                <Field id="legal-name" label="App name">
                    <input
                        id="legal-name"
                        className="adm-input"
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        placeholder="Rewire"
                        required
                    />
                </Field>

                <Field
                    id="legal-slug"
                    label="URL slug"
                    help={`Pages live at /${previewSlug}/privacy-policy`}
                    error={slugChanged ? 'Changing the slug breaks links already submitted to app stores.' : undefined}
                >
                    <input
                        id="legal-slug"
                        className="adm-input font-mono"
                        value={form.slug}
                        onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
                        placeholder="rewire"
                    />
                </Field>

                <Field
                    id="legal-package"
                    label="Package name (optional)"
                    help="Android package name or iOS bundle identifier."
                >
                    <input
                        id="legal-package"
                        className="adm-input font-mono"
                        value={form.packageName}
                        onChange={(e) => set('packageName', e.target.value.trim())}
                        placeholder="com.aiyu.rewire"
                    />
                </Field>

                <Field
                    id="legal-email"
                    label="Contact email (optional)"
                    help="Shown at the bottom of every page of this app."
                >
                    <input
                        id="legal-email"
                        type="email"
                        className="adm-input"
                        value={form.contactEmail}
                        onChange={(e) => set('contactEmail', e.target.value)}
                        placeholder="privacy@example.com"
                    />
                </Field>

                <Field
                    id="legal-description"
                    label="Short description (optional)"
                    help={`Used as the meta description of the /${previewSlug} hub.`}
                    className="md:col-span-2"
                >
                    <textarea
                        id="legal-description"
                        rows={3}
                        maxLength={500}
                        className="adm-input"
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                        placeholder="Legal information for the Rewire Android app."
                    />
                </Field>
            </div>
        </Panel>
    );

    if (isEdit) {
        return <form onSubmit={handleSubmit}>{fieldsPanel}</form>;
    }

    return (
        <form onSubmit={handleSubmit} className="adm-split">
            <div className="adm-stack">{fieldsPanel}</div>
            <aside className="adm-stack adm-side">
                <Panel title="Create application">
                    <p className="adm-help mb-4">
                        Once created, you can add a privacy policy, terms &amp; conditions, account deletion instructions, or custom legal pages.
                    </p>
                    <dl className="adm-facts mb-4">
                        <div>
                            <dt>Hub route</dt>
                            <dd className="font-mono">/{previewSlug}</dd>
                        </div>
                        <div>
                            <dt>Example policy URL</dt>
                            <dd className="font-mono">/{previewSlug}/privacy-policy</dd>
                        </div>
                    </dl>
                    <button type="submit" disabled={saving} className="adm-btn adm-btn-primary w-full">
                        {saving ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaCheck aria-hidden="true" />}
                        {saving ? 'Creating...' : 'Create app'}
                    </button>
                </Panel>
            </aside>
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
