"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';

export default function TerminalPath() {
    const pathname = usePathname();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div
            className="w-full py-1.5 px-4 sm:px-6 flex items-center font-mono text-[11px] sm:text-xs border-t"
            style={{
                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                color: theme === 'dark' ? 'rgba(148, 163, 184, 1)' : 'rgba(100, 116, 139, 1)',
            }}
        >
            <span className="text-green-400 mr-2 flex-shrink-0">➜</span>
            <span style={{ color: 'var(--accent-cyan)' }} className="truncate">
                ~{pathname || '/'}
            </span>
            <span className="ml-3 opacity-50 hidden sm:inline" style={{ color: 'var(--accent-purple)' }}>
                git:(main)
            </span>
            <span
                className="w-2 h-4 ml-2 animate-pulse"
                style={{ backgroundColor: theme === 'dark' ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)' }}
            />
        </div>
    );
}
