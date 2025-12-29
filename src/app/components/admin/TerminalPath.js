"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function TerminalPath() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        setMounted(true);
        // Optional: Check local storage for preference
        const savedState = localStorage.getItem('terminalPathVisible');
        if (savedState !== null) {
            setIsVisible(savedState === 'true');
        }
    }, []);

    // Update CSS variable when visibility changes
    useEffect(() => {
        if (mounted) {
            const height = isVisible ? '4rem' : '0px'; // 4rem approx for the bar, 0px when collapsed
            document.documentElement.style.setProperty('--terminal-height', height);
        }
    }, [isVisible, mounted]);

    const toggleVisibility = () => {
        const newState = !isVisible;
        setIsVisible(newState);
        localStorage.setItem('terminalPathVisible', newState);
    };

    if (!mounted) return null;

    // Convert path to terminal style
    const formattedPath = pathname ? `~${pathname}` : '~';

    return (
        <>
            <AnimatePresence>
                {isVisible ? (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 z-[100] w-full bg-[#0f172a]/95 backdrop-blur-md border-t border-white/10 px-4 py-1.5 flex items-center justify-between font-mono text-xs sm:text-sm shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
                    >
                        <div className="flex items-center overflow-hidden whitespace-nowrap">
                            {/* Terminal Prompt Symbol */}
                            <span className="text-green-400 mr-2 flex-shrink-0">➜</span>

                            {/* Path */}
                            <span className="text-cyan-400 mr-2 truncate max-w-[60vw] sm:max-w-none">
                                {formattedPath}
                            </span>

                            {/* Git Branch */}
                            <span className="text-purple-400 mr-2 text-xs opacity-75 hidden sm:inline">
                                (main)
                            </span>

                            {/* Blinking Cursor */}
                            <span className="w-2.5 h-5 bg-slate-400 animate-pulse block" />
                        </div>

                        {/* Minimize Button */}
                        <button
                            onClick={toggleVisibility}
                            className="text-slate-400 hover:text-white transition-colors p-1"
                            title="Minimize Terminal"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </motion.div>
                ) : (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={toggleVisibility}
                        className="fixed bottom-4 right-4 z-[100] bg-[#0f172a] border border-white/10 text-cyan-400 p-3 rounded-full shadow-lg hover:bg-[#1e293b] transition-all group"
                        title="Show Terminal Path"
                    >
                        <span className="sr-only">Show Terminal</span>
                        <div className="flex items-center gap-1 font-mono text-sm">
                            <span className="text-green-400">➜</span>
                            <span className="w-2 h-4 bg-slate-400 animate-pulse hidden group-hover:block" />
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}
