"use client";
import { useState, useEffect } from 'react';

export function getDeviceName(config) {
    if (typeof window !== 'undefined') {
        try {
            const local = localStorage.getItem('aiyu_device_name');
            if (local && local.trim()) return local.trim();
        } catch (err) {
            // Ignore localStorage errors
            void err;
        }
    }
    if (config?.desktopDeviceName && config.desktopDeviceName.trim()) return config.desktopDeviceName.trim();
    if (config?.deviceName && config.deviceName.trim()) return config.deviceName.trim();
    if (config?.authorName && config.authorName.trim()) return `${config.authorName.trim().toUpperCase()}-PC`;
    if (config?.siteTitle && config.siteTitle.trim()) return `${config.siteTitle.trim().toUpperCase()}-PC`;
    return 'AIYU-PC';
}

export function useDeviceName(config) {
    const [deviceName, setDeviceName] = useState(() => getDeviceName(config));

    useEffect(() => {
        const handleUpdate = () => setDeviceName(getDeviceName(config));
        handleUpdate();
        window.addEventListener('storage', handleUpdate);
        window.addEventListener('aiyu_device_name_updated', handleUpdate);
        return () => {
            window.removeEventListener('storage', handleUpdate);
            window.removeEventListener('aiyu_device_name_updated', handleUpdate);
        };
    }, [config]);

    const updateDeviceName = (newName) => {
        const trimmed = (newName || '').trim();
        if (!trimmed) return;
        try {
            localStorage.setItem('aiyu_device_name', trimmed);
        } catch (err) {
            // Ignore localStorage write errors
            void err;
        }
        setDeviceName(trimmed);
        window.dispatchEvent(new Event('aiyu_device_name_updated'));

        fetch('/api/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ desktopDeviceName: trimmed }),
        }).catch(() => {});
    };

    return [deviceName, updateDeviceName];
}
