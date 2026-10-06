"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import LegalAppForm from '@/app/components/admin/legal/LegalAppForm';
import { panelClass, headingClass, dangerButtonClass, requestJson } from '@/app/components/admin/legal/legalUi';
import { LEGAL_KINDS } from '@/lib/legalKinds';

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
        return <div className="flex items-center justify-center min-h-screen font-mono text-cyan-400 animate-pulse">LOADING...</div>;
    }
    if (!app) {
        return <div className="flex items-center justify-center min-h-screen font-mono text-red-400">ERROR: LEGAL_APP_NOT_FOUND</div>;
    }

    const usedKinds = new Set(app.documents.map((d) => d.kind));
    const missingPresets = LEGAL_KINDS.filter((k) => k.value !== 'custom' && !usedKinds.has(k.value));

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen space-y-8">
            <div>
                <Link href="/admin/legal" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_LEGAL
                </Link>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">{app.name}</h1>
                        <a href={`/${app.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-mono text-sm text-slate-400 hover:text-cyan-300">
                            /{app.slug} <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                    <button type="button" onClick={deleteApp} className={dangerButtonClass}>
                        <Trash2 className="w-4 h-4" /> Delete app
                    </button>
                </div>
            </div>

            <section className={panelClass}>
                <h2 className={headingClass}>
                    Legal pages
                    <div className="h-px bg-cyan-500/20 grow" />
                </h2>

                {app.documents.length === 0 ? (
                    <p className="text-sm text-slate-500 mb-6">No pages yet. Start with a preset below.</p>
                ) : (
                    <ul className="divide-y divide-white/5 mb-6">
                        {app.documents.map((doc) => (
                            <li key={doc._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
                                <div className="min-w-0">
                                    <p className="text-white font-semibold">
                                        {doc.title}
                                        {!doc.published && <span className="ml-2 rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-400">draft</span>}
                                        {doc.noIndex && <span className="ml-2 rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-400">noindex</span>}
                                    </p>
                                    <p className="font-mono text-xs text-slate-500 mt-1 break-all">/{app.slug}/{doc.slug} · {doc.format}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {doc.published && (
                                        <a href={`/${app.slug}/${doc.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5" aria-label={`View ${doc.title}`}>
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                    <Link href={`/admin/legal/${app._id}/pages/${doc._id}`} className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5" aria-label={`Edit ${doc.title}`}>
                                        <Pencil className="w-4 h-4" />
                                    </Link>
                                    <button type="button" onClick={() => deleteDocument(doc)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5" aria-label={`Delete ${doc.title}`}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="flex flex-wrap gap-2">
                    {missingPresets.map((k) => (
                        <Link key={k.value} href={`/admin/legal/${app._id}/pages/new?kind=${k.value}`} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/10">
                            <Plus className="w-3 h-3" /> {k.label}
                        </Link>
                    ))}
                    <Link href={`/admin/legal/${app._id}/pages/new?kind=custom`} className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10">
                        <Plus className="w-3 h-3" /> Custom page
                    </Link>
                </div>
            </section>

            <LegalAppForm initialData={app} onSaved={(saved) => setApp(saved)} />
        </div>
    );
}
