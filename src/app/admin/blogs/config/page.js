"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Toast from '@/app/components/admin/Toast';

export default function BlogConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [config, setConfig] = useState({
        blogsTitle: 'Latest Insights',
        blogsSubtitle: 'Thoughts, tutorials, and updates on web development and technology.',
        isBlogAutomated: false,
        blogAutomationMessage: 'Automated via API'
    });

    const showToast = (message, success = true) => {
        setToast({ message, success });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/config');
                const data = await res.json();
                if (data) {
                    setConfig({
                        blogsTitle: data.blogsTitle || '',
                        blogsSubtitle: data.blogsSubtitle || '',
                        isBlogAutomated: !!data.isBlogAutomated,
                        blogAutomationMessage: data.blogAutomationMessage || ''
                    });
                }
            } catch (error) {
                console.error('Failed to fetch config', error);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                router.refresh();
                showToast('Blog configuration saved successfully.');
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Failed to save config', error);
            showToast('Failed to save configuration.', false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen text-slate-200">
            <div className="mb-8">
                <Link href="/admin/blogs" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-70 hover:opacity-100">
                    ← BACK_TO_BLOGS
                </Link>
                <h1 className="text-3xl font-bold text-white mb-2">Blog Settings</h1>
                <p className="text-slate-400">Update the header and subtitle displayed on your public blog page.</p>
            </div>

            <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-6">Page Content</h2>

                {loading ? (
                    <p className="text-slate-400 text-sm">Loading config...</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Blogs Title</label>
                            <input
                                type="text"
                                value={config.blogsTitle}
                                onChange={(e) => setConfig({ ...config, blogsTitle: e.target.value })}
                                placeholder="e.g. Latest Insights"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Blogs Subtitle</label>
                            <textarea
                                value={config.blogsSubtitle}
                                onChange={(e) => setConfig({ ...config, blogsSubtitle: e.target.value })}
                                placeholder="e.g. Thoughts, tutorials, and updates..."
                                rows="3"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-4 border-t border-slate-700/50 pt-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={config.isBlogAutomated}
                                        onChange={(e) => setConfig({ ...config, isBlogAutomated: e.target.checked })}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${config.isBlogAutomated ? 'bg-cyan-500' : 'bg-slate-700'}`}></div>
                                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.isBlogAutomated ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className="text-sm font-medium text-slate-300">Indicate Blog Automation</span>
                            </label>
                        </div>
                        
                        {config.isBlogAutomated && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Automation Hover Message</label>
                                <textarea
                                    value={config.blogAutomationMessage}
                                    onChange={(e) => setConfig({ ...config, blogAutomationMessage: e.target.value })}
                                    placeholder="Explain how posts are automated..."
                                    rows="2"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                                />
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </section>
            
            <Toast notification={toast} onClose={() => setToast(null)} />
        </div>
    );
}
