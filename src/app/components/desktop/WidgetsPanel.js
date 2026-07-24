"use client";
import React from 'react';
import { X, LayoutGrid } from 'lucide-react';
import WidgetsFeed from './widgets/WidgetsFeed';

export default function WidgetsPanel({ open, onClose, openApp }) {
    if (!open) return null;

    return (
        <div
            className="fixed bottom-12 left-0 top-0 z-40 flex w-full max-w-[460px] flex-col border-r border-white/15 bg-[#161618]/90 text-white shadow-2xl backdrop-blur-2xl transition-all duration-300 dark:bg-[#121214]/95"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30">
                        <LayoutGrid className="h-4.5 w-4.5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold leading-none">Widgets Board</h2>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Aiyu OS Desktop Center</p>
                    </div>
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
                <WidgetsFeed openApp={openApp} />
            </div>
        </div>
    );
}
