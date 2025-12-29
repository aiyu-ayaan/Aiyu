"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function TerminalPath() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div
            className="w-full py-1.5 px-4 sm:px-6 flex items-center font-mono text-[11px] sm:text-xs border-t"
            style={{
                borderColor: 'var(--border-secondary)',
            }}
        >
            <span className="text-emerald-500 mr-2 flex-shrink-0 font-bold">➜</span>
            <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                ~{pathname || '/'}
            </span>
            <span className="ml-3 hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
                git:(main)
            </span>
            <span
                className="w-2 h-4 ml-2 animate-pulse rounded-sm"
                style={{ backgroundColor: 'var(--text-secondary)' }}
            />
        </div>
    );
}
