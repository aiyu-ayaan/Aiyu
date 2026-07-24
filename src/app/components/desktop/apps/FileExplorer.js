"use client";
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    ChevronRight,
    Folder,
    FileText,
    Image as ImageIcon,
    Home,
    Monitor,
    ArrowLeft,
    Search,
    Loader2,
    X,
} from 'lucide-react';

const NAV = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'pictures', label: 'Pictures', icon: ImageIcon },
    { key: 'blogs', label: 'Documents', icon: FileText },
    { key: 'pc', label: 'This PC', icon: Monitor },
];

// Turn a blog record into a fake .md file entry.
const blogFileName = (blog) =>
    `${(blog.slug || blog.title || 'untitled').toString().slice(0, 40).replace(/\s+/g, '-').toLowerCase()}.md`;

export default function FileExplorer({ openApp }) {
    const [folder, setFolder] = useState('home');
    const [gallery, setGallery] = useState([]);
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [preview, setPreview] = useState(null); // { type:'image', item } | { type:'blog', item }

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [g, b] = await Promise.all([
                    fetch('/api/gallery').then((r) => r.json()).catch(() => null),
                    fetch('/api/blogs').then((r) => r.json()).catch(() => null),
                ]);
                if (!alive) return;
                setGallery(g?.data || []);
                setBlogs(b?.data || []);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    const pathLabel = useMemo(() => {
        const map = { home: 'Home', pictures: 'This PC > Pictures', blogs: 'This PC > Documents > Blogs', pc: 'This PC' };
        return map[folder] || 'Home';
    }, [folder]);

    const filteredGallery = gallery.filter((g) =>
        !query || (g.description || '').toLowerCase().includes(query.toLowerCase())
    );
    const filteredBlogs = blogs.filter((b) =>
        !query || (b.title || '').toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="flex h-full w-full text-sm text-neutral-800 dark:text-neutral-200">
            {/* Sidebar */}
            <aside className="hidden w-48 shrink-0 overflow-y-auto border-r border-black/10 bg-[#f8f8f8] p-2 dark:border-white/10 dark:bg-[#252525] sm:block">
                {NAV.map((n) => (
                    <button
                        key={n.key}
                        onClick={() => {
                            setFolder(n.key);
                            setPreview(null);
                        }}
                        className={`mb-0.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${
                            folder === n.key ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300' : 'hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        <n.icon className="h-4 w-4" />
                        <span className="truncate">{n.label}</span>
                    </button>
                ))}
            </aside>

            {/* Main */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Toolbar */}
                <div className="flex items-center gap-2 border-b border-black/10 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-[#1e1e1e]">
                    <button
                        onClick={() => setFolder('home')}
                        className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5"
                        aria-label="Back to home"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex min-w-0 flex-1 items-center gap-1 rounded border border-black/10 bg-black/5 px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5">
                        <span className="truncate opacity-70">{pathLabel}</span>
                        <ChevronRight className="h-3 w-3 opacity-40" />
                    </div>
                    <div className="flex items-center gap-1 rounded border border-black/10 bg-black/5 px-2 py-1 dark:border-white/10 dark:bg-white/5">
                        <Search className="h-3.5 w-3.5 opacity-50" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search"
                            className="w-24 bg-transparent text-xs outline-none placeholder:opacity-50 sm:w-32"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex h-full items-center justify-center opacity-60">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : folder === 'home' || folder === 'pc' ? (
                        <HomeView
                            onOpen={setFolder}
                            galleryCount={gallery.length}
                            blogCount={blogs.length}
                        />
                    ) : folder === 'pictures' ? (
                        <IconGrid>
                            {filteredGallery.map((g, idx) => (
                                <FileTile
                                    key={g._id || g.src || idx}
                                    label={g.description || 'image'}
                                    onOpen={() => {
                                        if (openApp) {
                                            openApp('photos', { images: filteredGallery, index: idx });
                                        } else {
                                            setPreview({ type: 'image', item: g });
                                        }
                                    }}
                                    thumb={g.thumbnail || g.src}
                                />
                            ))}
                            {filteredGallery.length === 0 && <Empty label="No pictures" />}
                        </IconGrid>
                    ) : (
                        <IconGrid>
                            {filteredBlogs.map((b) => (
                                <FileTile
                                    key={b._id || b.slug}
                                    label={blogFileName(b)}
                                    onOpen={() => {
                                        if (openApp) {
                                            openApp('markdown', { slug: b.slug, blog: b });
                                        } else {
                                            setPreview({ type: 'blog', item: b });
                                        }
                                    }}
                                    icon={FileText}
                                />
                            ))}
                            {filteredBlogs.length === 0 && <Empty label="No documents" />}
                        </IconGrid>
                    )}
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between border-t border-black/10 bg-white px-3 py-1 text-[11px] opacity-70 dark:border-white/10 dark:bg-[#1e1e1e]">
                    <span>
                        {folder === 'pictures'
                            ? `${filteredGallery.length} items`
                            : folder === 'blogs'
                            ? `${filteredBlogs.length} items`
                            : `${gallery.length + blogs.length} items`}
                    </span>
                    <span>Aiyu OS File Explorer</span>
                </div>
            </div>

            {preview && <PreviewOverlay preview={preview} onClose={() => setPreview(null)} fileName={preview.type === 'blog' ? blogFileName(preview.item) : undefined} />}
        </div>
    );
}

function HomeView({ onOpen, galleryCount, blogCount }) {
    const cards = [
        { key: 'pictures', label: 'Pictures', sub: `${galleryCount} items`, icon: ImageIcon },
        { key: 'blogs', label: 'Documents', sub: `${blogCount} blogs`, icon: FileText },
    ];
    return (
        <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide opacity-60">Quick access</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cards.map((c) => (
                    <button
                        key={c.key}
                        onClick={() => onOpen(c.key)}
                        className="flex items-center gap-3 rounded-lg border border-black/10 bg-white p-3 text-left hover:border-blue-400 hover:bg-blue-500/5 dark:border-white/10 dark:bg-white/5"
                    >
                        <Folder className="h-8 w-8 text-yellow-500" />
                        <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{c.label}</div>
                            <div className="truncate text-xs opacity-60">{c.sub}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function IconGrid({ children }) {
    return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">{children}</div>;
}

function FileTile({ label, onOpen, thumb, icon: Icon }) {
    return (
        <button
            onDoubleClick={onOpen}
            onClick={onOpen}
            title={label}
            className="group flex flex-col items-center gap-1.5 rounded-lg p-2 text-center hover:bg-blue-500/10"
        >
            <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded bg-black/5 dark:bg-white/5">
                {thumb ? (
                    <img src={thumb} alt={label} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                    <Icon className="h-9 w-9 text-blue-500" />
                )}
            </div>
            <span className="line-clamp-2 w-full break-words text-xs opacity-80">{label}</span>
        </button>
    );
}

function Empty({ label }) {
    return <div className="col-span-full py-10 text-center text-sm opacity-50">{label}</div>;
}

function PreviewOverlay({ preview, onClose, fileName }) {
    return (
        <div className="absolute inset-0 z-10 flex flex-col bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-between bg-black/40 px-4 py-2 text-white">
                <span className="truncate text-xs">
                    {preview.type === 'image' ? preview.item.description || 'Photo' : fileName}
                </span>
                <button onClick={onClose} className="rounded p-1 hover:bg-white/20" aria-label="Close preview">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
                {preview.type === 'image' ? (
                    <div className="flex h-full items-center justify-center p-4">
                        <img src={preview.item.src} alt={preview.item.description || ''} className="max-h-full max-w-full object-contain" />
                    </div>
                ) : (
                    <div className="mx-auto max-w-3xl bg-white p-6 text-neutral-900 dark:bg-[#1b1b1b] dark:text-neutral-100">
                        <article className="prose prose-sm max-w-none dark:prose-invert">
                            <h1>{preview.item.title}</h1>
                            {preview.item.date && <p className="text-xs opacity-60">{preview.item.date}</p>}
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {preview.item.content || preview.item.excerpt || '*No content available in preview.*'}
                            </ReactMarkdown>
                        </article>
                    </div>
                )}
            </div>
        </div>
    );
}
