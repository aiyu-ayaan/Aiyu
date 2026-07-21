"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaGamepad, FaXmark } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISS_KEY = 'arcade-popup-dismissed';
const V2_POPUP_DISMISS_KEY = 'v2-beta-popup-dismissed';
const SHOW_DELAY_MS = 2400;

/**
 * Collapsible chiptune-themed announcement widget.
 * Fixed on the left edge, matching the style and lifecycle of LiveCommitStream.
 * The toggle badge itself is visible all the time.
 */
export default function ArcadePopup() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 30);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let dismissed;
        let v2PopupPending = false;
        try {
            dismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
            v2PopupPending = window.localStorage.getItem(V2_POPUP_DISMISS_KEY) !== '1';
        } catch {
            // localStorage unavailable — treat as dismissed to prevent intrusive behavior
            dismissed = true;
        }
        if (dismissed) return;

        // Yield to V2 beta popup on classic home page if it is pending
        const onClassicHome = !document.querySelector('[data-v2-shell]');
        if (onClassicHome && v2PopupPending) return;

        const timer = window.setTimeout(() => {
            setIsExpanded(true); // Auto-expand on first visit
        }, SHOW_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, []);

    const dismiss = () => {
        setIsExpanded(false);
        try {
            window.localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // Ignore storage failures
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className={`fixed z-50 flex gap-2 transition-all duration-300 pointer-events-none ${
                isMobile ? 'flex-col-reverse w-[85%] max-w-[320px]' : 'flex-col w-72'
            }`}
            style={{
                top: isMobile ? 'auto' : (scrolled ? '140px' : '230px'),
                left: '0px',
                bottom: isMobile ? '180px' : 'auto',
                right: 'auto'
            }}
        >
            {/* Collapsed Toggle Badge Button — Visible all the time */}
            <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.05, x: isExpanded ? 0 : 2 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 p-2 backdrop-blur-md border shadow-lg cursor-pointer self-start pointer-events-auto transition-all duration-300 ${
                    isExpanded
                        ? 'bg-[var(--bg-secondary)] border-[var(--border-accent)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-secondary)]'
                } rounded-r-full border-l-0 pl-2 pr-3.5`}
            >
                <FaGamepad size={16} className="text-[var(--accent-cyan)] animate-pulse" />
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-magenta)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-magenta)]"></span>
                </span>
            </motion.button>

            {/* Expandable Announcement Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, x: -30, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -30, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`flex flex-col gap-2.5 pointer-events-auto border p-4 shadow-2xl ${
                            isMobile ? 'rounded-r-xl rounded-l-none border-l-0' : 'rounded-r-lg rounded-l-none border-l-0'
                        }`}
                        style={{
                            borderColor: 'color-mix(in srgb, var(--accent-cyan) 40%, var(--border-secondary))',
                            background:
                                'linear-gradient(160deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 88%, transparent))',
                            backdropFilter: 'blur(20px) saturate(150%)',
                        }}
                    >
                        {/* Drawer Header inside Panel */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-secondary)]/50 mb-0.5">
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 bg-[var(--accent-cyan)]" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent-cyan)]" />
                                </span>
                                <span className="text-[10px] font-mono font-bold text-[var(--accent-cyan)] tracking-wider">NEW UPDATE · ARCADE</span>
                            </div>
                            <button 
                                onClick={dismiss} 
                                className="text-[var(--text-muted)] hover:text-white transition-colors p-1 cursor-pointer"
                                aria-label="Collapse panel"
                            >
                                <span className="text-[10px]"><FaXmark size={12} /></span>
                            </button>
                        </div>

                        {/* Announcement Text */}
                        <div className="flex flex-col gap-1">
                            <h2 className="text-sm font-bold tracking-tight text-[var(--text-bright)]">
                                The Aiyu Arcade just opened. 🕹️
                            </h2>
                            <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
                                Nine retro time-killers — a 3D Byte Runner, Moto Rush highway weaving, Tetris,
                                Snake, Breakout, Space Invaders, Pong, Flappy Byte, and an unbeatable
                                Tic-Tac-Toe. High scores included.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3.5 mt-0.5">
                            <Link
                                href="/games"
                                onClick={dismiss}
                                className="pill-solid inline-flex items-center gap-1.5 !py-1.5 !px-3.5 !text-xs font-semibold"
                            >
                                <FaGamepad size={13} /> Insert coin
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
