"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    FaArrowLeft,
    FaArrowUpRightFromSquare,
    FaPen,
    FaPlus,
    FaTrash,
    FaFileLines,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import LegalAppForm from '@/app/components/admin/legal/LegalAppForm';
import { requestJson } from '@/app/components/admin/legal/legalUi';
import { LEGAL_KINDS } from '@/lib/legalKinds';
import { PageHeader, Panel, Badge, EmptyState, Loading } from '@/app/components/admin/ui';
import '@/app/styles/admin-blogs.css';

export default function EditLegalAppPage() {
    const { id } = useParams();
    const router = useRouter();
    const { confirm, toast } = useAdminFeedback();
    const [app, setApp] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setApp(await requestJson(`/api/legal/apps/${id}`));
        } catch {
            setApp(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const deleteDocument = async (doc) => {
        if (!(await confirm({ title: `Delete "${doc.title}"?`, message: `/${app.slug}/${doc.slug} will stop working.`, confirmText: 'Delete', danger: true }))) return;
        try {
            await requestJson(`/api/legal/documents/${doc._id}`, { method: 'DELETE' });
            toast.success('Page deleted.');
            load();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const deleteApp = async () => {
        if (!(await confirm({ title: `Delete ${app.name}?`, message: 'This deletes the app and all of its legal pages.', confirmText: 'Delete', danger: true }))) return;
        try {
            await requestJson(`/api/legal/apps/${app._id}`, { method: 'DELETE' });
            toast.success('Legal app deleted.');
            router.push('/admin/legal');
        } catch (error) {
            toast.error(error.message);
        }
    };

    if (loading) {
        return (
            <div className="adm-page">
                <PageHeader command="ls" title="Legal application" description="Loading application details..." />
                <Panel>
                    <Loading label="Loading legal application" rows={5} />
                </Panel>
            </div>
        );
    }

    if (!app) {
        return (
            <div className="adm-page">
                <PageHeader
                    command="ls"
                    title="Legal application not found"
                    description="The requested legal application could not be found."
                    actions={
                        <Link href="/admin/legal" className="adm-btn">
                            <FaArrowLeft aria-hidden="true" /> Back to legal
                        </Link>
                    }
                />
                <div role="alert" className="adm-notice adm-notice-error">
                    Legal application not found. Return to the legal directory to select another application.
                </div>
            </div>
        );
    }

    const docs = Array.isArray(app.documents) ? app.documents : [];
    const publishedCount = docs.filter((d) => d.published).length;
    const usedKinds = new Set(docs.map((d) => d.kind));
    const missingPresets = LEGAL_KINDS.filter((k) => k.value !== 'custom' && !usedKinds.has(k.value));

    return (
        <div className="adm-page">
            <PageHeader
                command="ls"
                title={app.name}
                description={`Manage legal documents and application metadata served under /${app.slug}.`}
                actions={
                    <>
                        <a
                            href={`/${app.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="adm-btn"
                        >
                            /{app.slug} <FaArrowUpRightFromSquare aria-hidden="true" />
                        </a>
                        <Link href="/admin/legal" className="adm-btn">
                            <FaArrowLeft aria-hidden="true" /> Back to legal
                        </Link>
                    </>
                }
            />

            <div className="adm-split">
                <div className="adm-stack">
                    <Panel
                        title="Legal pages"
                        actions={
                            <Badge tone={publishedCount > 0 ? 'ok' : 'warn'}>
                                {publishedCount}/{docs.length} published
                            </Badge>
                        }
                        flush
                    >
                        {docs.length === 0 ? (
                            <EmptyState
                                title="No pages yet"
                                description="Start with one of the preset page types below or create a custom legal document."
                            />
                        ) : (
                            <ul className="adm-list">
                                {docs.map((doc) => (
                                    <li key={doc._id} className="adm-row flex-wrap justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1 basis-56">
                                            <div className="adm-thumb" aria-hidden="true">
                                                <FaFileLines className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Link
                                                        href={`/admin/legal/${app._id}/pages/${doc._id}`}
                                                        className="font-semibold text-[var(--text-bright)] hover:text-[var(--adm-accent-ink)] truncate"
                                                    >
                                                        {doc.title}
                                                    </Link>
                                                    <Badge tone={doc.published ? 'ok' : 'warn'}>
                                                        {doc.published ? 'Published' : 'Draft'}
                                                    </Badge>
                                                    {doc.noIndex && <Badge>Noindex</Badge>}
                                                    <Badge>{doc.format}</Badge>
                                                </div>
                                                <p className="adm-help font-mono mt-0.5 break-all">
                                                    /{app.slug}/{doc.slug}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {doc.published && (
                                                <a
                                                    href={`/${app.slug}/${doc.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="adm-icon-btn"
                                                    aria-label={`View ${doc.title}`}
                                                    title="View live page"
                                                >
                                                    <FaArrowUpRightFromSquare className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                            <Link
                                                href={`/admin/legal/${app._id}/pages/${doc._id}`}
                                                className="adm-icon-btn"
                                                aria-label={`Edit ${doc.title}`}
                                                title="Edit page"
                                            >
                                                <FaPen className="w-3.5 h-3.5" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => deleteDocument(doc)}
                                                className="adm-icon-btn"
                                                aria-label={`Delete ${doc.title}`}
                                                title="Delete page"
                                            >
                                                <FaTrash className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="adm-panel-foot justify-start">
                            <span className="adm-help mr-1">Add page:</span>
                            {missingPresets.map((k) => (
                                <Link
                                    key={k.value}
                                    href={`/admin/legal/${app._id}/pages/new?kind=${k.value}`}
                                    className="adm-btn"
                                >
                                    <FaPlus aria-hidden="true" /> {k.label}
                                </Link>
                            ))}
                            <Link
                                href={`/admin/legal/${app._id}/pages/new?kind=custom`}
                                className="adm-btn adm-btn-primary"
                            >
                                <FaPlus aria-hidden="true" /> Custom page
                            </Link>
                        </div>
                    </Panel>

                    <LegalAppForm initialData={app} onSaved={(saved) => setApp(saved)} />
                </div>

                <aside className="adm-stack adm-side">
                    <Panel title="Hub summary">
                        <dl className="adm-facts">
                            <div>
                                <dt>Public path</dt>
                                <dd className="font-mono">/{app.slug}</dd>
                            </div>
                            <div>
                                <dt>Published pages</dt>
                                <dd className="adm-num">{publishedCount} of {docs.length}</dd>
                            </div>
                            {app.packageName && (
                                <div>
                                    <dt>Package ID</dt>
                                    <dd className="font-mono">{app.packageName}</dd>
                                </div>
                            )}
                            {app.contactEmail && (
                                <div>
                                    <dt>Contact email</dt>
                                    <dd className="font-mono">{app.contactEmail}</dd>
                                </div>
                            )}
                        </dl>
                    </Panel>

                    <Panel title="Delete application" className="adm-danger">
                        <p className="adm-help mb-4">
                            Deleting {app.name} permanently removes this application hub and all {docs.length} legal pages under /{app.slug}.
                        </p>
                        <button type="button" onClick={deleteApp} className="adm-btn adm-btn-danger w-full">
                            <FaTrash aria-hidden="true" /> Delete app
                        </button>
                    </Panel>
                </aside>
            </div>
        </div>
    );
}
