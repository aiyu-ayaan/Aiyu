"use client";
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FOLDERS_DATA } from '@/app/data/folderMdData';
import {
    ChevronRight,
    Folder,
    FileText,
    Image as ImageIcon,
    Home,
    ArrowLeft,
    Search,
    Loader2,
    X,
    Globe,
    Bot,
    User,
    FileCheck,
    FolderGit2,
    Layers,
    Sparkles,
} from 'lucide-react';

const ReactMarkdown = dynamic(() => import('react-markdown'), {
    ssr: false,
    loading: () => <div className="p-4 text-xs opacity-60 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading reader...</div>,
});

const NAV = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'about', label: 'about', icon: User },
    { key: 'ai', label: 'ai', icon: Bot },
    { key: 'resume', label: 'resume', icon: FileCheck },
    { key: 'projects', label: 'projects', icon: FolderGit2 },
    { key: 'apps', label: 'apps', icon: Layers },
    { key: 'blogs', label: 'blogs', icon: FileText },
    { key: 'hello', label: 'hello', icon: Sparkles },
    { key: 'pictures', label: 'pictures', icon: ImageIcon },
];

const blogFileName = (blog) =>
    blog.fileName || `${(blog.slug || blog.title || 'untitled').toString().slice(0, 40).replace(/\s+/g, '-').toLowerCase()}.md`;

import { useDeviceMode } from '@/app/context/DeviceModeContext';

export default function FileExplorer({ openApp }) {
    const { isMobile } = useDeviceMode();
    const [folder, setFolder] = useState('home');
    const [gallery, setGallery] = useState([]);
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [preview, setPreview] = useState(null);

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

    const currentFolderMeta = useMemo(() => {
        return FOLDERS_DATA.find((f) => f.folderKey === folder);
    }, [folder]);

    const pathLabel = useMemo(() => {
        if (folder === 'home') return 'Home';
        if (folder === 'pictures') return 'Home > pictures';
        if (folder === 'blogs') return 'Home > blogs';
        return `Home > ${folder}`;
    }, [folder]);

    const filteredGallery = gallery.filter((g) =>
        !query || (g.description || '').toLowerCase().includes(query.toLowerCase())
    );
    const filteredBlogs = blogs.filter((b) =>
        !query || (b.title || '').toLowerCase().includes(query.toLowerCase())
    );
    const filteredFolderFiles = useMemo(() => {
        if (!currentFolderMeta) return [];
        return currentFolderMeta.files.filter(
            (f) => !query || (f.title || '').toLowerCase().includes(query.toLowerCase()) || (f.fileName || '').toLowerCase().includes(query.toLowerCase())
        );
    }, [currentFolderMeta, query]);

    return (
        <div className="flex h-full w-full text-sm text-neutral-800 dark:text-neutral-200">
            {/* Sidebar */}
            {!isMobile && (
                <aside className="w-48 shrink-0 overflow-y-auto border-r border-black/10 bg-[#f8f8f8] p-2 dark:border-white/10 dark:bg-[#252525]">
                    <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Folders</div>
                    {NAV.map((n) => (
                        <button
                            key={n.key}
                            onClick={() => {
                                setFolder(n.key);
                                setPreview(null);
                            }}
                            className={`mb-0.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition ${
                                folder === n.key ? 'bg-blue-500/15 font-semibold text-blue-600 dark:text-blue-300' : 'hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <n.icon className="h-4 w-4" />
                            <span className="truncate">{n.label}</span>
                        </button>
                    ))}
                </aside>
            )}

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
                <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex h-full items-center justify-center opacity-60">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : folder === 'home' ? (
                        <HomeView
                            onOpen={setFolder}
                            galleryCount={gallery.length}
                            blogCount={blogs.length}
                            isMobile={isMobile}
                        />
                    ) : folder === 'pictures' ? (
                        <IconGrid isMobile={isMobile}>
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
                                    isMobile={isMobile}
                                />
                            ))}
                            {filteredGallery.length === 0 && <Empty label="No pictures" />}
                        </IconGrid>
                    ) : folder === 'blogs' ? (
                        <IconGrid isMobile={isMobile}>
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
                                    isMobile={isMobile}
                                />
                            ))}
                            {filteredBlogs.length === 0 && <Empty label="No blogs" />}
                        </IconGrid>
                    ) : currentFolderMeta ? (
                        <IconGrid isMobile={isMobile}>
                            {filteredFolderFiles.map((f) => (
                                <FileTile
                                    key={f._id || f.slug}
                                    label={blogFileName(f)}
                                    onOpen={() => {
                                        if (openApp) {
                                            openApp('markdown', { slug: f.slug, blog: f });
                                        } else {
                                            setPreview({ type: 'blog', item: f });
                                        }
                                    }}
                                    icon={FileText}
                                    isMobile={isMobile}
                                />
                            ))}
                            {filteredFolderFiles.length === 0 && <Empty label={`No files in ${folder}`} />}
                        </IconGrid>
                    ) : (
                        <Empty label="Folder not found" />
                    )}
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between border-t border-black/10 bg-white px-3 py-1 text-[11px] opacity-70 dark:border-white/10 dark:bg-[#1e1e1e]">
                    <span>
                        {folder === 'pictures'
                            ? `${filteredGallery.length} items`
                            : folder === 'blogs'
                            ? `${filteredBlogs.length} items`
                            : currentFolderMeta
                            ? `${filteredFolderFiles.length} item(s)`
                            : `${FOLDERS_DATA.length + 2} folders`}
                    </span>
                    <span>Aiyu OS File Explorer</span>
                </div>
            </div>

            {preview && <PreviewOverlay preview={preview} onClose={() => setPreview(null)} fileName={preview.type === 'blog' ? blogFileName(preview.item) : undefined} />}
        </div>
    );
}

function HomeView({ onOpen, galleryCount, blogCount, isMobile }) {
    return (
        <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide opacity-60">System Folders</h3>
            <div className={isMobile ? "flex flex-col gap-1" : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"}>
                {FOLDERS_DATA.map((f) => (
                    <button
                        key={f.folderKey}
                        onClick={() => onOpen(f.folderKey)}
                        className={`flex items-center ${isMobile ? 'gap-3 px-4 py-3 hover:bg-black/5 active:bg-black/10 rounded dark:hover:bg-white/5' : 'gap-3 rounded-lg border border-black/10 bg-white p-3 text-left hover:border-blue-400 hover:bg-blue-500/5 dark:border-white/10 dark:bg-white/5 transition'}`}
                    >
                        <Folder className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-amber-500 shrink-0`} />
                        <div className="min-w-0 flex-1 text-left">
                            <div className={`truncate ${isMobile ? 'text-base' : 'text-sm'} font-semibold`}>{f.folderName}</div>
                            {!isMobile && <div className="truncate text-xs opacity-60">{f.description}</div>}
                        </div>
                        {isMobile && <ChevronRight className="h-4 w-4 opacity-30" />}
                    </button>
                ))}
                <button
                    onClick={() => onOpen('blogs')}
                    className={`flex items-center ${isMobile ? 'gap-3 px-4 py-3 hover:bg-black/5 active:bg-black/10 rounded dark:hover:bg-white/5' : 'gap-3 rounded-lg border border-black/10 bg-white p-3 text-left hover:border-blue-400 hover:bg-blue-500/5 dark:border-white/10 dark:bg-white/5 transition'}`}
                >
                    <Folder className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-blue-500 shrink-0`} />
                    <div className="min-w-0 flex-1 text-left">
                        <div className={`truncate ${isMobile ? 'text-base' : 'text-sm'} font-semibold`}>blogs</div>
                        {!isMobile && <div className="truncate text-xs opacity-60">{blogCount} blog posts</div>}
                    </div>
                    {isMobile && <ChevronRight className="h-4 w-4 opacity-30" />}
                </button>
                <button
                    onClick={() => onOpen('pictures')}
                    className={`flex items-center ${isMobile ? 'gap-3 px-4 py-3 hover:bg-black/5 active:bg-black/10 rounded dark:hover:bg-white/5' : 'gap-3 rounded-lg border border-black/10 bg-white p-3 text-left hover:border-blue-400 hover:bg-blue-500/5 dark:border-white/10 dark:bg-white/5 transition'}`}
                >
                    <Folder className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-cyan-500 shrink-0`} />
                    <div className="min-w-0 flex-1 text-left">
                        <div className={`truncate ${isMobile ? 'text-base' : 'text-sm'} font-semibold`}>pictures</div>
                        {!isMobile && <div className="truncate text-xs opacity-60">{galleryCount} items</div>}
                    </div>
                    {isMobile && <ChevronRight className="h-4 w-4 opacity-30" />}
                </button>
            </div>
        </div>
    );
}

function IconGrid({ children, isMobile }) {
    if (isMobile) {
        return <div className="flex flex-col gap-1">{children}</div>;
    }
    return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">{children}</div>;
}

function FileTile({ label, onOpen, thumb, icon: Icon, isMobile }) {
    if (isMobile) {
        return (
            <button
                onClick={onOpen}
                title={label}
                className="group flex items-center gap-3 rounded px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10"
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-black/5 dark:bg-white/5">
                    {thumb ? (
                        <img src={thumb} alt={label} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                        <Icon className="h-5 w-5 text-blue-500" />
                    )}
                </div>
                <span className="truncate flex-1 text-sm">{label}</span>
                <ChevronRight className="h-4 w-4 opacity-30" />
            </button>
        );
    }
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
    const isPdfFile = preview.item?.isPdf || preview.item?.fileName?.endsWith('.pdf');

    const handleOpenWeb = () => {
        if (!preview.item) return;
        const targetUrl = preview.item.pdfUrl || preview.item.route || `/blogs/${preview.item.slug}`;
        if (preview.item.external || isPdfFile) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } else {
            window.open(targetUrl, '_blank');
        }
    };

    return (
        <div className="absolute inset-0 z-10 flex flex-col bg-black/60 backdrop-blur-sm">
            <div className="flex items-center justify-between bg-black/40 px-4 py-2 text-white">
                <span className="truncate text-xs font-medium">
                    {preview.type === 'image' ? preview.item.description || 'Photo' : fileName}
                </span>
                <div className="flex items-center gap-2">
                    {(preview.item?.route || preview.item?.slug || preview.item?.pdfUrl) && (
                        <button
                            onClick={handleOpenWeb}
                            className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500 transition"
                        >
                            <Globe className="h-3 w-3" />
                            <span>{isPdfFile ? 'Open PDF' : 'Open Page'}</span>
                        </button>
                    )}
                    <button onClick={onClose} className="rounded p-1 hover:bg-white/20" aria-label="Close preview">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#1b1b1b]">
                {preview.type === 'image' ? (
                    <div className="flex h-full items-center justify-center p-4">
                        <img src={preview.item.src} alt={preview.item.description || ''} className="max-h-full max-w-full object-contain" />
                    </div>
                ) : isPdfFile ? (
                    <div className="h-full w-full flex flex-col">
                        <iframe
                            src={preview.item.pdfUrl || preview.item.route || '/api/resume'}
                            title={preview.item.title || 'PDF Document'}
                            className="h-full w-full border-none min-h-[520px] bg-neutral-900"
                        />
                    </div>
                ) : (
                    <div className="mx-auto max-w-3xl bg-white p-6 text-neutral-900 dark:bg-[#1b1b1b] dark:text-neutral-100">
                        <article className="prose prose-sm max-w-none dark:prose-invert">
                            <h1>{preview.item.title}</h1>
                            {preview.item.date && <p className="text-xs opacity-60">{preview.item.date}</p>}
                            <ReactMarkdown>
                                {preview.item.content || preview.item.excerpt || '*No content available in preview.*'}
                            </ReactMarkdown>
                        </article>
                    </div>
                )}
            </div>
        </div>
    );
}
