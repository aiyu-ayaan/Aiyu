"use client";
import React, { useMemo, useState } from 'react';
import { Search, Power, ChevronRight, ChevronLeft, ExternalLink, X, RotateCcw, LogOut, AlertTriangle, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ExplorerIcon,
    VSCodeIcon,
    ChromeIcon,
    SettingsIcon,
    ThisPCIcon,
    EdgeIcon,
    PhotosIcon,
    GitHubIcon,
    MailIcon,
    NotepadIcon,
    CalculatorIcon,
    TerminalIcon,
    GetStartedIcon,
    TaskManagerIcon,
    CoffeeIcon,
    UnescapeIcon,
    WhiteboardIcon,
    LinkedInIcon,
    InstagramIcon,
} from './icons';

// Windows 11 Start menu pinned apps list including footer socials (Store/Discord/Twitter/Spotify removed per request).
const PINNED_APPS = [
    { key: 'browser', title: 'Google Chrome', icon: ChromeIcon },
    { key: 'getstarted', title: 'Get Started', icon: GetStartedIcon },
    { key: 'taskmanager', title: 'Task Manager', icon: TaskManagerIcon },
    { key: 'contact', title: 'Mail', icon: MailIcon, external: '/contact-us' },
    { key: 'github', title: 'GitHub', icon: GitHubIcon, external: 'https://github.com/aiyu-ayaan' },
    { key: 'linkedin', title: 'LinkedIn', icon: LinkedInIcon, external: 'https://www.linkedin.com/in/aiyu/' },
    { key: 'instagram', title: 'Instagram', icon: InstagramIcon, external: 'https://www.instagram.com/aiyu.dev_/' },
    { key: 'coffee', title: 'Buy me a coffee', icon: CoffeeIcon, external: 'https://buymeacoffee.com/aiyuayaan' },
    { key: 'settings', title: 'Settings', icon: SettingsIcon },
    { key: 'games', title: 'Unescape', icon: UnescapeIcon, external: '/games' },
    { key: 'notepad', title: 'Notepad', icon: NotepadIcon },
    { key: 'whiteboard', title: 'Whiteboard', icon: WhiteboardIcon },
    { key: 'calculator', title: 'Calculator', icon: CalculatorIcon },
    { key: 'explorer', title: 'File Explorer', icon: ExplorerIcon },
    { key: 'terminal', title: 'Terminal', icon: TerminalIcon },
    { key: 'photos', title: 'Photos', icon: PhotosIcon },
    { key: 'vscode', title: 'VS Code', icon: VSCodeIcon },
    { key: 'markdown', title: 'Markdown Viewer', icon: BookOpen },
];

const RECOMMENDED_ITEMS = [
    { title: 'LinkedIn', sub: 'Professional Network', icon: LinkedInIcon, key: 'linkedin', external: 'https://www.linkedin.com/in/aiyu/' },
    { title: 'Instagram', sub: 'Social & Media', icon: InstagramIcon, key: 'instagram', external: 'https://www.instagram.com/aiyu.dev_/' },
    { title: 'GitHub', sub: 'Repositories & Code', icon: GitHubIcon, key: 'github', external: 'https://github.com/aiyu-ayaan' },
    { title: 'Mail', sub: 'Contact & Messages', icon: MailIcon, key: 'contact', external: '/contact-us' },
    { title: 'Terminal', sub: 'CLI & Shell', icon: TerminalIcon, key: 'terminal' },
    { title: 'File Explorer', sub: 'Pictures & Documents', icon: ExplorerIcon, key: 'explorer' },
];

export default function StartMenu({ apps = [], onOpen, onClose, config = {}, onRestart, onShutdown }) {
    const [q, setQ] = useState('');
    const [showAllApps, setShowAllApps] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [showPowerMenu, setShowPowerMenu] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    const siteTitle = config?.siteTitle || config?.authorName || 'Aiyu';
    const faviconUrl = config?.hasCustomFavicon ? '/api/favicon' : '/favicon.ico';

    // Build unified app list for search
    const allSearchableItems = useMemo(() => {
        const map = new Map();
        [...PINNED_APPS, ...RECOMMENDED_ITEMS].forEach((item) => {
            if (!map.has(item.title)) {
                map.set(item.title, item);
            }
        });
        apps.forEach((app) => {
            if (!map.has(app.title)) {
                map.set(app.title, { key: app.key, title: app.title, icon: app.icon });
            }
        });
        return Array.from(map.values());
    }, [apps]);

    const query = q.trim().toLowerCase();
    const searchResults = useMemo(() => {
        if (!query) return [];
        return allSearchableItems.filter(
            (item) =>
                item.title.toLowerCase().includes(query) ||
                (item.sub && item.sub.toLowerCase().includes(query)) ||
                (item.key && item.key.toLowerCase().includes(query))
        );
    }, [allSearchableItems, query]);

    const handleAppClick = (item) => {
        if (item.key === 'contact' || item.title === 'Mail') {
            window.open('/contact-us', '_blank', 'noopener,noreferrer');
            onClose();
        } else if (item.external) {
            onOpen('browser', { url: item.external, title: item.title });
            onClose();
        } else if (item.action) {
            onOpen(item.action);
            onClose();
        } else {
            onOpen(item.key);
            onClose();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && searchResults.length > 0) {
            handleAppClick(searchResults[0]);
        }
    };

    return (
        <>
            {/* Backdrop layer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[80]"
                onClick={onClose}
            />

            {/* Win11 Start Menu Modal */}
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="fixed bottom-16 left-1/2 z-[90] flex h-[620px] w-[min(94vw,560px)] -translate-x-1/2 flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-[#1c1c1f]/90 p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-3xl text-white select-none"
                role="menu"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                {/* Top Search bar */}
                <div className="relative mb-5 shrink-0">
                    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 shadow-inner transition-colors focus-within:border-blue-500/50 focus-within:bg-black/40">
                        <Search className="h-4 w-4 text-white/50 shrink-0" />
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type here to search apps, files, settings..."
                            className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/40"
                        />
                        {q && (
                            <button
                                onClick={() => setQ('')}
                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20 text-white/70 hover:bg-white/30 hover:text-white"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {query ? (
                        /* Search Results View */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1 border-b border-white/10 pb-2">
                                <span className="text-xs font-semibold text-white/90">
                                    Search Results ({searchResults.length})
                                </span>
                                {searchResults.length > 0 && (
                                    <span className="text-[10px] text-white/40 font-mono">
                                        Press Enter to open top result
                                    </span>
                                )}
                            </div>

                            {searchResults.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2.5">
                                    {searchResults.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAppClick(item)}
                                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                                                idx === 0
                                                    ? 'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20'
                                                    : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                            }`}
                                        >
                                            <item.icon className="h-7 w-7 shrink-0 drop-shadow" />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-xs font-medium text-white/90">
                                                    {item.title}
                                                </div>
                                                <div className="truncate text-[10px] text-white/50">
                                                    {item.sub || (item.external ? 'External Link' : 'App')}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-xs text-white/40">
                                    No apps or settings matching &quot;{q}&quot;
                                </div>
                            )}
                        </div>
                    ) : showAllApps ? (
                        /* All Apps List View */
                        <div>
                            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-2 sticky top-0 bg-[#1e1e24] z-10 py-1">
                                <button
                                    onClick={() => setShowAllApps(false)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:underline"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Back
                                </button>
                                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                                    All Apps ({allSearchableItems.length})
                                </span>
                            </div>
                            <div data-lenis-prevent className="space-y-1 pr-1">
                                {allSearchableItems.map((a, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAppClick(a)}
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/10 transition"
                                    >
                                        <a.icon className="h-6 w-6 shrink-0 text-blue-400" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-medium text-white/90 truncate">{a.title}</div>
                                            {a.sub && <div className="text-[10px] text-white/40 truncate">{a.sub}</div>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Standard Pinned + Recommended View */
                        <div className="space-y-6">
                            {/* Pinned Section */}
                            <div>
                                <div className="mb-3 flex items-center justify-between px-1">
                                    <span className="text-xs font-semibold text-white/90">Pinned</span>
                                    <button
                                        onClick={() => setShowAllApps(true)}
                                        className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/15"
                                    >
                                        All apps <ChevronRight className="h-3 w-3 opacity-60" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-6 gap-y-4 gap-x-1">
                                    {PINNED_APPS.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAppClick(item)}
                                            className="group flex flex-col items-center gap-1.5 rounded-lg p-2 text-center hover:bg-white/10 transition"
                                        >
                                            <item.icon className="h-7 w-7 drop-shadow transition-transform group-hover:scale-105" />
                                            <span className="line-clamp-1 w-full text-[11px] leading-tight text-white/80 drop-shadow">
                                                {item.title}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recommended Section */}
                            <div>
                                <div className="mb-3 px-1">
                                    <span className="text-xs font-semibold text-white/90">Recommended</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {RECOMMENDED_ITEMS.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAppClick(item)}
                                            className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-2.5 text-left transition hover:border-white/20 hover:bg-white/10"
                                        >
                                            <item.icon className="h-6 w-6 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-xs font-medium text-white/90">{item.title}</div>
                                                <div className="truncate text-[10px] text-white/50">{item.sub}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Bar */}
                <div className="mt-4 flex shrink-0 items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition hover:bg-white/10" title={siteTitle}>
                        <div className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full font-bold text-white shadow shrink-0 ${
                            !imgError ? 'bg-transparent' : 'bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20'
                        }`}>
                            {!imgError ? (
                                <img
                                    src={faviconUrl}
                                    alt="Favicon"
                                    className="h-full w-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                siteTitle.charAt(0).toUpperCase()
                            )}
                        </div>
                        <span className="text-xs font-semibold text-white/90 truncate max-w-[130px]">{siteTitle}</span>
                    </div>

                    <div className="relative flex items-center gap-2">
                        <button
                            onClick={() => {
                                onOpen('browser', { url: '/', title: 'Site Home' });
                                onClose();
                            }}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
                            title="Open Site in Chrome"
                        >
                            Site <ExternalLink className="h-3.5 w-3.5" />
                        </button>

                        <button
                            onClick={() => setShowPowerMenu((v) => !v)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                showPowerMenu
                                    ? 'bg-red-500/30 text-red-400 border border-red-500/40'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                            title="Power Options"
                            aria-label="Power Options"
                        >
                            <Power className="h-4 w-4" />
                        </button>

                        {/* Windows 11 Power Options Flyout */}
                        {showPowerMenu && (
                            <div className="absolute right-0 bottom-10 z-[120] w-48 rounded-xl border border-white/15 bg-[#25252a]/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <button
                                    onClick={() => {
                                        setShowPowerMenu(false);
                                        setConfirmAction('restart');
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    <RotateCcw className="h-4 w-4 text-blue-400" />
                                    <div className="text-left">
                                        <div className="font-semibold">Restart</div>
                                        <div className="text-[10px] text-white/50">Refresh OS & clear cache</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowPowerMenu(false);
                                        setConfirmAction('shutdown');
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-white/90 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                >
                                    <Power className="h-4 w-4 text-red-400" />
                                    <div className="text-left">
                                        <div className="font-semibold">Shut down</div>
                                        <div className="text-[10px] text-white/50">Close OS & browser tab</div>
                                    </div>
                                </button>

                                <div className="my-1 h-px bg-white/10" />

                                <Link
                                    href="/"
                                    onClick={onClose}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    <LogOut className="h-4 w-4 text-amber-400" />
                                    <div className="text-left">
                                        <div className="font-semibold">Sign out</div>
                                        <div className="text-[10px] text-white/50">Return to site home</div>
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Confirmation Warning Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#232328] p-6 shadow-2xl text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="h-6 w-6" />
                        </div>

                        <h3 className="text-base font-bold text-white mb-2">
                            {confirmAction === 'restart' ? 'Restart Aiyu OS?' : 'Shut down Aiyu OS?'}
                        </h3>

                        <p className="text-xs text-white/70 leading-relaxed mb-6">
                            {confirmAction === 'restart'
                                ? 'Are you sure you want to restart? Unsaved window states will be reset, session caches will be cleaned, and the OS will reboot.'
                                : 'Are you sure you want to shut down? Desktop processes will be stopped and your browser tab will close in 5 seconds.'}
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    const action = confirmAction;
                                    setConfirmAction(null);
                                    onClose();
                                    if (action === 'restart') {
                                        onRestart?.();
                                    } else if (action === 'shutdown') {
                                        onShutdown?.();
                                    }
                                }}
                                className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition-colors shadow ${
                                    confirmAction === 'restart'
                                        ? 'bg-blue-600 hover:bg-blue-500'
                                        : 'bg-red-600 hover:bg-red-500'
                                }`}
                            >
                                {confirmAction === 'restart' ? 'Restart' : 'Shut down'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

