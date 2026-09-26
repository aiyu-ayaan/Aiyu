"use client";

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDesktop, FaXmark, FaArrowRight } from 'react-icons/fa6';

/**
 * "Launch Desktop OS?" confirmation, lifted out of the old hero unchanged so
 * the redesigned hero can open it from its Windows boot entry.
 */
const DesktopPrompt = ({ open, onClose }) => (
    <AnimatePresence>
        {open && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => onClose()}
                    className="fixed inset-0 bg-black/70 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent-cyan)_35%,transparent)] bg-[var(--bg-surface)] p-6 shadow-2xl backdrop-blur-xl sm:p-8 text-left"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px color-mix(in srgb, var(--accent-cyan) 20%, transparent)',
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="desktop-dialog-title"
                >
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-bright)]"
                        aria-label="Close dialog"
                    >
                        <FaXmark size={14} />
                    </button>

                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent-cyan)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)] px-3 py-1 text-xs font-semibold font-mono text-[var(--accent-cyan)]">
                        <FaDesktop size={12} />
                        <span>Aiyu OS · Web Desktop</span>
                    </div>

                    <h3 id="desktop-dialog-title" className="text-2xl font-bold text-[var(--text-bright)] sm:text-3xl">
                        Launch Desktop OS?
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                        Switch to an interactive, windowed Web OS environment simulating Windows 11 with built-in apps, code editor, terminal, browser, and live widgets.
                    </p>

                    <div className="mt-5 space-y-2.5 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-4 text-xs sm:text-sm">
                        <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                            <span className="font-bold text-[var(--accent-cyan)]">•</span>
                            <span>Multi-window multitasking with drag, minimize & resize</span>
                        </div>
                        <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                            <span className="font-bold text-[var(--accent-purple)]">•</span>
                            <span>Interactive Apps (Terminal, Code Editor, Browser & Settings)</span>
                        </div>
                        <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                            <span className="font-bold text-[var(--accent-orange)]">•</span>
                            <span>Custom wallpapers and widgets feed</span>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => onClose()}
                            className="pill-ghost cursor-pointer text-xs sm:text-sm"
                        >
                            Cancel
                        </button>
                        <Link
                            href="/desktop"
                            onClick={() => onClose()}
                            className="pill-solid inline-flex items-center gap-2 text-xs sm:text-sm"
                        >
                            <span>Launch Desktop</span>
                            <FaArrowRight size={12} />
                        </Link>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

export default DesktopPrompt;
