"use client";
import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../../context/ThemeContext';
import confetti from 'canvas-confetti';
import { themePresets } from '../../../lib/themePresets';
import { applyThemeColors } from '../../../utils/themeUtils';

const SUGGESTIONS = ['about-me', 'blogs', 'projects', 'gallery', 'github', 'resume', 'contact-me'];
const ALL_COMMANDS = ['cd', 'ls', 'pwd', 'clear', 'date', 'whoami', 'history', 'resume', 'email', 'socials', 'reboot', 'help', 'theme', 'echo', 'sysinfo', 'joke', 'projects', 'ascii', 'roll', 'flip', 'magic8', 'disco'];

const ASCII_ARTS = [
    {
        name: 'robot',
        art: `
      /\\_/\\
     ( o.o )
      > ^ <
    `
    },
    {
        name: 'coffee',
        art: `
    ( (
     ) )
  ........
  |      |]
  \\      /
   \`----'
    `
    },
    {
        name: 'ghost',
        art: `
   .-.
  (o o) boo!
  | O \\
   \\   \\
    \`~~~'
    `
    }
];

export default function TerminalPath({ socialData, config }) {
    const pathname = usePathname();
    const router = useRouter();
    const { switchVariant, theme, activeThemeData } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [output, setOutput] = useState(null); // State for command output
    const [blogCache, setBlogCache] = useState([]); // Cache for blog slugs/ids
    const [history, setHistory] = useState([]); // Command history
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
        const trimmedInput = input.trim();
        if (!trimmedInput) return '';

        const parts = input.split(' ');

        // 1. Suggest command name if user is just starting
        if (parts.length === 1 && !input.endsWith(' ')) {
            const query = parts[0].toLowerCase();
            const match = ALL_COMMANDS.find(c => c.startsWith(query));
            if (match && match !== query) return match.slice(query.length);
            return '';
        }

        // 2. Suggest arguments for specific commands (currently primarily 'cd')
        if (parts[0].toLowerCase() === 'cd') {
            const query = input.slice(3).trim();
            if (!query) return '';

            // Check for nested path (e.g., "blogs/...")
            if (query.includes('/')) {
                const queryParts = query.split('/');
                const parentDir = queryParts[0].toLowerCase();
                const subQuery = queryParts.slice(1).join('/').toLowerCase();

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
        }

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
        addToHistory(cmd);

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
        } else if (command === 'clear') {
            setOutput(null);
        } else if (command === 'pwd') {
            setOutput({ type: 'text', message: pathname });
            setTimeout(() => setOutput(null), 5000);
        } else if (command === 'date') {
            setOutput({ type: 'text', message: new Date().toString() });
            setTimeout(() => setOutput(null), 5000);
        } else if (command === 'history') {
            setOutput({
                type: 'list',
                items: history.slice(-10).reverse() // Show last 10 commands
            });
            setTimeout(() => setOutput(null), 8000);
        } else if (command === 'whoami') {
            const name = config?.terminal?.username || config?.authorName || 'Visitor';
            setOutput({ type: 'text', message: `${name} exploring the digital space of ${config?.authorName || 'Aiyu'}` });
            setTimeout(() => setOutput(null), 5000);
        } else if (command === 'resume') {
            const resumeUrl = config?.resume?.type === 'file' ? '/api/resume' : (config?.resume?.value || '/api/resume');
            if (resumeUrl) {
                window.open(resumeUrl, '_blank');
                setOutput({ type: 'success', message: `Opening resume: ${resumeUrl}` });
            } else {
                setOutput({ type: 'error', message: 'Resume not found.' });
            }
            setTimeout(() => setOutput(null), 3000);
        } else if (command === 'email') {
            const email = config?.contactEmail || 'contact@aiyu.com';
            navigator.clipboard.writeText(email);
            setOutput({ type: 'success', message: `Email copied to clipboard: ${email}` });
            setTimeout(() => setOutput(null), 5000);
        } else if (command === 'socials') {
            const items = (socialData || [])
                .filter(s => s.url && !s.isHidden)
                .map(s => ({
                    cmd: s.name,
                    desc: s.url.replace(/^https?:\/\/(www\.)?/, '') // Cleaner display
                }));

            if (items.length === 0) {
                setOutput({ type: 'text', message: 'No social links found.' });
            } else {
                setOutput({
                    type: 'help',
                    items: items
                });
            }
            setTimeout(() => setOutput(null), 8000);
        } else if (command === 'sudo') {
            setOutput({ type: 'error', message: 'Permission denied: You need to be Aiyu to do that.' });
            setTimeout(() => setOutput(null), 5000);
        } else if (command === 'reboot') {
            setOutput({ type: 'warning', message: 'Rebooting system...' });
            setTimeout(() => window.location.reload(), 1000);
        } else if (command === 'help') {
            setOutput({
                type: 'help',
                items: [
                    { cmd: 'cd [path]', desc: 'Navigate directories' },
                    { cmd: 'ls', desc: 'List contents' },
                    { cmd: 'pwd', desc: 'Print working directory' },
                    { cmd: 'clear', desc: 'Clear output' },
                    { cmd: 'date', desc: 'Show current date' },
                    { cmd: 'whoami', desc: 'Display user info' },
                    { cmd: 'history', desc: 'Show command history' },
                    { cmd: 'resume', desc: 'Open resume' },
                    { cmd: 'email', desc: 'Get contact email' },
                    { cmd: 'socials', desc: 'List social links' },
                    { cmd: 'projects', desc: 'View projects' },
                    { cmd: 'theme [mode]', desc: 'Switch theme (light/dark)' },
                    { cmd: 'echo [text]', desc: 'Print text' },
                    { cmd: 'sysinfo', desc: 'System information' },
                    { cmd: 'joke', desc: 'Tell a joke' },
                    { cmd: 'ascii', desc: 'Show random ASCII art' },
                    { cmd: 'roll', desc: 'Roll a die' },
                    { cmd: 'flip', desc: 'Flip a coin' },
                    { cmd: 'magic8 [q]', desc: 'Ask the Magic 8-Ball' },
                    { cmd: 'disco', desc: 'Party mode!' },
                    { cmd: 'reboot', desc: 'Restart system' },
                ]
            });
            setTimeout(() => setOutput(null), 10000);
        } else if (command === 'theme') {
            if (!arg) {
                setOutput({ type: 'text', message: `Current theme: ${theme}. Usage: theme [light|dark]` });
            } else if (['light', 'dark'].includes(arg.toLowerCase())) {
                switchVariant(arg.toLowerCase());
                setOutput({ type: 'success', message: `Theme switched to ${arg.toLowerCase()}` });
            } else {
                setOutput({ type: 'error', message: `Invalid theme: ${arg}. Use 'light' or 'dark'.` });
            }
            setTimeout(() => setOutput(null), 3000);
        } else if (command === 'echo') {
            setOutput({ type: 'text', message: arg });
            setTimeout(() => setOutput(null), 5000);
        } else if (command === 'sysinfo') {
            const info = [
                `Host: ${window.location.hostname}`,
                `OS: ${navigator.platform}`,
                `Browser: ${navigator.appName}`,
                `Resolution: ${window.screen.width}x${window.screen.height}`,
                `Theme: ${theme}`,
            ];
            setOutput({ type: 'list', items: info });
            setTimeout(() => setOutput(null), 8000);
        } else if (command === 'joke') {
            const jokes = [
                "Why do programmers prefer dark mode? Because light attracts bugs.",
                "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
                "I walked into a bar, ran into a bar, and crawled into a bar. The bartender asked, 'Why the long interface?'",
                "There are 10 types of people in the world: those who understand binary, and those who don't.",
                "What is a programmer's favorite hangout place? Foo Bar."
            ];
            const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
            setOutput({ type: 'text', message: randomJoke });
            setTimeout(() => setOutput(null), 6000);
        } else if (command === 'projects') {
            router.push('/projects');
        } else if (command === 'ascii') {
            // Combine default ASCII arts with custom ones from config
            const customArts = config?.terminal?.asciiArts || [];
            const artList = [...ASCII_ARTS, ...customArts];
            const randomArt = artList[Math.floor(Math.random() * artList.length)];
            setOutput({ type: 'ascii', message: randomArt.art });
            setTimeout(() => setOutput(null), 5000);
        } else if (command === 'roll') {
            const roll = Math.floor(Math.random() * 6) + 1;
            setOutput({ type: 'success', message: `You rolled a ${roll} 🎲` });
            setTimeout(() => setOutput(null), 3000);
        } else if (command === 'flip') {
            const result = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🦅';
            setOutput({ type: 'success', message: `Coin flip: ${result}` });
            setTimeout(() => setOutput(null), 3000);
        } else if (command === 'magic8') {
            if (!arg) {
                setOutput({ type: 'text', message: 'Ask a question! Usage: magic8 [question]' });
            } else {
                const answers = ["Yes.", "No.", "Maybe.", "Ask again later.", "Definitely.", "Unlikely."];
                const answer = answers[Math.floor(Math.random() * answers.length)];
                setOutput({ type: 'text', message: `🎱 ${answer}` });
            }
            setTimeout(() => setOutput(null), 5000);
        } else if (command === 'disco') {
            setOutput({ type: 'success', message: '🕺 DISCO TIME! 🕺' });

            const presetValues = Object.values(themePresets);
            const duration = 800; // Time per theme
            const cycles = 5; // How many themes to cycle through
            const totalDuration = presetValues.length * duration;

            // Prevent rapid commands while discoing? Ideally yes, but let's keep it simple.

            let currentIndex = 0;
            const interval = setInterval(() => {
                const randomTheme = presetValues[Math.floor(Math.random() * presetValues.length)];
                // Use the current variant (light/dark) of the random theme
                const variantData = randomTheme.variants[theme] || randomTheme.variants['dark'];
                applyThemeColors(theme, variantData);
            }, 200); // Fast flashing

            setTimeout(() => {
                clearInterval(interval);
                // Revert to current active theme data which is managed by ThemeContext
                if (activeThemeData && activeThemeData.variants && activeThemeData.variants[theme]) {
                    applyThemeColors(theme, activeThemeData.variants[theme]);
                } else {
                    // Fallback to simpler switch if data isn't handy, though activeThemeData should be there
                    switchVariant(theme);
                }

                // Confetti explosion
                confetti({
                    particleCount: 200,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#C0C0C0'] // Gold and Silver primarily
                });

                setOutput(null);
            }, 3000); // Run disco for 3 seconds
        }
    };

    // Add to history function
    const addToHistory = (cmd) => {
        setHistory(prev => [...prev, cmd]);
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
            <span className="text-emerald-500 ml-1 mr-2 flex-shrink-0 font-bold select-none">
                {config?.terminal?.promptSymbol || '➜'}
            </span>

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
            {(config?.terminal?.showGitBranch !== false) && (
                <span className="ml-3 hidden sm:inline select-none" style={{ color: 'var(--text-secondary)' }}>
                    git:(master)
                </span>
            )}

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
                        {output.type === 'text' && (
                            <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{output.message}</div>
                        )}
                        {output.type === 'ascii' && (
                            <div style={{ color: 'var(--accent-pink)', whiteSpace: 'pre', lineHeight: '1.2' }}>{output.message}</div>
                        )}
                        {output.type === 'success' && (
                            <div style={{ color: 'var(--status-success)' }}>{output.message}</div>
                        )}
                        {output.type === 'warning' && (
                            <div style={{ color: 'var(--status-warning)' }}>{output.message}</div>
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
