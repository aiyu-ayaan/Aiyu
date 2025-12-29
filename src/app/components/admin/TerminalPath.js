"use client";
import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const SUGGESTIONS = ['about-me', 'blogs', 'projects', 'gallery', 'github', 'resume', 'contact-me'];

export default function TerminalPath() {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const pathSegments = pathname?.split('/').filter(Boolean) || [];

    // Helper to get auto-complete suggestion
    const getSuggestion = () => {
        if (!input.toLowerCase().startsWith('cd ')) return '';
        const query = input.slice(3).toLowerCase().trim();
        if (!query) return '';
        const match = SUGGESTIONS.find(s => s.toLowerCase().startsWith(query));
        if (match) return match.slice(query.length);
        return '';
    };

    const suggestionSuffix = getSuggestion();

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (suggestionSuffix) {
                // Correctly append the suffix to the current input
                setInput(input + suggestionSuffix);
            }
        } else if (e.key === 'Enter') {
            handleCommand();
        }
    };

    const handleCommand = () => {
        const cmd = input.trim();
        setInput(''); // Clear input immediately

        if (!cmd) return;

        const parts = cmd.split(' ');
        const command = parts[0].toLowerCase();
        const arg = parts[1];

        if (command === 'cd') {
            if (!arg || arg === '~') {
                router.push('/');
            } else if (arg === '..') {
                const newPath = pathSegments.slice(0, -1).join('/');
                router.push(newPath ? `/${newPath}` : '/');
            } else {
                router.push(arg.startsWith('/') ? arg : `/${arg}`);
            }
        }
    };

    if (!mounted) return null;

    return (
        <div
            className="w-full py-1.5 px-4 sm:px-6 flex items-center font-mono text-[11px] sm:text-xs relative overflow-hidden group"
            style={{
                backgroundColor: isFocused ? 'rgba(255,255,255,0.01)' : 'transparent',
                cursor: 'text'
            }}
            onClick={() => inputRef.current?.focus()}
        >
            {/* Terminal Prompt Symbol */}
            <span className="text-emerald-500 mr-2 flex-shrink-0 font-bold select-none">➜</span>

            {/* Breadcrumbs - Root */}
            <Link
                href="/"
                className="hover:underline transition-all relative z-20"
                style={{ color: 'var(--text-primary)' }}
            >
                ~
            </Link>

            {/* Breadcrumbs - Segments */}
            {pathSegments.map((segment, index) => {
                const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
                return (
                    <React.Fragment key={segment}>
                        <span className="mx-0.5 opacity-50 select-none" style={{ color: 'var(--text-tertiary)' }}>/</span>
                        <Link
                            href={href}
                            className="hover:underline transition-all font-medium relative z-20"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {segment}
                        </Link>
                    </React.Fragment>
                );
            })}

            {/* Git Branch */}
            <span className="ml-3 hidden sm:inline select-none" style={{ color: 'var(--text-secondary)' }}>
                git:(main)
            </span>

            {/* Interactive Input Area */}
            <div className="flex-1 ml-2 flex items-center relative">
                {/* Visual Input + Cursor + Ghost Text */}
                <div className="flex items-center whitespace-pre relative z-10 pointer-events-none">
                    <span style={{ color: 'var(--accent-cyan)' }}>{input}</span>

                    {/* Blinking Cursor */}
                    <span
                        className={`w-2 h-4 -ml-0.5 rounded-sm transition-opacity ${isFocused ? 'animate-pulse' : 'opacity-0'}`}
                        style={{ backgroundColor: 'var(--text-secondary)' }}
                    />

                    {/* Ghost Text Suggestion */}
                    {suggestionSuffix && (
                        <span className="opacity-40" style={{ color: 'var(--text-secondary)' }}>
                            {suggestionSuffix}
                        </span>
                    )}
                </div>

                {/* Hidden Real Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-text z-0"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                />
            </div>
        </div>
    );
}
