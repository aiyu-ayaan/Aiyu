"use client";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const DeviceModeContext = createContext(null);

// Breakpoints for `auto`: < 768 mobile, 768–1024 tablet, wider desktop.
const MOBILE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1024px)';

// Only the *band* is tracked, never the raw width. Every desktop app reads this
// context, so a `resize` listener storing window.innerWidth re-rendered the
// whole desktop (shell, taskbar and every open app) on every resize event of a
// window drag. matchMedia fires only when a band boundary is crossed, and
// re-setting the same band is a no-op React bails out of.
function readAutoMode() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'desktop';
    if (window.matchMedia(MOBILE_QUERY).matches) return 'mobile';
    if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
    return 'desktop';
}

export function DeviceModeProvider({ children }) {
    const [deviceMode, setDeviceModeState] = useState('auto');
    const [accentColor, setAccentColorState] = useState('lumia-cyan');
    // 'desktop' on the server and for the first client paint, so hydration
    // matches; the effect below corrects it before paint-relevant work.
    const [autoMode, setAutoMode] = useState('desktop');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const savedMode = localStorage.getItem('aiyu_device_mode');
            if (savedMode) setDeviceModeState(savedMode);
            const savedAccent = localStorage.getItem('aiyu_accent_color');
            if (savedAccent) setAccentColorState(savedAccent);
        } catch {
            // Ignore localStorage unavailable errors
        }

        if (typeof window.matchMedia !== 'function') return;
        const sync = () => setAutoMode(readAutoMode());
        sync();

        const lists = [window.matchMedia(MOBILE_QUERY), window.matchMedia(TABLET_QUERY)];
        lists.forEach((mql) => mql.addEventListener('change', sync));
        return () => lists.forEach((mql) => mql.removeEventListener('change', sync));
    }, []);

    const setDeviceMode = useCallback((mode) => {
        setDeviceModeState(mode);
        try {
            localStorage.setItem('aiyu_device_mode', mode);
        } catch {
            // Ignore localStorage write errors
        }
    }, []);

    const setAccentColor = useCallback((color) => {
        setAccentColorState(color);
        try {
            localStorage.setItem('aiyu_accent_color', color);
        } catch {
            // Ignore localStorage write errors
        }
    }, []);

    const effectiveMode = deviceMode === 'auto' ? autoMode : deviceMode;

    const value = useMemo(() => ({
        deviceMode,
        setDeviceMode,
        effectiveMode,
        accentColor,
        setAccentColor,
        isMobile: effectiveMode === 'mobile',
        isTablet: effectiveMode === 'tablet',
        isDesktop: effectiveMode === 'desktop',
    }), [deviceMode, setDeviceMode, effectiveMode, accentColor, setAccentColor]);

    return <DeviceModeContext.Provider value={value}>{children}</DeviceModeContext.Provider>;
}

export function useDeviceMode() {
    const context = useContext(DeviceModeContext);
    if (!context) {
        return {
            deviceMode: 'auto',
            setDeviceMode: () => {},
            effectiveMode: 'desktop',
            accentColor: 'lumia-cyan',
            setAccentColor: () => {},
            isMobile: false,
            isTablet: false,
            isDesktop: true,
        };
    }
    return context;
}
