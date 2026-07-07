"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Toast from './Toast';

const VERSIONS = [
    {
        id: 'classic',
        name: 'Classic',
        path: '/',
        description: 'The original glass-panel experience. Header with mega menu, card grids, framer-motion reveals.',
        routes: ['/', '/about-me', '/projects', '/gallery', '/apps', '/blogs', '/contact-us'],
    },
    {
        id: 'v2',
        name: 'V2 — Editorial Depth',
        path: '/v2',
        description: 'The 3D scroll redesign. Numbered chapters, hairline ledger rows, GSAP depth animations, terminal chrome. Served at the same URLs — no /v2 prefix in public links.',
        routes: ['/', '/about-me', '/projects', '/gallery', '/apps', '/blogs', '/contact-us'],
    },
];

/**
 * Default site version switch. Saves `defaultSiteVersion` on the config
 * singleton. The default version owns the clean URLs (served there by rewrite —
 * the address bar never shows /v1 or /v2). The other version stays reachable by
 * visiting its explicit /v1 or /v2 prefix. Routing is driven purely by the URL,
 * not a cookie, so switching the default takes effect for every visitor within
 * the proxy's short cache window (see src/proxy.js).
 */
const VersionForm = () => {
    const [selected, setSelected] = useState('classic');
    const [initialLoading, setInitialLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        let cancelled = false;

        fetch('/api/config')
            .then((res) => res.json())
            .then((config) => {
                if (cancelled) return;
                setSelected(config?.defaultSiteVersion === 'v2' ? 'v2' : 'classic');
            })
            .catch(() => { })
            .finally(() => {
                if (!cancelled) setInitialLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ defaultSiteVersion: selected }),
            });

            if (response.ok) {
                showNotification(true, `Default version set to ${selected === 'v2' ? 'V2' : 'Classic'}`);
            } else {
                const data = await response.json().catch(() => ({}));
                showNotification(false, data.error || 'Failed to save');
            }
        } catch {
            showNotification(false, 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {VERSIONS.map((version) => {
                    const active = selected === version.id;
                    return (
                        <button
                            key={version.id}
                            type="button"
                            onClick={() => setSelected(version.id)}
                            disabled={initialLoading}
                            aria-pressed={active}
                            className={`rounded-xl border p-5 text-left transition-all backdrop-blur-xl disabled:opacity-50 ${active
                                ? 'border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(8,145,178,0.2)]'
                                : 'border-white/10 bg-slate-900/50 hover:border-white/25'
                                }`}
                        >
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="font-bold text-white">{version.name}</span>
                                <span
                                    className={`h-3.5 w-3.5 rounded-full border-2 ${active ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'}`}
                                    aria-hidden="true"
                                />
                            </div>
                            <p className="mb-4 text-sm leading-relaxed text-slate-400">{version.description}</p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                                {version.routes.join(' · ')}
                            </p>
                        </button>
                    );
                })}
            </div>

            <div className="rounded-lg border border-white/5 bg-white/5 p-4 font-mono text-xs leading-relaxed text-slate-400">
                <p className="mb-1 text-slate-300">How it behaves</p>
                <p>→ Classic (default): the classic (v1) pages serve at the clean URLs; the v2 experience stays reachable under /v2 and the home popup keeps promoting it.</p>
                <p>→ V2 (default): the clean URLs serve the v2 pages directly (URL rewrite — the address bar never shows /v2, and the sitemap keeps the same URL structure). Direct /v2 links redirect to the clean URLs; classic (v1) stays reachable under /v1.</p>
                <p>→ Whichever version is NOT the default is browsed under its visible /v1 or /v2 prefix — the version follows the URL, not a cookie.</p>
                <p>→ Changes take effect within ~30 seconds (the proxy caches the flag briefly).</p>
                <p className="mt-2">
                    Preview:{' '}
                    <Link href="/" target="_blank" className="text-cyan-400 hover:underline">classic</Link>
                    {' · '}
                    <Link href="/v2" target="_blank" className="text-cyan-400 hover:underline">v2</Link>
                </p>
            </div>

            <div className="flex justify-end border-t border-white/5 pt-6">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || initialLoading}
                    className="rounded bg-cyan-600 px-8 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-[0_0_20px_rgba(8,145,178,0.3)] transition-all hover:bg-cyan-500 hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? 'UPDATING_SYSTEM...' : 'SET_DEFAULT_VERSION'}
                </button>
            </div>

            <Toast notification={notification} />
        </div>
    );
};

export default VersionForm;
