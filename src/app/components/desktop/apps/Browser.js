"use client";
import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Star, X, Plus, Home } from 'lucide-react';

const QUICK_LINKS = [
    { label: 'Home', path: '/' },
    { label: 'Blogs', path: '/blogs' },
    { label: 'Projects', path: '/projects' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'About', path: '/about' },
    { label: 'Resume', path: '/resume' },
];

// Normalize what the user typed in the address bar into a real URL.
function toUrl(input) {
    const raw = (input || '').trim();
    if (!raw) return '';
    if (raw.startsWith('/')) return raw; // same-origin path
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[\w-]+(\.[\w-]+)+/.test(raw)) return `https://${raw}`; // looks like a domain
    return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
}

export default function Browser() {
    const [tabs, setTabs] = useState([{ id: 1, title: 'New tab', url: '' }]);
    const [activeId, setActiveId] = useState(1);
    const [address, setAddress] = useState('');
    const frameRef = useRef(null);
    const nextId = useRef(2);

    const active = tabs.find((t) => t.id === activeId) || tabs[0];

    const navigate = (url, title) => {
        setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, url, title: title || url || 'New tab' } : t)));
        setAddress(url && !url.startsWith('/') ? url : url || '');
    };

    const go = (e) => {
        e.preventDefault();
        const url = toUrl(address);
        if (url) navigate(url, address);
    };

    const addTab = () => {
        const id = nextId.current++;
        setTabs((prev) => [...prev, { id, title: 'New tab', url: '' }]);
        setActiveId(id);
        setAddress('');
    };

    const closeTab = (id, e) => {
        e.stopPropagation();
        setTabs((prev) => {
            const next = prev.filter((t) => t.id !== id);
            if (next.length === 0) {
                const fresh = { id: nextId.current++, title: 'New tab', url: '' };
                setActiveId(fresh.id);
                setAddress('');
                return [fresh];
            }
            if (id === activeId) {
                setActiveId(next[next.length - 1].id);
                setAddress('');
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
                            setAddress(t.url && !t.url.startsWith('/') ? t.url : '');
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

            {/* Viewport */}
            <div className="min-h-0 flex-1 bg-white dark:bg-[#202124]">
                {active?.url ? (
                    <iframe
                        ref={frameRef}
                        src={active.url}
                        title={active.title}
                        className="h-full w-full border-0"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    />
                ) : (
                    <NewTab onOpen={(l) => navigate(l.path, l.label)} />
                )}
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
