"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SOCIAL_PAGES } from '@/lib/socialMeta';
import Toast from './Toast';

const emptyPages = () =>
    SOCIAL_PAGES.reduce((acc, page) => {
        acc[page.key] = { title: '', description: '', image: '' };
        return acc;
    }, {});

const SocialMetaForm = () => {
    const router = useRouter();
    // Branding / global metadata — persisted to /api/config (moved here from Config).
    const [branding, setBranding] = useState({
        siteTitle: '',
        ogImage: '',
        favicon: { value: '', filename: '', mimeType: '' },
    });
    // Per-page social overrides — persisted to /api/admin/social.
    const [pages, setPages] = useState(emptyPages());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);
    const [uploading, setUploading] = useState(null); // 'global' | page.key

    useEffect(() => {
        fetchData();
    }, []);

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchData = async () => {
        try {
            const [configRes, socialRes] = await Promise.all([
                fetch('/api/config'),
                fetch('/api/admin/social'),
            ]);

            if (configRes.ok) {
                const data = await configRes.json();
                setBranding({
                    siteTitle: data?.siteTitle || '',
                    ogImage: data?.ogImage || '',
                    favicon: {
                        value: data?.favicon?.value || '',
                        filename: data?.favicon?.filename || '',
                        mimeType: data?.favicon?.mimeType || '',
                    },
                });
            }

            if (socialRes.ok) {
                const data = await socialRes.json();
                const stored = data?.social?.pages || {};
                setPages((prev) => {
                    const next = { ...prev };
                    for (const page of SOCIAL_PAGES) {
                        next[page.key] = {
                            title: stored[page.key]?.title || '',
                            description: stored[page.key]?.description || '',
                            image: stored[page.key]?.image || '',
                        };
                    }
                    return next;
                });
            }
        } catch (err) {
            console.error('Failed to fetch social metadata', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBrandingChange = (e) => {
        const { name, value } = e.target;
        setBranding((prev) => ({ ...prev, [name]: value }));
    };

    const handlePageChange = (key, field, value) => {
        setPages((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    };

    const handleFaviconUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 1 * 1024 * 1024) {
            setError('Favicon size too large. Max 1MB.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setBranding((prev) => ({
                ...prev,
                favicon: { value: reader.result, filename: file.name, mimeType: file.type },
            }));
        };
        reader.readAsDataURL(file);
    };

    // Upload an image asset via /api/upload and drop the returned URL into a target.
    const uploadImage = async (file, apply, scope) => {
        setUploading(scope);
        setError('');
        try {
            const payload = new FormData();
            payload.append('file', file);
            const response = await fetch('/api/upload', { method: 'POST', body: payload });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to upload image');
            }
            apply(data.url);
            showNotification(true, 'Image uploaded and preview updated.');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to upload image';
            setError(message);
            showNotification(false, message);
        } finally {
            setUploading(null);
        }
    };

    const handleGlobalImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadImage(file, (url) => setBranding((prev) => ({ ...prev, ogImage: url })), 'global');
        e.target.value = '';
    };

    const handlePageImageUpload = (key, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadImage(file, (url) => handlePageChange(key, 'image', url), key);
        e.target.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const [configRes, socialRes] = await Promise.all([
                fetch('/api/config', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        siteTitle: branding.siteTitle,
                        ogImage: branding.ogImage,
                        favicon: branding.favicon,
                    }),
                }),
                fetch('/api/admin/social', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ social: { defaultImage: '', pages } }),
                }),
            ]);

            if (configRes.ok && socialRes.ok) {
                showNotification(true, 'Social & Metadata Updated Successfully');
                router.refresh();
                fetchData();
            } else {
                const failed = !configRes.ok ? configRes : socialRes;
                const data = await failed.json().catch(() => ({}));
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to update');
            }
        } catch {
            setError('An error occurred');
            showNotification(false, 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-cyan-400 font-mono animate-pulse">LOADING_SOCIAL_METADATA...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-12 max-w-4xl mx-auto">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    {error}
                </div>
            )}

            {/* SEO & Metadata (global) */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-green-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    SEO & Metadata
                    <div className="h-px bg-green-500/10 flex-grow" />
                </h2>

                <div className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Site Title</label>
                        <input
                            type="text"
                            name="siteTitle"
                            value={branding.siteTitle}
                            onChange={handleBrandingChange}
                            placeholder="Ayaan's Portfolio"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                            {'// The title shown in the browser tab.'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Favicon Source</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-slate-950/50 border border-white/10 hover:border-green-500/50 text-slate-300 px-4 py-3 rounded-lg transition-all flex items-center gap-3 w-full">
                                <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs font-bold uppercase">Upload</span>
                                <span className="text-sm truncate opacity-60 hover:opacity-100 transition-opacity">
                                    {branding.favicon.filename || "Select .ico, .png, .svg..."}
                                </span>
                                <input
                                    type="file"
                                    accept=".ico,.png,.jpg,.svg"
                                    onChange={handleFaviconUpload}
                                    className="hidden"
                                />
                            </label>
                            {branding.favicon.value && (
                                <div className="h-12 w-12 rounded-lg bg-slate-950/50 border border-white/10 flex items-center justify-center p-2 shrink-0">
                                    <img src={branding.favicon.value} alt="Favicon Preview" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Global / Default Open Graph Image</label>
                        <div className="space-y-3">
                            <input
                                type="text"
                                name="ogImage"
                                value={branding.ogImage}
                                onChange={handleBrandingChange}
                                placeholder="/api/uploads/your-og-image.webp or https://example.com/og-image.png"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none transition-all placeholder:text-slate-600 font-mono text-sm"
                            />
                            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                <label className={`cursor-pointer bg-slate-950/50 border border-white/10 hover:border-green-500/50 text-slate-300 px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${uploading === 'global' ? 'opacity-60 pointer-events-none' : ''}`}>
                                    <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs font-bold uppercase">
                                        {uploading === 'global' ? 'Uploading' : 'Upload'}
                                    </span>
                                    <span className="text-sm opacity-70">Select image</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleGlobalImageUpload}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-xs text-slate-500 font-mono">
                                    {'// Fallback OG image for every page below. Public metadata updates after save.'}
                                </p>
                            </div>
                            {branding.ogImage && (
                                <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/50">
                                    <img
                                        src={branding.ogImage}
                                        alt="Global OG Image Preview"
                                        className="w-full max-h-64 object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Per-page overrides */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest mb-2 flex items-center gap-4">
                    Per-Page Social Metadata
                    <div className="h-px bg-cyan-500/10 flex-grow" />
                </h2>
                <p className="text-xs text-slate-500 mb-8 font-mono">
                    {'// Blank fields fall back to the page default and the global image above. Blog posts are managed per-post.'}
                </p>

                <div className="space-y-6 relative z-10">
                    {SOCIAL_PAGES.map((page) => {
                        const entry = pages[page.key];
                        const previewImage = entry.image || branding.ogImage;
                        return (
                            <div key={page.key} className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/20 transition-colors">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-cyan-500 rounded-full" /> {page.label}
                                    <span className="text-slate-600 font-mono normal-case tracking-normal">{page.key}</span>
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">OG Title</label>
                                            <input
                                                type="text"
                                                value={entry.title}
                                                onChange={(e) => handlePageChange(page.key, 'title', e.target.value)}
                                                placeholder={page.hint}
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">OG Description</label>
                                            <input
                                                type="text"
                                                value={entry.description}
                                                onChange={(e) => handlePageChange(page.key, 'description', e.target.value)}
                                                placeholder="Shown in social share previews"
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600/50"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">OG Image</label>
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start">
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    type="text"
                                                    value={entry.image}
                                                    onChange={(e) => handlePageChange(page.key, 'image', e.target.value)}
                                                    placeholder="Leave blank to use the global image"
                                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600/50 font-mono text-sm"
                                                />
                                                <label className={`cursor-pointer bg-slate-950/50 border border-white/10 hover:border-cyan-500/50 text-slate-300 px-4 py-2 rounded-lg transition-all inline-flex items-center gap-3 ${uploading === page.key ? 'opacity-60 pointer-events-none' : ''}`}>
                                                    <span className="bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded text-xs font-bold uppercase">
                                                        {uploading === page.key ? 'Uploading' : 'Upload'}
                                                    </span>
                                                    <span className="text-sm opacity-70">Select image</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handlePageImageUpload(page.key, e)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                            {previewImage && (
                                                <div className="w-full md:w-48 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950/50">
                                                    <img
                                                        src={previewImage}
                                                        alt={`${page.label} OG preview`}
                                                        className="w-full h-28 object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                    {!entry.image && (
                                                        <p className="text-[10px] text-slate-500 font-mono px-2 py-1">{'// global fallback'}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-8 flex justify-end gap-4 pt-6 border-t border-white/5 bg-slate-900/90 backdrop-blur-lg p-4 rounded-xl border border-white/5 shadow-2xl z-50 mt-12">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors text-sm font-medium"
                >
                    CANCEL
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            UPDATING...
                        </>
                    ) : (
                        'CONFIRM_UPDATE'
                    )}
                </button>
            </div>

            <Toast notification={notification} />
        </form>
    );
};

export default SocialMetaForm;
