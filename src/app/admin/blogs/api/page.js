"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

export default function BlogApiReferencePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const [tokenStatus, setTokenStatus] = useState({ hasToken: false, last4: '', createdAt: null });
    const [newToken, setNewToken] = useState('');
    const [copied, setCopied] = useState(false);

    const samplePayload = useMemo(() => ({
        title: "How I Automated Blog Publishing",
        content: "## Intro\\nThis post was created via API.",
        excerpt: "A quick post generated from automation workflow.",
        tags: ["automation", "api", "blog"],
        keywords: ["automation", "api blogging", "workflow"],
        image: "https://example.com/cover.jpg",
        imageAlt: "Automation workflow diagram",
        socialTitle: "API-Generated Blog Post",
        socialDescription: "Create and publish blog posts from your own tools.",
        socialImage: "https://example.com/social.jpg",
        socialImageAlt: "Social preview image",
        published: true,
        date: "April 18, 2026"
    }), []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/blogs/token');
            const data = await res.json();
            if (data?.success && data?.data) {
                setTokenStatus(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch token status', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const generateToken = async () => {
        setSaving(true);
        setCopied(false);
        try {
            const res = await fetch('/api/admin/blogs/token', { method: 'POST' });
            const data = await res.json();
            if (data?.success) {
                setNewToken(data.data.token);
                await fetchStatus();
            }
        } catch (error) {
            console.error('Failed to generate token', error);
        } finally {
            setSaving(false);
        }
    };

    const revokeToken = async () => {
        if (!confirm('Revoke blog API token? Existing automations will fail until you generate a new token.')) return;
        setRevoking(true);
        try {
            const res = await fetch('/api/admin/blogs/token', { method: 'DELETE' });
            const data = await res.json();
            if (data?.success) {
                setNewToken('');
                await fetchStatus();
            }
        } catch (error) {
            console.error('Failed to revoke token', error);
        } finally {
            setRevoking(false);
        }
    };

    const copyToken = async () => {
        if (!newToken) return;
        try {
            await navigator.clipboard.writeText(newToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error('Failed to copy token', error);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen text-slate-200">
            <div className="mb-8">
                <Link href="/admin/blogs" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-70 hover:opacity-100">
                    ← BACK_TO_BLOGS
                </Link>
                <h1 className="text-3xl font-bold text-white mb-2">Blog API Reference</h1>
                <p className="text-slate-400">Generate a Bearer token and automate blog creation from external tools.</p>
            </div>

            <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">API Token</h2>

                {loading ? (
                    <p className="text-slate-400 text-sm">Loading token status...</p>
                ) : (
                    <div className="space-y-4">
                        <div className="text-sm text-slate-300">
                            <p>
                                Status: {tokenStatus.hasToken ? (
                                    <span className="text-emerald-400 font-semibold">Active</span>
                                ) : (
                                    <span className="text-amber-400 font-semibold">Not generated</span>
                                )}
                            </p>
                            {tokenStatus.hasToken ? (
                                <p className="text-slate-400 mt-1">
                                    Token ending: <span className="font-mono text-slate-300">****{tokenStatus.last4}</span>
                                    {tokenStatus.createdAt ? ` • Created: ${new Date(tokenStatus.createdAt).toLocaleString()}` : ''}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={generateToken}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50"
                            >
                                {saving ? 'Generating...' : tokenStatus.hasToken ? 'Regenerate Token' : 'Generate Token'}
                            </button>
                            <button
                                type="button"
                                onClick={revokeToken}
                                disabled={revoking || !tokenStatus.hasToken}
                                className="px-4 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 text-sm font-semibold disabled:opacity-50"
                            >
                                {revoking ? 'Revoking...' : 'Revoke Token'}
                            </button>
                        </div>

                        {newToken ? (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                                <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-2">
                                    Copy now (shown once)
                                </p>
                                <code className="block break-all text-sm text-slate-100 bg-black/30 p-3 rounded border border-white/10">
                                    {newToken}
                                </code>
                                <button
                                    type="button"
                                    onClick={copyToken}
                                    className="mt-3 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm"
                                >
                                    {copied ? 'Copied' : 'Copy token'}
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">API Docs</h2>

                <div>
                    <p className="text-slate-300 text-sm mb-2">Create Blog Post</p>
                    <code className="text-sm text-cyan-300">POST /api/blogs</code>
                </div>

                <div>
                    <p className="text-slate-300 text-sm mb-2">Headers</p>
                    <pre className="text-xs bg-black/30 border border-white/10 rounded p-3 overflow-x-auto text-slate-200">{`Authorization: Bearer <YOUR_BLOG_API_TOKEN>
Content-Type: application/json`}</pre>
                </div>

                <div>
                    <p className="text-slate-300 text-sm mb-2">Request Body (example)</p>
                    <pre className="text-xs bg-black/30 border border-white/10 rounded p-3 overflow-x-auto text-slate-200">{JSON.stringify(samplePayload, null, 2)}</pre>
                </div>

                <div>
                    <p className="text-slate-300 text-sm mb-2">cURL Example</p>
                    <pre className="text-xs bg-black/30 border border-white/10 rounded p-3 overflow-x-auto text-slate-200">{`curl -X POST "http://localhost:3000/api/blogs" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(samplePayload)}'`}</pre>
                </div>

                <div className="text-xs text-slate-400">
                    <p>Notes:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>If SEO/social fields are omitted, your blog metadata fallbacks are used.</li>
                        <li>`published: true` will make the post public immediately.</li>
                        <li>`date` should be in human readable format (e.g. "April 18, 2026").</li>
                    </ul>
                </div>
            </section>
        </div>
    );
}
