"use client";
import { useState, useEffect } from 'react';

/**
 * Device performance tiers based on hardware capabilities
 * @typedef {'low' | 'medium' | 'high'} PerformanceTier
 */

/**
 * Detects device capabilities and returns a performance tier.
 * Uses multiple signals: CPU cores, device memory, pixel ratio, and user preferences.
 * 
 * @returns {{ tier: PerformanceTier, prefersReducedMotion: boolean, isLowEnd: boolean, isMobile: boolean }}
 */
const useDevicePerformance = () => {
    const [performanceData, setPerformanceData] = useState({
        tier: 'high',
        prefersReducedMotion: false,
        isLowEnd: false,
        isMobile: false,
    });

    useEffect(() => {
        const detectPerformance = () => {
            let score = 0;

            // Check for reduced motion preference (highest priority)
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) {
                return {
                    tier: 'low',
                    prefersReducedMotion: true,
                    isLowEnd: true,
                    isMobile: false,
                };
            }

            // CPU cores (navigator.hardwareConcurrency)
            const cores = navigator.hardwareConcurrency || 2;
            if (cores >= 8) score += 3;
            else if (cores >= 4) score += 2;
            else score += 0;

            // Device memory (navigator.deviceMemory) - only available in some browsers
            const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
            if (memory >= 8) score += 3;
            else if (memory >= 4) score += 2;
            else if (memory >= 2) score += 1;
            else score += 0;

            // Device pixel ratio (high DPI = more rendering work)
            const dpr = window.devicePixelRatio || 1;
            if (dpr <= 1) score += 2; // Low DPI, easier to render
            else if (dpr <= 2) score += 1;
            else score += 0; // High DPI, harder to render

            // Connection type (if available)
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                const effectiveType = connection.effectiveType;
                if (effectiveType === '4g') score += 1;
                else if (effectiveType === '3g' || effectiveType === '2g') score -= 1;

                // Save data mode
                if (connection.saveData) score -= 2;
            }

            // Mobile detection (touch device with small screen)
            const isMobile = 'ontouchstart' in window && window.innerWidth < 768;
            if (isMobile) score -= 1; // Mobile typically has less GPU power

            // Calculate tier based on score
            // Max possible score: 3 + 3 + 2 + 1 = 9
            // Min possible score: 0 + 0 + 0 - 1 - 2 - 1 = -4
            let tier;
            if (score >= 6) tier = 'high';
            else if (score >= 3) tier = 'medium';
            else tier = 'low';

            return {
                tier,
                prefersReducedMotion: false,
                isLowEnd: tier === 'low',
                isMobile,
            };
        };

        setPerformanceData(detectPerformance());

        // Listen for reduced motion preference changes
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = () => setPerformanceData(detectPerformance());
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return performanceData;
};

export default useDevicePerformance;
