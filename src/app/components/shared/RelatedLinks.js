"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Related-pages block for the app and project dialogs: the product's main
 * page, the linked project/app, and the app's legal pages. Fetched on open
 * from /api/{deployments|projects}/:id/links; renders nothing until there is
 * something to show, so unlinked items look exactly as before.
 */
export default function RelatedLinks({ type, id, onNavigate }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!id) return undefined;
        let active = true;
        const base = type === 'project' ? '/api/projects' : '/api/deployments';
        fetch(`${base}/${id}/links`)
            .then((response) => (response.ok ? response.json() : null))
            .then((json) => { if (active) setData(json); })
            .catch(() => { if (active) setData(null); });
        return () => { active = false; };
    }, [type, id]);

    if (!data) return null;

    const pages = [];
    if (data.productHref) pages.push({ label: 'main page', title: data.productHref, href: data.productHref });
    if (data.project) pages.push({ label: 'project', title: data.project.name, href: data.project.href });
    for (const app of data.apps || []) {
        pages.push({ label: app.isProduct ? 'main page' : 'app', title: app.name, href: app.href });
    }
    const legal = data.legal || [];
    if (pages.length === 0 && legal.length === 0) return null;

    return (
        <div className="space-y-5">
            {pages.length > 0 && (
                <LinkGroup heading="// Links">
                    {pages.map((page) => (
                        <LinkRow key={`${page.label}-${page.href}`} href={page.href} label={page.label} title={page.title} onNavigate={onNavigate} />
                    ))}
                </LinkGroup>
            )}
            {legal.length > 0 && (
                <LinkGroup heading="// Legal">
                    {legal.map((link) => (
                        <LinkRow key={link.href} href={link.href} label={link.title} title={link.href} onNavigate={onNavigate} />
                    ))}
                </LinkGroup>
            )}
        </div>
    );
}

function LinkGroup({ heading, children }) {
    return (
        <div>
            <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{heading}</div>
            <ul>{children}</ul>
        </div>
    );
}

function LinkRow({ href, label, title, onNavigate }) {
    return (
        <li style={{ borderBottom: '1px solid var(--hairline, var(--border-primary))' }}>
            <Link
                href={href}
                onClick={onNavigate}
                className="flex items-baseline justify-between gap-4 py-2.5 font-mono text-xs underline-offset-4 hover:underline"
            >
                <span className="uppercase tracking-[0.12em]" style={{ color: 'var(--accent-purple)' }}>{label}</span>
                <span className="truncate text-right" style={{ color: 'var(--text-secondary)' }}>{title} →</span>
            </Link>
        </li>
    );
}
