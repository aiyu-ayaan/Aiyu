"use client";
import React, { useEffect, useState } from 'react';
import { X, LayoutGrid } from 'lucide-react';
import WidgetsFeed from './widgets/WidgetsFeed';

export default function WidgetsPanel({ open, onClose, openApp }) {
    // Animate in/out with a slight delay to allow CSS transition
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            // Small delay so the DOM mounts before the transition class is applied
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setVisible(true));
            });
        } else {
            setVisible(false);
            const timeout = setTimeout(() => setMounted(false), 250);
            return () => clearTimeout(timeout);
        }
    }, [open]);

    if (!mounted) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bottom-12 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-250 ${
                    visible ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={`fixed bottom-12 left-0 top-0 z-45 flex w-full max-w-[440px] flex-col border-r border-white/10 bg-[#161618]/95 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl transition-all duration-250 ease-out ${
                    visible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 shrink-0">
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
                <div className="flex-1 overflow-y-auto p-3 min-h-0">
                    <WidgetsFeed openApp={openApp} />
                </div>
            </div>
        </>
    );
}
