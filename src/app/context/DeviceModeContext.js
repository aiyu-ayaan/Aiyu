"use client";
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const DeviceModeContext = createContext(null);

export function DeviceModeProvider({ children }) {
    const [deviceMode, setDeviceModeState] = useState('auto');
    const [accentColor, setAccentColorState] = useState('lumia-cyan');
    const [viewportWidth, setViewportWidth] = useState(1200);

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

        const handleResize = () => setViewportWidth(window.innerWidth);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const setDeviceMode = (mode) => {
        setDeviceModeState(mode);
        try {
            localStorage.setItem('aiyu_device_mode', mode);
        } catch {
            // Ignore localStorage write errors
        }
    };

    const setAccentColor = (color) => {
        setAccentColorState(color);
        try {
            localStorage.setItem('aiyu_accent_color', color);
        } catch {
            // Ignore localStorage write errors
        }
    };

    const effectiveMode = useMemo(() => {
        if (deviceMode !== 'auto') return deviceMode;
        if (viewportWidth < 768) return 'mobile';
        if (viewportWidth <= 1024) return 'tablet';
        return 'desktop';
    }, [deviceMode, viewportWidth]);

    const value = useMemo(() => ({
        deviceMode,
        setDeviceMode,
        effectiveMode,
        accentColor,
        setAccentColor,
        isMobile: effectiveMode === 'mobile',
        isTablet: effectiveMode === 'tablet',
        isDesktop: effectiveMode === 'desktop',
    }), [deviceMode, effectiveMode, accentColor]);

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
