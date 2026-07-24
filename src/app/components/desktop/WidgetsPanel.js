"use client";
import React from 'react';
import { X, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import WidgetsFeed from './widgets/WidgetsFeed';

export default function WidgetsPanel({ open, onClose, openApp }) {
    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-x-0 top-0 z-40 bg-black/20 backdrop-blur-[2px]"
                style={{ height: 'calc(100vh - 48px)' }}
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                data-lenis-prevent
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="fixed top-0 left-0 z-45 flex w-full max-w-[440px] flex-col overflow-hidden text-white win-acrylic win-acrylic-noise win-acrylic-highlight bg-[#f0f0f5]/60 dark:bg-[#161618]/75 border-r border-white/20 dark:border-white/8 shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
                style={{ height: 'calc(100vh - 48px)', maxHeight: 'calc(100vh - 48px)' }}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 shrink-0 h-[57px]">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/25 text-blue-400 border border-blue-500/25">
                            <LayoutGrid className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold leading-none">Widgets</h2>
                            <p className="text-[10px] text-neutral-500 mt-0.5 font-medium">Aiyu Desktop Center</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-neutral-500 hover:text-white transition-colors"
                        aria-label="Close Widgets"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content Body */}
                <div
                    data-lenis-prevent
                    className="w-full overflow-y-auto p-3 custom-scrollbar"
                    style={{ height: 'calc(100vh - 105px)', maxHeight: 'calc(100vh - 105px)' }}
                >
                    <WidgetsFeed openApp={openApp} />
                </div>
            </motion.div>
        </>
    );
}

