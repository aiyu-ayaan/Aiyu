"use client";
import React, { useState, useEffect } from 'react';
import {
    FaBookOpen,
    FaCheck,
    FaChevronRight,
    FaGlobe,
    FaMagnifyingGlass,
    FaXmark,
} from 'react-icons/fa6';
import { Badge, EmptyState } from './ui';
import '@/app/styles/admin-projects.css';

export default function BlogLinkInput({ value, onChange }) {
    const [mode, setMode] = useState(value && !value.startsWith('/blogs/') ? 'external' : 'internal');
    const [blogs, setBlogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (value && mode === 'internal' && !value.startsWith('/blogs/')) {
            setMode('external');
        }
    }, [value, mode]);

    useEffect(() => {
        if (mode === 'internal' && blogs.length === 0) {
            fetch('/api/blogs?all=true')
                .then((r) => r.json())
                .then((d) => {
                    if (d.success && Array.isArray(d.data)) setBlogs(d.data);
                })
                .catch(console.error);
        }
    }, [mode, blogs.length]);

    const filteredBlogs = blogs.filter(
        (b) =>
            b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.slug?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedBlog = blogs.find((b) => `/blogs/${b.slug}` === value);

    const handleModeSwitch = (newMode) => {
        if (newMode === mode) return;
        setMode(newMode);
        if (newMode === 'internal' && value && !value.startsWith('/blogs/')) {
            onChange({ target: { name: 'blogLink', value: '' } });
        } else if (newMode === 'external' && value && value.startsWith('/blogs/')) {
            onChange({ target: { name: 'blogLink', value: '' } });
        }
    };

    const handleSelectBlog = (blog) => {
        onChange({ target: { name: 'blogLink', value: `/blogs/${blog.slug}` } });
        setIsModalOpen(false);
        setSearchQuery('');
    };

    const handleClear = () => {
        onChange({ target: { name: 'blogLink', value: '' } });
    };

    return (
        <div className="adm-field">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="blogLink-input" className="adm-label">
                    Blog or article link
                </label>
                <div role="group" aria-label="Blog link source" className="flex gap-1">
                    <button
                        type="button"
                        aria-pressed={mode === 'internal'}
                        onClick={() => handleModeSwitch('internal')}
                        className="adm-tab !min-h-8 !py-1 !px-2.5"
                    >
                        Internal post
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === 'external'}
                        onClick={() => handleModeSwitch('external')}
                        className="adm-tab !min-h-8 !py-1 !px-2.5"
                    >
                        External URL
                    </button>
                </div>
            </div>

            {mode === 'external' ? (
                <input
                    id="blogLink-input"
                    type="url"
                    name="blogLink"
                    value={value || ''}
                    onChange={onChange}
                    className="adm-input font-mono"
                    placeholder="https://example.com/article"
                />
            ) : (
                <div className="flex items-center gap-2">
                    <button
                        id="blogLink-input"
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="adm-row flex-1 rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--bg-primary)] justify-between"
                    >
                        <span className="flex items-center gap-3 min-w-0">
                            <FaBookOpen aria-hidden="true" className="shrink-0 text-[var(--adm-hint)]" />
                            {selectedBlog ? (
                                <span className="min-w-0 truncate">
                                    <span className="font-medium text-[var(--text-bright)]">{selectedBlog.title}</span>
                                    <span className="ml-2 font-mono text-xs text-[var(--text-secondary)]">
                                        /blogs/{selectedBlog.slug}
                                    </span>
                                </span>
                            ) : value ? (
                                <span className="font-mono text-xs text-[var(--text-primary)] truncate">{value}</span>
                            ) : (
                                <span className="text-[var(--adm-hint)] truncate">
                                    Choose a blog post from your catalog...
                                </span>
                            )}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0 text-xs font-medium text-[var(--adm-accent-ink)]">
                            {selectedBlog || value ? 'Change' : 'Browse'}
                            <FaChevronRight aria-hidden="true" className="text-[10px]" />
                        </span>
                    </button>
                    {value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="adm-icon-btn"
                            aria-label="Clear selected blog post"
                            title="Clear selected blog post"
                        >
                            <FaXmark aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div
                    className="adm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="blog-picker-title"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="adm-dialog adm-prj-dialog-framed"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="adm-prj-dialog-head">
                            <div className="min-w-0">
                                <h3 id="blog-picker-title" className="adm-panel-title">
                                    Select internal blog post
                                </h3>
                                <p className="adm-help">Link an existing article to this entry.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="adm-icon-btn"
                                aria-label="Close blog post picker"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        </header>

                        <div className="p-3 border-b border-[var(--hairline)]">
                            <div className="adm-prj-search !max-w-none">
                                <FaMagnifyingGlass aria-hidden="true" className="adm-prj-search-icon" />
                                <input
                                    type="search"
                                    autoFocus
                                    aria-label="Search blog posts"
                                    placeholder="Search by title or slug..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="adm-input"
                                />
                            </div>
                        </div>

                        <div className="adm-prj-dialog-body !p-0">
                            {filteredBlogs.length === 0 ? (
                                <EmptyState
                                    title="No matching blog posts"
                                    description="Try a different search term or clear your filter."
                                    action={
                                        searchQuery ? (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="adm-btn"
                                            >
                                                Clear filter
                                            </button>
                                        ) : null
                                    }
                                />
                            ) : (
                                <ul className="adm-list">
                                    {filteredBlogs.map((blog) => {
                                        const isActive = `/blogs/${blog.slug}` === value;
                                        return (
                                            <li key={blog._id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectBlog(blog)}
                                                    className="adm-row justify-between"
                                                >
                                                    <div className="min-w-0 flex-1 pr-3">
                                                        <p className="font-medium text-[var(--text-bright)] truncate">
                                                            {blog.title}
                                                        </p>
                                                        <p className="adm-help font-mono truncate">
                                                            /blogs/{blog.slug}
                                                            {blog.date && ` · ${new Date(blog.date).toLocaleDateString()}`}
                                                        </p>
                                                    </div>
                                                    {isActive ? (
                                                        <Badge tone="ok">
                                                            <FaCheck aria-hidden="true" /> Selected
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-[var(--text-secondary)]">Select</span>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <footer className="adm-prj-dialog-foot">
                            <span className="adm-help mr-auto font-mono">
                                {blogs.length} {blogs.length === 1 ? 'post' : 'posts'} in catalog
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="adm-btn"
                            >
                                Cancel
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
