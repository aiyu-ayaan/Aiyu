"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowUpRightFromSquare, FaLink, FaPlus } from 'react-icons/fa6';
import { Panel } from './ui';
import '@/app/styles/admin-projects.css';

/**
 * Shows which /apps entries are linked to this project (Deployment.projectId),
 * with a shortcut to publish the project as an app — the new-app form arrives
 * pre-linked and pre-filled from this project.
 */
export default function ProjectAppLinks({ project }) {
    const [apps, setApps] = useState(null);

    useEffect(() => {
        if (!project?._id) return;
        fetch('/api/deployments')
            .then((response) => (response.ok ? response.json() : []))
            .then((rows) => setApps((Array.isArray(rows) ? rows : []).filter((row) => row.projectId === project._id)))
            .catch(() => setApps([]));
    }, [project?._id]);

    if (apps === null || !project?._id) return null;

    return (
        <Panel
            title="Linked apps"
            actions={
                apps.length === 0 ? (
                    <Link href={`/admin/apps/new?projectId=${project._id}`} className="adm-btn">
                        <FaPlus aria-hidden="true" /> Add to apps
                    </Link>
                ) : null
            }
            flush={apps.length > 0}
        >
            {apps.length > 0 ? (
                <ul className="adm-list">
                    {apps.map((app) => (
                        <li key={app._id} className="adm-row justify-between flex-wrap">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <FaLink aria-hidden="true" className="shrink-0 text-[var(--adm-hint)]" />
                                <div className="min-w-0">
                                    <Link href={`/admin/apps/${app._id}`} className="adm-link font-medium">
                                        {app.name}
                                    </Link>
                                    {app.slug && (
                                        <span className="ml-2 font-mono text-xs text-[var(--text-secondary)]">
                                            /apps/{app.slug}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {app.slug && (
                                    <Link
                                        href={`/apps/${app.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="adm-btn adm-btn-quiet"
                                    >
                                        View live <FaArrowUpRightFromSquare aria-hidden="true" className="text-xs" />
                                    </Link>
                                )}
                                <Link href={`/admin/apps/${app._id}`} className="adm-btn">
                                    Edit app
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="adm-help">
                    Not listed on the apps page yet. Publishing this project as an app cross-links{' '}
                    <code className="adm-code">/projects/{project.slug || project._id}</code> and the live app page.
                </p>
            )}
        </Panel>
    );
}
