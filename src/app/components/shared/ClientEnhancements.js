"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

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
    const cores = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 4;
    const saveData = navigator.connection?.saveData || false;
    const isSmallScreen = window.innerWidth < 768;

    return prefersReducedMotion || saveData || cores <= 4 || memory <= 4 || isSmallScreen;
}

export default function ClientEnhancements() {
    const [mountPalette, setMountPalette] = useState(false);
    const [mountBackground, setMountBackground] = useState(false);
    const [pendingPaletteOpen, setPendingPaletteOpen] = useState(false);

    const paletteMountedRef = useRef(false);
    const lowEndRef = useRef(false);

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

            if (typeof window.cancelIdleCallback === "function" && idleCallbackId !== undefined) {
                window.cancelIdleCallback(idleCallbackId);
            }
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
        };
    }, []);

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
        </>
    );
}
