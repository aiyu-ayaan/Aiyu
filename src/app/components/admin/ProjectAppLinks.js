"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Link2, Plus } from 'lucide-react';

/**
 * Shows which /apps entries are linked to this project (Deployment.projectId),
 * with a shortcut to publish the project as an app — the new-app form arrives
 * pre-linked and pre-filled from this project.
 */
export default function ProjectAppLinks({ project }) {
    const [apps, setApps] = useState(null);

    useEffect(() => {
        fetch('/api/deployments')
            .then((response) => (response.ok ? response.json() : []))
            .then((rows) => setApps((Array.isArray(rows) ? rows : []).filter((row) => row.projectId === project._id)))
            .catch(() => setApps([]));
    }, [project._id]);

    if (apps === null) return null;

    return (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-5 py-4">
            <div className="flex items-start gap-3 min-w-0">
                <Link2 className="w-4 h-4 mt-0.5 text-sky-400 shrink-0" />
                {apps.length > 0 ? (
                    <p className="text-sm text-slate-300">
                        Published as app:{' '}
                        {apps.map((app, index) => (
                            <span key={app._id}>
                                {index > 0 && ', '}
                                <Link href={`/admin/apps/${app._id}`} className="text-sky-300 hover:underline">{app.name}</Link>
                                <span className="font-mono text-xs text-slate-500"> (/apps/{app.slug})</span>
                            </span>
                        ))}
                    </p>
                ) : (
                    <p className="text-sm text-slate-400">Not on the Apps page yet. Publishing it there cross-links <span className="font-mono text-slate-300">/projects/{project.slug}</span> and the app page.</p>
                )}
            </div>
            {apps.length === 0 && (
                <Link href={`/admin/apps/new?projectId=${project._id}`} className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-sky-500/30 px-3 py-2 text-xs font-bold uppercase tracking-wider text-sky-300 hover:bg-sky-500/10">
                    <Plus className="w-3.5 h-3.5" /> Add to Apps
                </Link>
            )}
        </div>
    );
}
