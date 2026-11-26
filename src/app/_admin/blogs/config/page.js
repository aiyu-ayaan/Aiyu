"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaCheck, FaArrowUpRightFromSquare, FaPlus, FaCode } from 'react-icons/fa6';
import Toast from '@/app/components/admin/Toast';
import { PageHeader, Panel, Badge, Loading, Field } from '@/app/components/admin/ui';
import '@/app/styles/admin-blogs.css';

export default function BlogConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [config, setConfig] = useState({
        blogsTitle: 'Latest Insights',
        blogsSubtitle: 'Thoughts, tutorials, and updates on web development and technology.',
        isBlogAutomated: false,
        blogAutomationMessage: 'Automated via API',
        showBlogViewCount: false,
        enableBlogReviewEngine: true,
        customTestKeywords: ''
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
                        blogAutomationMessage: data.blogAutomationMessage || '',
                        showBlogViewCount: !!data.showBlogViewCount,
                        enableBlogReviewEngine: data.enableBlogReviewEngine !== false,
                        customTestKeywords: data.customTestKeywords || ''
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
                showToast('Blog configuration saved.');
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
        <div className="adm-page">
            <PageHeader
                command="vim config"
                title="Blog settings"
                description="Update the public blog heading, reader counters, and automated review heuristics."
                actions={
                    <Link href="/admin/blogs" className="adm-btn">
                        <FaArrowLeft aria-hidden="true" /> Back to blogs
                    </Link>
                }
            />

            {loading ? (
                <Panel>
                    <Loading label="Loading blog settings" rows={5} />
                </Panel>
            ) : (
                <form onSubmit={handleSubmit} className="adm-split">
                    <div className="adm-stack">
                        <Panel title="Public header">
                            <div className="space-y-4">
                                <Field
                                    label="Blogs title"
                                    help="Main heading displayed at the top of the public /blogs page."
                                >
                                    <input
                                        type="text"
                                        value={config.blogsTitle}
                                        onChange={(e) => setConfig({ ...config, blogsTitle: e.target.value })}
                                        placeholder="Latest Insights"
                                        className="adm-input"
                                    />
                                </Field>

                                <Field
                                    label="Blogs subtitle"
                                    help="Short description shown under the blog title."
                                >
                                    <textarea
                                        value={config.blogsSubtitle}
                                        onChange={(e) => setConfig({ ...config, blogsSubtitle: e.target.value })}
                                        placeholder="Thoughts, tutorials, and updates..."
                                        rows={3}
                                        className="adm-input"
                                    />
                                </Field>
                            </div>
                        </Panel>

                        <Panel title="Display & automation">
                            <div>
                                <div className="adm-switch-row">
                                    <div className="min-w-0">
                                        <label htmlFor="blog-automated-switch" className="adm-label cursor-pointer">
                                            Indicate blog automation
                                        </label>
                                        <p className="adm-help mt-1">
                                            Shows an automation note on the public blog page when posts are published via API or workflows.
                                        </p>
                                    </div>
                                    <button
                                        id="blog-automated-switch"
                                        type="button"
                                        role="switch"
                                        aria-checked={config.isBlogAutomated}
                                        aria-label="Indicate blog automation"
                                        onClick={() => setConfig({ ...config, isBlogAutomated: !config.isBlogAutomated })}
                                        className="adm-switch"
                                    />
                                </div>

                                {config.isBlogAutomated && (
                                    <div className="pb-3">
                                        <Field
                                            label="Automation message"
                                            help="Text shown next to the automation indicator."
                                        >
                                            <input
                                                type="text"
                                                value={config.blogAutomationMessage}
                                                onChange={(e) => setConfig({ ...config, blogAutomationMessage: e.target.value })}
                                                placeholder="Automated via API"
                                                className="adm-input"
                                            />
                                        </Field>
                                    </div>
                                )}

                                <div className="adm-switch-row">
                                    <div className="min-w-0">
                                        <label htmlFor="blog-views-switch" className="adm-label cursor-pointer">
                                            Show view count on posts
                                        </label>
                                        <p className="adm-help mt-1">
                                            Displays total views on each article from internal analytics. Views recorded while signed in as admin are excluded.
                                        </p>
                                    </div>
                                    <button
                                        id="blog-views-switch"
                                        type="button"
                                        role="switch"
                                        aria-checked={config.showBlogViewCount}
                                        aria-label="Show view count on posts"
                                        onClick={() => setConfig({ ...config, showBlogViewCount: !config.showBlogViewCount })}
                                        className="adm-switch"
                                    />
                                </div>
                            </div>
                        </Panel>

                        <Panel
                            title="Automated review engine"
                            actions={
                                <Badge tone={config.enableBlogReviewEngine ? 'ok' : 'warn'}>
                                    {config.enableBlogReviewEngine ? 'Active' : 'Disabled'}
                                </Badge>
                            }
                        >
                            <div className="space-y-4">
                                <div className="adm-switch-row pt-0">
                                    <div className="min-w-0">
                                        <label htmlFor="blog-review-engine-switch" className="adm-label cursor-pointer">
                                            Enable automated blog review engine
                                        </label>
                                        <p className="adm-help mt-1">
                                            Scans newly created or API-submitted posts for test patterns, demo indicators, or spam heuristics. Flagged posts are held as drafts for admin approval.
                                        </p>
                                    </div>
                                    <button
                                        id="blog-review-engine-switch"
                                        type="button"
                                        role="switch"
                                        aria-checked={config.enableBlogReviewEngine}
                                        aria-label="Enable automated blog review engine"
                                        onClick={() => setConfig({ ...config, enableBlogReviewEngine: !config.enableBlogReviewEngine })}
                                        className="adm-switch"
                                    />
                                </div>

                                {config.enableBlogReviewEngine && (
                                    <Field
                                        label="Custom test keywords & blocked patterns"
                                        help="In addition to built-in patterns (test, demo, sample, lorem ipsum, foo bar), any post containing these comma- or line-separated keywords is automatically flagged for review."
                                    >
                                        <textarea
                                            value={config.customTestKeywords}
                                            onChange={(e) => setConfig({ ...config, customTestKeywords: e.target.value })}
                                            placeholder="test post, internal preview, staging draft"
                                            rows={3}
                                            className="adm-input font-mono"
                                        />
                                    </Field>
                                )}
                            </div>
                        </Panel>
                    </div>

                    <aside className="adm-stack adm-side">
                        <Panel title="Save configuration">
                            <p className="adm-help mb-4">
                                Changes update the public blog header and review heuristics immediately.
                            </p>
                            <button
                                type="submit"
                                disabled={saving}
                                className="adm-btn adm-btn-primary w-full"
                            >
                                <FaCheck aria-hidden="true" />
                                {saving ? 'Saving...' : 'Save changes'}
                            </button>

                            <dl className="adm-facts mt-4 pt-4 border-t border-[var(--hairline)]">
                                <div>
                                    <dt>View counter</dt>
                                    <dd>{config.showBlogViewCount ? 'Visible' : 'Hidden'}</dd>
                                </div>
                                <div>
                                    <dt>Automation badge</dt>
                                    <dd>{config.isBlogAutomated ? 'Shown' : 'Off'}</dd>
                                </div>
                                <div>
                                    <dt>Review engine</dt>
                                    <dd>{config.enableBlogReviewEngine ? 'Enabled' : 'Disabled'}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title="Shortcuts" flush>
                            <ul className="adm-list">
                                <li>
                                    <Link href="/admin/blogs" className="adm-row justify-between">
                                        <span>All blog posts</span>
                                        <span className="adm-help font-mono">/admin/blogs</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/blogs/new" className="adm-row justify-between">
                                        <span className="inline-flex items-center gap-2">
                                            <FaPlus aria-hidden="true" className="w-3 h-3" /> Write new post
                                        </span>
                                        <span className="adm-help font-mono">/new</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/api-reference" className="adm-row justify-between">
                                        <span className="inline-flex items-center gap-2">
                                            <FaCode aria-hidden="true" className="w-3 h-3" /> Blog API reference
                                        </span>
                                        <span className="adm-help font-mono">/api-reference</span>
                                    </Link>
                                </li>
                                <li>
                                    <a href="/blogs" target="_blank" rel="noopener noreferrer" className="adm-row justify-between">
                                        <span>View public blog</span>
                                        <FaArrowUpRightFromSquare aria-hidden="true" className="w-3 h-3 text-[var(--adm-hint)]" />
                                    </a>
                                </li>
                            </ul>
                        </Panel>
                    </aside>
                </form>
            )}

            <Toast notification={toast} onClose={() => setToast(null)} />
        </div>
    );
}
