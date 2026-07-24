"use client";
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Star, X, Plus, Home, ExternalLink, ShieldCheck, Copy, Globe, AlertCircle, Check, ShieldAlert, AppWindow } from 'lucide-react';

const QUICK_LINKS = [
    { label: 'Home', path: '/' },
    { label: 'Blogs', path: '/blogs' },
    { label: 'Projects', path: '/projects' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'About', path: '/about' },
    { label: 'Resume', path: '/resume' },
];

function isExternalUrl(url) {
    if (!url) return false;
    if (url.startsWith('/')) return false;
    try {
        const parsed = new URL(url);
        if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

function getSpecialRouteType(url) {
    if (!url) return null;
    let path = url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
            path = new URL(url).pathname;
        } catch {
            path = url;
        }
    }
    const cleanPath = path.toLowerCase().split('?')[0].split('#')[0];

    if (cleanPath === '/desktop' || cleanPath.startsWith('/desktop/')) {
        return 'desktop';
    }
    if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
        return 'admin';
    }
    return null;
}

// Normalize what the user typed in the address bar into a real URL.
function toUrl(input) {
    const raw = (input || '').trim();
    if (!raw) return '';
    if (raw.startsWith('/')) return raw; // same-origin path
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[\w-]+(\.[\w-]+)+/.test(raw)) return `https://${raw}`; // looks like a domain
    return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
}

export default function Browser({ payload, closeWin }) {
    const [tabs, setTabs] = useState(() => {
        if (payload?.url) {
            return [{ id: 1, title: payload.title || payload.url, url: payload.url, forceEmbed: false }];
        }
        return [{ id: 1, title: 'New tab', url: '', forceEmbed: false }];
    });
    const [activeId, setActiveId] = useState(1);
    const [address, setAddress] = useState(() => payload?.url || '');
    const frameRef = useRef(null);
    const nextId = useRef(2);

    useEffect(() => {
        if (!payload?.url) return;
        const targetUrl = payload.url;
        const targetTitle = payload.title || payload.url;

        setTabs((prev) => {
            const existing = prev.find((t) => t.url === targetUrl);
            if (existing) {
                setActiveId(existing.id);
                setAddress(existing.url);
                return prev;
            }
            const newId = nextId.current++;
            const newTab = { id: newId, title: targetTitle, url: targetUrl, forceEmbed: false };
            setActiveId(newId);
            setAddress(targetUrl);
            return [...prev, newTab];
        });
    }, [payload]);

    const active = tabs.find((t) => t.id === activeId) || tabs[0];

    const navigate = (url, title) => {
        setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, url, title: title || url || 'New tab', forceEmbed: false } : t)));
        setAddress(url || '');
    };

    const toggleForceEmbedForId = (id) => {
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, forceEmbed: !t.forceEmbed } : t)));
    };

    const go = (e) => {
        e.preventDefault();
        const url = toUrl(address);
        if (url) navigate(url, address);
    };

    const addTab = () => {
        const id = nextId.current++;
        setTabs((prev) => [...prev, { id, title: 'New tab', url: '', forceEmbed: false }]);
        setActiveId(id);
        setAddress('');
    };

    const closeTab = (id, e) => {
        e.stopPropagation();
        setTabs((prev) => {
            const next = prev.filter((t) => t.id !== id);
            if (next.length === 0) {
                if (closeWin) closeWin();
                const fresh = { id: nextId.current++, title: 'New tab', url: '', forceEmbed: false };
                setActiveId(fresh.id);
                setAddress('');
                return [fresh];
            }
            if (id === activeId) {
                const targetTab = next[next.length - 1];
                setActiveId(targetTab.id);
                setAddress(targetTab.url || '');
            }
            return next;
        });
    };

    const displayAddress = useMemo(() => {
        if (address) return address;
        if (active?.url) return active.url;
        return '';
    }, [address, active]);

    return (
        <div className="flex h-full w-full flex-col bg-[#dee1e6] dark:bg-[#202124]">
            {/* Tab strip */}
            <div className="flex items-end gap-1 px-2 pt-1.5">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setActiveId(t.id);
                            setAddress(t.url || '');
                        }}
                        className={`group flex h-8 max-w-[180px] items-center gap-2 rounded-t-lg px-3 text-xs ${
                            t.id === activeId
                                ? 'bg-white text-neutral-900 dark:bg-[#35363a] dark:text-white'
                                : 'bg-black/5 text-neutral-600 hover:bg-black/10 dark:bg-white/5 dark:text-neutral-300'
                        }`}
                    >
                        <span className="truncate">{t.title}</span>
                        <span onClick={(e) => closeTab(t.id, e)} className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/20">
                            <X className="h-3 w-3" />
                        </span>
                    </button>
                ))}
                <button onClick={addTab} className="mb-1 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10" aria-label="New tab">
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 dark:bg-[#35363a]">
                <button onClick={() => frameRef.current?.contentWindow?.history.back()} className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Back">
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <button onClick={() => frameRef.current?.contentWindow?.history.forward()} className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Forward">
                    <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => navigate('', 'New tab')} className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Refresh">
                    <RotateCw className="h-4 w-4" />
                </button>
                <button onClick={() => navigate('/', 'Home')} className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Home">
                    <Home className="h-4 w-4" />
                </button>
                <form onSubmit={go} className="flex flex-1 items-center gap-2 rounded-full bg-black/5 px-3 py-1.5 dark:bg-black/40">
                    <Lock className="h-3.5 w-3.5 opacity-50" />
                    <input
                        value={displayAddress}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Search Google or type a URL"
                        className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
                    />
                    <Star className="h-3.5 w-3.5 opacity-40" />
                </form>
            </div>

            {/* Viewport with Keep-Alive Tab Persistence */}
            <div className="relative min-h-0 flex-1 bg-white dark:bg-[#202124]">
                {tabs.map((t) => {
                    const isSelected = t.id === activeId;
                    const isExt = isExternalUrl(t.url);
                    const specType = getSpecialRouteType(t.url);

                    return (
                        <div
                            key={t.id}
                            className={`absolute inset-0 h-full w-full ${isSelected ? 'block z-10' : 'hidden z-0'}`}
                        >
                            {t.url ? (
                                specType === 'desktop' ? (
                                    <DesktopRecursionPreview onGoHome={() => navigate('/', 'Home')} />
                                ) : specType === 'admin' ? (
                                    <AdminRoutePreview url={t.url} title={t.title} />
                                ) : isExt && !t.forceEmbed ? (
                                    <ExternalTabPreview url={t.url} title={t.title} onForceEmbed={() => toggleForceEmbedForId(t.id)} />
                                ) : (
                                    <iframe
                                        ref={isSelected ? frameRef : null}
                                        src={t.url}
                                        title={t.title}
                                        className="h-full w-full border-0"
                                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                                    />
                                )
                            ) : (
                                <NewTab onOpen={(l) => navigate(l.path, l.label)} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ExternalTabPreview({ url, title, onForceEmbed }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        try {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore clipboard errors
        }
    };

    let domain = url;
    try {
        domain = new URL(url).hostname;
    } catch {
        // fallback
    }

    return (
        <div className="flex h-full flex-col items-center justify-center p-6 text-neutral-800 dark:text-neutral-100 bg-[#f8f9fa] dark:bg-[#1e1e22]">
            <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#28282d] p-6 shadow-xl text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
                    <Globe className="h-7 w-7" />
                </div>

                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-500 mb-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>External Web Protection</span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">{title || domain}</h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate px-2">{url}</p>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-600 dark:text-amber-300 leading-relaxed text-left flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        Security headers (<code>X-Frame-Options</code>) set by <strong>{domain}</strong> prevent embedding inside an iframe window. Click below to launch securely.
                    </span>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    <button
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow"
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span>Open {domain} in New Window</span>
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 py-2 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10 transition"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>

                        <button
                            onClick={onForceEmbed}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 py-2 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10 transition text-neutral-500 dark:text-neutral-400"
                        >
                            <span>Try Embed Anyway</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NewTab({ onOpen }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-8 p-6 text-neutral-800 dark:text-neutral-100">
            <div className="text-center">
                <div className="mb-2 text-4xl font-semibold tracking-tight">Aiyu</div>
                <p className="text-sm opacity-60">Your portfolio, in a browser</p>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                {QUICK_LINKS.map((l) => (
                    <button
                        key={l.path}
                        onClick={() => onOpen(l)}
                        className="flex w-16 flex-col items-center gap-2"
                    >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-lg font-semibold dark:bg-white/10">
                            {l.label[0]}
                        </span>
                        <span className="text-xs opacity-70">{l.label}</span>
                    </button>
                ))}
            </div>
            <p className="max-w-sm text-center text-[11px] opacity-40">
                Tip: external sites may refuse to load in a frame. Internal portfolio pages open instantly.
            </p>
        </div>
    );
}

function DesktopRecursionPreview({ onGoHome }) {
    return (
        <div className="flex h-full flex-col items-center justify-center p-6 text-neutral-800 dark:text-neutral-100 bg-[#f8f9fa] dark:bg-[#1e1e22]">
            <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#28282d] p-6 shadow-xl text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm">
                    <AppWindow className="h-7 w-7" />
                </div>

                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-500 mb-2">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>System Protected Route</span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">Desktop Environment</h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">The Web Desktop environment cannot be nested inside itself.</p>
                </div>

                <div className="pt-2">
                    <button
                        onClick={onGoHome}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow"
                    >
                        <Home className="h-4 w-4" />
                        <span>Return to Site Home (/)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function AdminRoutePreview({ url, title }) {
    return (
        <div className="flex h-full flex-col items-center justify-center p-6 text-neutral-800 dark:text-neutral-100 bg-[#f8f9fa] dark:bg-[#1e1e22]">
            <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#28282d] p-6 shadow-xl text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
                    <Lock className="h-7 w-7" />
                </div>

                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-500 mb-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Protected Admin Route</span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">{title || 'Admin Control Panel'}</h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate px-2">{url}</p>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-600 dark:text-amber-300 leading-relaxed text-left flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        For security and session protection, administrative routes require opening in a dedicated browser tab.
                    </span>
                </div>

                <div className="pt-2">
                    <button
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-500 transition shadow"
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span>Open Admin Dashboard in New Tab</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
