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
    const [output, setOutput] = useState(null); // State for command output
    const [blogCache, setBlogCache] = useState([]); // Cache for blog slugs/ids
    const inputRef = useRef(null);

    useEffect(() => {
        setMounted(true);

        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '`') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Fetch blogs when on /blogs path OR when typing cd blogs/ for nested suggestions
    useEffect(() => {
        const shouldFetchBlogs = pathname === '/blogs' || input.toLowerCase().startsWith('cd blogs/');
        if (shouldFetchBlogs && blogCache.length === 0) {
            fetch('/api/blogs')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setBlogCache(data.data.map(b => ({ id: b._id, title: b.title })));
                    }
                })
                .catch(() => { });
        }
    }, [pathname, blogCache.length, input]);

    const pathSegments = pathname?.split('/').filter(Boolean) || [];

    // Helper to get auto-complete suggestion (context-aware with nested path support)
    const getSuggestion = () => {
        if (!input.toLowerCase().startsWith('cd ')) return '';
        const query = input.slice(3).trim();
        if (!query) return '';

        // Check for nested path (e.g., "blogs/...")
        if (query.includes('/')) {
            const parts = query.split('/');
            const parentDir = parts[0].toLowerCase();
            const subQuery = parts.slice(1).join('/').toLowerCase();

            // Nested suggestion for blogs/
            if (parentDir === 'blogs' && blogCache.length > 0) {
                const match = blogCache.find(b => b.title.toLowerCase().startsWith(subQuery));
                if (match) return match.title.slice(subQuery.length);
                return '';
            }
            return '';
        }

        // Context-aware suggestions based on current path
        if (pathname === '/blogs' && blogCache.length > 0) {
            // Suggest blog IDs based on title match
            const match = blogCache.find(b => b.title.toLowerCase().startsWith(query.toLowerCase()));
            if (match) return match.title.slice(query.length);
            return '';
        }

        // Default: suggest from SUGGESTIONS
        const match = SUGGESTIONS.find(s => s.toLowerCase().startsWith(query.toLowerCase()));
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

        // Clear previous output
        setOutput(null);

        const parts = cmd.split(' ');
        const command = parts[0].toLowerCase();
        const arg = parts.slice(1).join(' '); // Join all parts after command for multi-word titles

        if (command === 'cd') {
            if (!arg || arg === '~') {
                router.push('/');
            } else if (arg === '..') {
                const newPath = pathSegments.slice(0, -1).join('/');
                router.push(newPath ? `/${newPath}` : '/');
            } else if (arg.includes('/')) {
                // Handle nested path (e.g., blogs/[title])
                const argParts = arg.split('/');
                const parentDir = argParts[0].toLowerCase();
                const subPath = argParts.slice(1).join('/');

                if (parentDir === 'blogs' && subPath && blogCache.length > 0) {
                    const blog = blogCache.find(b => b.title.toLowerCase() === subPath.toLowerCase());
                    if (blog) {
                        router.push(`/blogs/${blog.id}`);
                        return;
                    }
                }

                // Check if just navigating to a valid parent (e.g., cd blogs/)
                if (SUGGESTIONS.includes(parentDir) && !subPath) {
                    router.push(`/${parentDir}`);
                    return;
                }

                // Show error for invalid nested path
                setInput(`cd: no such file or directory: ${arg}`);
                setTimeout(() => setInput(''), 2000);
            } else {
                // Context-aware navigation for current directory
                if (pathname === '/blogs' && blogCache.length > 0) {
                    // Check if arg matches a blog title
                    const blog = blogCache.find(b => b.title.toLowerCase() === arg.toLowerCase());
                    if (blog) {
                        router.push(`/blogs/${blog.id}`);
                        return;
                    }
                }

                // Check if the argument is a valid root path
                const validPaths = SUGGESTIONS;
                const cleanArg = arg.startsWith('/') ? arg.slice(1) : arg;

                if (validPaths.includes(cleanArg.toLowerCase())) {
                    router.push(`/${cleanArg}`);
                } else {
                    // Show error in input temporarily
                    setInput(`cd: no such file or directory: ${arg}`);
                    setTimeout(() => setInput(''), 2000);
                }
            }
        } else if (command === 'ls') {
            handleLs();
        } else if (command === 'help') {
            setOutput({
                type: 'help',
                items: [
                    { cmd: 'cd [path]', desc: 'Navigate to a directory (e.g., cd blogs, cd blogs/[title])' },
                    { cmd: 'cd ..', desc: 'Go back to parent directory' },
                    { cmd: 'cd ~', desc: 'Go to home (root)' },
                    { cmd: 'ls', desc: 'List contents of current directory' },
                    { cmd: 'help', desc: 'Show this help message' },
                ]
            });
            setTimeout(() => setOutput(null), 8000);
        }
    };

    const handleLs = async () => {
        // 1. Root Directory
        if (pathname === '/') {
            setOutput({
                type: 'list',
                items: SUGGESTIONS.map(s => s + '/')
            });
            setTimeout(() => setOutput(null), 5000);
            return;
        }

        // 2. Blogs Directory
        if (pathname === '/blogs') {
            setOutput({ type: 'loading', message: 'Fetching blogs...' });
            try {
                const res = await fetch('/api/blogs?all=true'); // Fetch all to list
                const data = await res.json();
                if (data.success) {
                    const blogTitles = data.data.map(b => b.title);
                    setOutput({
                        type: 'list',
                        items: blogTitles.length > 0 ? blogTitles : ['No blogs found.']
                    });
                    setTimeout(() => setOutput(null), 5000);
                } else {
                    setOutput({ type: 'error', message: 'Failed to fetch blogs.' });
                    setTimeout(() => setOutput(null), 5000);
                }
            } catch (error) {
                setOutput({ type: 'error', message: 'Error fetching blogs.' });
                setTimeout(() => setOutput(null), 5000);
            }
            return;
        }

        // 3. Other Directories (Default empty or specific logic)
        setOutput({
            type: 'list',
            items: [] // Or maybe ['.', '..']
        });
        setTimeout(() => setOutput(null), 5000);
    };

    if (!mounted) return null;

    return (
        <div
            className="w-full py-1.5 pl-5 pr-4 sm:px-6 flex items-center font-mono text-[11px] sm:text-xs relative group"
            style={{
                backgroundColor: isFocused ? 'rgba(255,255,255,0.01)' : 'transparent',
                cursor: 'text'
            }}
            onClick={() => inputRef.current?.focus()}
        >
            {/* Terminal Prompt Symbol */}
            <span className="text-emerald-500 ml-1 mr-2 flex-shrink-0 font-bold select-none">➜</span>

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
            <div className="flex-1 ml-2 flex items-center relative overflow-hidden">
                {/* Visual Input + Cursor + Ghost Text */}
                <div className="flex items-center whitespace-pre relative z-10 pointer-events-none">
                    <span style={{ color: 'var(--accent-cyan)' }}>{input}</span>

                    {/* Blinking Cursor */}
                    <span
                        className={`w-2 h-4 rounded-sm transition-opacity ${isFocused ? 'animate-pulse' : 'opacity-0'}`}
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
                    onBlur={() => {
                        setIsFocused(false);
                        // Delay clearing output to allow clicks/reads if needed, or clear on blur?
                        // For now we keep output until next command or manual dismiss? 
                        // Actually let's clear output on blur to keep UI clean, 
                        // but maybe a small delay or check relatedTarget.
                        // Let's keep it simple: output stays until next command or explicit close action.
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-text z-0"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                />
            </div>

            {/* Output Overlay */}
            {output && (
                <div
                    className="absolute top-full left-0 mt-1 w-full rounded-md shadow-xl z-50 overflow-hidden"
                    style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-secondary)'
                    }}
                >
                    <div className="p-2 text-xs font-mono max-h-60 overflow-y-auto">
                        {output.type === 'loading' && (
                            <div className="italic" style={{ color: 'var(--text-tertiary)' }}>{output.message}</div>
                        )}
                        {output.type === 'error' && (
                            <div style={{ color: 'var(--status-error)' }}>{output.message}</div>
                        )}
                        {output.type === 'list' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {output.items.map((item, idx) => (
                                    <div key={idx} className="cursor-default truncate" style={{ color: 'var(--accent-cyan)' }}>
                                        {item}
                                    </div>
                                ))}
                                {output.items.length === 0 && <span className="italic" style={{ color: 'var(--text-muted)' }}>Empty directory</span>}
                            </div>
                        )}
                        {output.type === 'help' && (
                            <div className="space-y-1">
                                {output.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <span className="font-semibold min-w-[120px]" style={{ color: 'var(--accent-cyan)' }}>{item.cmd}</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>{item.desc}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div
                        className="px-2 py-1 text-[10px] flex justify-between"
                        style={{
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-muted)',
                            borderTop: '1px solid var(--border-primary)'
                        }}
                    >
                        <span>Output</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setOutput(null);
                            }}
                            className="hover:opacity-70"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            [Close]
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
