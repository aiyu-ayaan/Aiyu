"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, FileText, Link2, Package } from 'lucide-react';

export default function AdminLegalPage() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/legal/apps')
            .then(async (r) => {
                const data = await r.json();
                if (!r.ok) throw new Error(data?.error || 'Failed to load');
                setApps(data);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Legal</h1>
                        <p className="text-slate-400">Privacy policies, terms and other legal pages per application, served at <span className="font-mono text-slate-300">/&lt;app&gt;/&lt;page&gt;</span>.</p>
                    </div>
                    <Link href="/admin/legal/new" className="px-6 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 transition-all text-cyan-400 font-bold tracking-wide">
                        + ADD_LEGAL_APP
                    </Link>
                </div>
            </div>

            {loading && <p className="font-mono text-cyan-400 animate-pulse">LOADING_LEGAL_APPS...</p>}
            {error && <p className="font-mono text-red-400">ERROR: {error}</p>}

            {!loading && !error && apps.length === 0 && (
                <div className="bg-slate-900/50 rounded-2xl border border-dashed border-white/10 p-10 text-center">
                    <p className="text-slate-300 mb-2">No legal apps yet.</p>
                    <p className="text-sm text-slate-500">Create one, then add a Privacy Policy, Terms &amp; Conditions or any custom page.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {apps.map((app) => {
                    const published = app.documents.filter((d) => d.published).length;
                    return (
                        <Link
                            key={app._id}
                            href={`/admin/legal/${app._id}`}
                            className="group bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-cyan-500/40 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h2 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors truncate">{app.name}</h2>
                                    <p className="font-mono text-xs text-slate-500 mt-1">/{app.slug}</p>
                                </div>
                                <span className="shrink-0 font-mono text-xs text-slate-400">{published}/{app.documents.length} live</span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                                {app.packageName && <span className="inline-flex items-center gap-1.5 font-mono"><Package className="w-3.5 h-3.5" />{app.packageName}</span>}
                                {app.deploymentId && <span className="inline-flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />linked to /apps</span>}
                            </div>
                            {app.documents.length > 0 && (
                                <ul className="mt-4 flex flex-wrap gap-2">
                                    {app.documents.map((d) => (
                                        <li key={d._id} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${d.published ? 'border-cyan-500/20 text-cyan-300' : 'border-white/10 text-slate-500'}`}>
                                            <FileText className="w-3 h-3" />{d.title}{!d.published && ' (draft)'}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <span className="mt-4 inline-flex items-center gap-1 text-xs text-slate-500">
                                Manage <ExternalLink className="w-3 h-3" />
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
