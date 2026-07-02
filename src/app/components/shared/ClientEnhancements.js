"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const CommandPalette = dynamic(() => import("./CommandPalette"), {
    ssr: false,
});

const SpaceBackground = dynamic(() => import("./SpaceBackground"), {
    ssr: false,
});

const V2BetaPopup = dynamic(() => import("./V2BetaPopup"), {
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

    // Buttery smooth scroll setup with Lenis
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Skip Lenis on administrative panels
        if (pathname.startsWith('/admin')) {
            return;
        }

        // Skip Lenis on mobile/tablet/touch devices to avoid scroll-locking and preserve native momentum scrolling
        const isTouchDevice = 
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

        if (isTouchDevice) {
            return;
        }

        // Lenis + GSAP are only needed for desktop smooth-scroll. Loading them
        // lazily here keeps them out of the always-loaded root bundle, so mobile
        // and admin routes never download them.
        let cancelled = false;
        let lenis;
        let tickerCallback;
        let gsapRef;

        (async () => {
            try {
                const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([
                    import("lenis"),
                    import("./gsapScroll"),
                ]);
                if (cancelled) return;
                gsapRef = gsap;

                lenis = new Lenis({
                    duration: 1.1,
                    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                    orientation: 'vertical',
                    gestureOrientation: 'vertical',
                    smoothWheel: true,
                    wheelMultiplier: 1.0,
                    touchMultiplier: 1.5,
                    infinite: false,
                });

                // Update ScrollTrigger on Lenis scroll
                lenis.on('scroll', () => {
                    ScrollTrigger.update();
                });
                // Update ScrollTrigger on Lenis scroll
                lenis.on('scroll', () => {
                    ScrollTrigger.update();
                });

                // Sync GSAP ticker with Lenis frame rendering
                tickerCallback = (time) => {
                    lenis.raf(time * 1000);
                };
                gsap.ticker.add(tickerCallback);
                gsap.ticker.lagSmoothing(0);
            } catch (error) {
                console.error("Failed to initialize Lenis:", error);
            }
        })();

        return () => {
            cancelled = true;
            cancelled = true;
            if (lenis) {
                lenis.destroy();
            }
            if (tickerCallback && gsapRef) {
                gsapRef.ticker.remove(tickerCallback);
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

            {pathname === '/' && <V2BetaPopup />}

            {/* Scroll to top button — CSS-only transitions (no framer-motion) so
                this always-rendered root component stays out of the heavy
                animation bundle. Kept mounted; visibility is toggled via opacity
                + transform so it animates in/out without AnimatePresence. */}
            <button
                id="scroll-to-top"
                className="fixed bottom-6 right-6 w-12 h-12 rounded-full cursor-pointer flex items-center justify-center z-[100] backdrop-blur-md border border-[rgba(255,255,255,0.08)] shadow-lg transition-all duration-300 ease-out hover:scale-110 hover:bg-[rgba(255,255,255,0.1)] active:scale-95 motion-reduce:transition-none"
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    opacity: showScrollTop && !isFooterVisible ? 1 : 0,
                    transform: showScrollTop && !isFooterVisible ? 'translateY(0)' : 'translateY(20px)',
                    pointerEvents: showScrollTop && !isFooterVisible ? 'auto' : 'none',
                }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Scroll to Top"
                aria-hidden={showScrollTop && !isFooterVisible ? undefined : 'true'}
                tabIndex={showScrollTop && !isFooterVisible ? 0 : -1}
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
            </button>
        </>
    );
}
