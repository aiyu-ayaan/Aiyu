"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const CommandPalette = dynamic(() => import("./CommandPalette"), {
    ssr: false,
});

const SpaceBackground = dynamic(() => import("./SpaceBackground"), {
    ssr: false,
});

const IDLE_ENHANCEMENT_DELAY_MS = 2200;

function detectLowEndDevice() {
    if (typeof window === "undefined") return false;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    // Check hardware concurrency (CPU cores) - most modern phones have 8+
    // If under 4, it's definitely a low-end or older device
    const cores = navigator.hardwareConcurrency || 4;
    
    // Check device memory (RAM) in GB
    // If strictly under 4GB, it likely will struggle with complex canvas
    const memory = navigator.deviceMemory || 4;
    
    const saveData = navigator.connection?.saveData || false;
    
    // Also disable on slow mobile network connections (2g/3g)
    const slowNetwork = navigator.connection?.effectiveType 
        ? ['2g', '3g'].includes(navigator.connection.effectiveType) 
        : false;

    // Detect if the device is specifically low-end mobile/tablet
    const isLowEndMobile = window.innerWidth < 1024 && (cores < 4 || memory < 4);

    return prefersReducedMotion || saveData || slowNetwork || isLowEndMobile;
}

export default function ClientEnhancements() {
    const [mountPalette, setMountPalette] = useState(false);
    const [mountBackground, setMountBackground] = useState(false);
    const [pendingPaletteOpen, setPendingPaletteOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(false);

    const pathname = usePathname();

    const paletteMountedRef = useRef(false);
    const lowEndRef = useRef(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (pathname.startsWith('/admin')) {
                document.documentElement.classList.add('admin-screen');
            } else {
                document.documentElement.classList.remove('admin-screen');
            }
        }
    }, [pathname]);

    useEffect(() => {
        paletteMountedRef.current = mountPalette;
    }, [mountPalette]);

    useEffect(() => {
        lowEndRef.current = detectLowEndDevice();

        const requestEnhancements = ({ openPalette = false } = {}) => {
            setMountPalette(true);
            if (!lowEndRef.current) {
                setMountBackground(true);
            }
            if (openPalette) {
                setPendingPaletteOpen(true);
            }
        };

        const handlePaletteOpenRequest = () => {
            if (!paletteMountedRef.current) {
                requestEnhancements({ openPalette: true });
            }
        };

        const handleKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !paletteMountedRef.current) {
                event.preventDefault();
                requestEnhancements({ openPalette: true });
            }
        };

        window.addEventListener("open-command-palette", handlePaletteOpenRequest);
        window.addEventListener("keydown", handleKeyDown);

        // Scroll Top Visibility Handler
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });

        let idleCallbackId;
        let timeoutId;

        const idleLoad = () => requestEnhancements();

        if (typeof window.requestIdleCallback === "function") {
            idleCallbackId = window.requestIdleCallback(idleLoad, { timeout: IDLE_ENHANCEMENT_DELAY_MS });
        } else {
            timeoutId = window.setTimeout(idleLoad, IDLE_ENHANCEMENT_DELAY_MS);
        }

        return () => {
            window.removeEventListener("open-command-palette", handlePaletteOpenRequest);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", handleScroll);

            if (typeof window.cancelIdleCallback === "function" && idleCallbackId !== undefined) {
                window.cancelIdleCallback(idleCallbackId);
            }
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        let footerObserver = null;
        let footerRetryInterval = null;

        const observeFooter = () => {
            const footer = document.getElementById("site-footer");
            if (!footer) return false;

            footerObserver = new IntersectionObserver(
                ([entry]) => {
                    setIsFooterVisible(entry.isIntersecting);
                },
                { threshold: 0.01 }
            );

            footerObserver.observe(footer);
            return true;
        };

        if (!observeFooter()) {
            footerRetryInterval = window.setInterval(() => {
                if (observeFooter() && footerRetryInterval !== null) {
                    window.clearInterval(footerRetryInterval);
                    footerRetryInterval = null;
                }
            }, 500);
        }

        return () => {
            if (footerObserver) {
                footerObserver.disconnect();
            }
            if (footerRetryInterval !== null) {
                window.clearInterval(footerRetryInterval);
            }
        };
    }, [pathname]);

    useEffect(() => {
        if (!mountPalette || !pendingPaletteOpen) return;

        const timer = window.setTimeout(() => {
            setPendingPaletteOpen(false);
            window.dispatchEvent(new CustomEvent("open-command-palette"));
        }, 0);

        return () => window.clearTimeout(timer);
    }, [mountPalette, pendingPaletteOpen]);

    return (
        <>
            {mountBackground && (
                <div className="fixed inset-0 z-[-1]">
                    <SpaceBackground />
                </div>
            )}
            {mountPalette && <CommandPalette />}

            {/* Scroll to top button */}
            <AnimatePresence>
                {showScrollTop && !isFooterVisible && (
                    <motion.button
                        id="scroll-to-top"
                        className="fixed bottom-6 right-6 w-12 h-12 rounded-full cursor-pointer flex items-center justify-center z-[100] backdrop-blur-md border border-[rgba(255,255,255,0.08)] shadow-lg transition-transform"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        }}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        aria-label="Scroll to Top"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-[var(--text-primary)]"
                        >
                            <path d="m18 15-6-6-6 6" />
                        </svg>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300" />
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}
