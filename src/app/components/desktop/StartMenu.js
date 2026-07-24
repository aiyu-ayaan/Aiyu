"use client";
import React, { useState } from 'react';
import { Search, Power, User, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// Windows 11 style centered Start menu: search, pinned apps grid, footer.
export default function StartMenu({ apps, onOpen, onClose }) {
    const [q, setQ] = useState('');
    const pinned = apps.filter((a) => a.key !== 'start');
    const filtered = pinned.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));

    return (
        <>
            {/* Click-away layer */}
            <div className="absolute inset-0 z-40" onClick={onClose} />

            <div
                className="absolute bottom-14 left-1/2 z-50 w-[min(92vw,640px)] -translate-x-1/2 rounded-xl border border-white/15 bg-[#eeeef2]/95 p-5 shadow-2xl backdrop-blur-2xl dark:bg-[#26262b]/95"
                role="menu"
            >
                {/* Search */}
                <div className="mb-5 flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 dark:border-white/10 dark:bg-[#1b1b1b]">
                    <Search className="h-4 w-4 opacity-50" />
                    <input
                        autoFocus
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search for apps"
                        className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
                    />
                </div>

                <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold opacity-70">
                    <span>Pinned</span>
                </div>

                {/* Pinned grid */}
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {filtered.map((a) => (
                        <button
                            key={a.key}
                            onClick={() => {
                                onOpen(a.key);
                                onClose();
                            }}
                            className="flex flex-col items-center gap-1.5 rounded-lg p-3 hover:bg-black/5 dark:hover:bg-white/10"
                        >
                            <a.icon className="h-7 w-7 text-blue-500" />
                            <span className="line-clamp-1 text-[11px] opacity-80">{a.title}</span>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full py-6 text-center text-xs opacity-50">No apps found</div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-3 dark:border-white/10">
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                            <User className="h-4 w-4" />
                        </span>
                        <span className="font-medium">Aiyu</span>
                    </div>
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                        title="Exit to portfolio"
                    >
                        Exit to site <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"
                        aria-label="Power"
                        title="Sign out"
                    >
                        <Power className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </>
    );
}
