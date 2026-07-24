"use client";
import React, { useState } from 'react';
import { X, LayoutGrid, Box } from 'lucide-react';
import WidgetsFeed from './widgets/WidgetsFeed';
import WingetPanel from './widgets/WingetPanel';

export default function WidgetsPanel({ open, onClose, openApp }) {
    const [tab, setTab] = useState('feed'); // 'feed' | 'winget'

    if (!open) return null;

    return (
        <div
            className="fixed bottom-12 left-0 top-0 z-40 flex w-full max-w-[460px] flex-col border-r border-white/15 bg-[#161618]/90 text-white shadow-2xl backdrop-blur-2xl transition-all duration-300 dark:bg-[#121214]/95"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30">
                        {tab === 'feed' ? <LayoutGrid className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold leading-none">
                            {tab === 'feed' ? 'Widgets Board' : 'Winget Package Manager'}
                        </h2>
                        <p className="text-[11px] text-neutral-400">Aiyu OS Desktop Center</p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1 text-xs">
                    <button
                        onClick={() => setTab('feed')}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
                            tab === 'feed' ? 'bg-blue-600 font-medium text-white shadow' : 'text-neutral-300 hover:text-white'
                        }`}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>Feed</span>
                    </button>
                    <button
                        onClick={() => setTab('winget')}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
                            tab === 'winget' ? 'bg-blue-600 font-medium text-white shadow' : 'text-neutral-300 hover:text-white'
                        }`}
                    >
                        <Box className="h-3.5 w-3.5" />
                        <span>Winget</span>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                    aria-label="Close Widgets"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-3">
                {tab === 'feed' ? <WidgetsFeed openApp={openApp} /> : <WingetPanel openApp={openApp} />}
            </div>
        </div>
    );
}
