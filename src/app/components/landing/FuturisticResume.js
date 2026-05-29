"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FaPlus, FaBolt, FaCode, FaTerminal, FaRobot, FaRocket, FaBrain } from "react-icons/fa6";
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import TypewriterEffect from '../shared/TypewriterEffect';
import { useTheme } from '../../context/ThemeContext';
import useDevicePerformance from '../../hooks/useDevicePerformance';

const ICON_MAP = {
    'FaBolt': FaBolt,
    'FaCode': FaCode,
    'FaTerminal': FaTerminal,
    'FaRobot': FaRobot,
    'FaRocket': FaRocket,
    'FaBrain': FaBrain
};

const parseCodeLine = (lineStr, githubLink) => {
    if (!lineStr) return <span>&nbsp;</span>;
    
    // Check if it's a comment line
    if (lineStr.trim().startsWith('//')) {
        return <span style={{ color: 'var(--syntax-comment)' }}>{lineStr}</span>;
    }

    // Tokenizer regex
    const regex = /("[^"]*"|'[^']*'|`[^`]*`|\/\/.*|\b(?:const|let|var|function|return|import|export|from|await|async|class|extends|default|if|else|for|while|new|try|catch|finally)\b|\b\d+(?:\.\d+)?\b|[+\-*\/=<>!&|^%~?:]|[{}()\[\].;,]|\b[a-zA-Z_]\w*\b|\s+)/g;

    const tokens = lineStr.split(regex);
    
    return (
        <span className="break-words whitespace-pre-wrap">
            {tokens.map((token, index) => {
                if (!token) return null;

                // Match strings
                if (/^("[^"]*"|'[^']*'|`[^`]*`)$/.test(token)) {
                    const stripped = token.replace(/['"`]/g, '');
                    if (stripped.startsWith('http') || stripped.includes('github.com')) {
                        return (
                            <a
                                key={index}
                                href={githubLink || stripped}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline transition-all"
                                style={{ color: 'var(--syntax-string)' }}
                            >
                                {token}
                            </a>
                        );
                    }
                    return <span key={index} style={{ color: 'var(--syntax-string)' }}>{token}</span>;
                }

                // Match inline comments
                if (token.startsWith('//')) {
                    return <span key={index} style={{ color: 'var(--syntax-comment)' }}>{token}</span>;
                }

                // Match keywords
                if (/^(const|let|var|function|return|import|export|from|await|async|class|extends|default|if|else|for|while|new|try|catch|finally)$/.test(token)) {
                    return <span key={index} style={{ color: 'var(--syntax-keyword)' }}>{token}</span>;
                }

                // Match numbers
                if (/^\d+(?:\.\d+)?$/.test(token)) {
                    return <span key={index} style={{ color: 'var(--syntax-number)' }}>{token}</span>;
                }

                // Match operators
                if (/^[+\-*\/=<>!&|^%~?:]+$/.test(token)) {
                    return <span key={index} style={{ color: 'var(--syntax-operator)' }}>{token}</span>;
                }

                // Match function calls or built-ins
                if (/^(console|log|alert|require|fetch|JSON|Math|Date|String|Number|Array|Object)$/.test(token)) {
                    return <span key={index} style={{ color: 'var(--syntax-function)' }}>{token}</span>;
                }

                // Match variables/identifiers
                if (/^[a-zA-Z_]\w*$/.test(token)) {
                    return <span key={index} style={{ color: 'var(--syntax-variable)' }}>{token}</span>;
                }

                // Default plain text
                return <span key={index} style={{ color: 'var(--text-primary)' }}>{token}</span>;
            })}
        </span>
    );
};

const FuturisticResume = ({ data }) => {
    const { theme } = useTheme();
    const { tier, prefersReducedMotion } = useDevicePerformance();
    const { name, homeRoles, githubLink, codeSnippets, resumeStatus, resumeMode, resumeIcon } = data || {};

    // Adaptive configuration based on device performance
    const config = useMemo(() => {
        if (prefersReducedMotion || tier === 'low') {
            return {
                enable3DTilt: false,
                enableTextRegeneration: false,
                enableMagneticIcon: false,
                enableScanline: false,
                enableMobileAutoAnimation: false,
                tiltStiffness: 100,
                tiltDamping: 30,
                mobileAnimationFps: 0,
            };
        } else if (tier === 'medium') {
            return {
                enable3DTilt: true,
                enableTextRegeneration: false, // throttled via callback
                enableMagneticIcon: true,
                enableScanline: true,
                enableMobileAutoAnimation: true,
                tiltStiffness: 80,
                tiltDamping: 40,
                mobileAnimationFps: 30, // Throttled
            };
        } else {
            return {
                enable3DTilt: true,
                enableTextRegeneration: true,
                enableMagneticIcon: true,
                enableScanline: true,
                enableMobileAutoAnimation: true,
                tiltStiffness: 100,
                tiltDamping: 30,
                mobileAnimationFps: 60, // Full
            };
        }
    }, [tier, prefersReducedMotion]);

    // Select the icon based on prop, default to Bolt
    const SelectedIcon = ICON_MAP[resumeIcon] || FaBolt;

    // Prepare dynamic editor lines to support scrolling & large content
    const editorLines = useMemo(() => {
        const lines = [];
        if (codeSnippets && Array.isArray(codeSnippets) && codeSnippets.length > 0) {
            codeSnippets.forEach((snippet) => {
                lines.push(snippet);
            });
        } else {
            lines.push("import { developer } from 'ayaan';");
            lines.push("import { build, deploy } from 'next';");
            lines.push("");
            lines.push("// Live learning & engineering protocol");
            lines.push("const executeLearningLoop = async () => {");
            lines.push("  while (developer.curiosityNeverSleeps) {");
            lines.push("    await build({ feature: 'innovation' });");
            lines.push("    await deploy({ speed: 'optimum' });");
            lines.push("  }");
            lines.push("};");
        }
        
        // Append githubLink assignment
        lines.push("");
        lines.push(`const githubLink = "${githubLink || 'https://github.com/aiyu-ayaan'}";`);
        
        return lines;
    }, [codeSnippets, githubLink]);

    // --- Live Diagnostics Telemetry Logic ---
    const [temp, setTemp] = useState(42);
    const [uptime, setUptime] = useState(0);
    const [fps, setFps] = useState(60.0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTemp(prev => {
                const change = Math.random() > 0.5 ? 1 : -1;
                const next = prev + change;
                return next >= 40 && next <= 48 ? next : prev;
            });
            setFps(prev => {
                const change = Math.random() > 0.5 ? 0.2 : -0.2;
                const next = parseFloat((prev + change).toFixed(1));
                return next >= 58.5 && next <= 60.0 ? next : prev;
            });
            setUptime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // --- Glitch & Tilt Card Logic ---
    const [text, setText] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef(null);
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    const KEYWORDS = ["REACT", "NEXTJS", "NODE", "DESIGN", "FUTURE", "CODE", "CREATE", "BUILD", "DEPLOY"];

    // Mouse position for gradient mask
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Motion values for 3D tilt and Magnetic Pull
    const x = useMotionValue(0); // -0.5 to 0.5
    const y = useMotionValue(0); // -0.5 to 0.5

    // Smooth spring animation for tilt - adaptive stiffness/damping
    const rotateX = useSpring(
        useTransform(y, [-0.5, 0.5], config.enable3DTilt ? [20, -20] : [0, 0]),
        { stiffness: config.tiltStiffness, damping: config.tiltDamping }
    );
    const rotateY = useSpring(
        useTransform(x, [-0.5, 0.5], config.enable3DTilt ? [-20, 20] : [0, 0]),
        { stiffness: config.tiltStiffness, damping: config.tiltDamping }
    );

    // Magnetic Icon Movement (moves MORE than the card tilt for parallax) - adaptive
    const iconX = useSpring(
        useTransform(x, [-0.5, 0.5], config.enableMagneticIcon ? [-30, 30] : [0, 0]),
        { stiffness: 150, damping: 20 }
    );
    const iconY = useSpring(
        useTransform(y, [-0.5, 0.5], config.enableMagneticIcon ? [-30, 30] : [0, 0]),
        { stiffness: 150, damping: 20 }
    );

    const generateRandomText = useCallback((length) => {
        let result = '';
        const charsLength = CHARS.length;

        // Strategy: Generate chunks of random noise, interspersed with keywords
        let currentLen = 0;
        while (currentLen < length) {
            // 5% chance to insert a keyword
            if (Math.random() < 0.05) {
                const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
                result += keyword;
                currentLen += keyword.length;
            } else {
                result += CHARS.charAt(Math.floor(Math.random() * charsLength));
                currentLen++;
            }
        }
        return result.substring(0, length);
    }, []);

    useEffect(() => {
        setText(generateRandomText(3000));
    }, [generateRandomText]);

    const handleMouseMove = (e) => {
        if (!containerRef.current || isTouch || !config.enable3DTilt) return;
        const rect = containerRef.current.getBoundingClientRect();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Update gradient position
        setMousePos({ x: mouseX, y: mouseY });

        // Calculate normalized position for tilt (-0.5 to 0.5)
        const normalizedX = (mouseX / rect.width) - 0.5;
        const normalizedY = (mouseY / rect.height) - 0.5;

        x.set(normalizedX);
        y.set(normalizedY);

        setIsHovering(true);
        // Regenerate text on move for "glitch" feel - only on high-end
        if (config.enableTextRegeneration) {
            setText(generateRandomText(3000));
        }
    };

    const handleMouseLeave = () => {
        if (isTouch) return;
        setIsHovering(false);
        x.set(0);
        y.set(0);
        // Reset text to standard state
        if (config.enableTextRegeneration) {
            setText(generateRandomText(3000));
        }
    };

    // --- Touch / Mobile Logic ---
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        // Simple touch detection
        const checkTouch = () => {
            setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };
        checkTouch();
        window.addEventListener('resize', checkTouch);
        return () => window.removeEventListener('resize', checkTouch);
    }, []);

    // Auto-animation for touch devices - adaptive
    useEffect(() => {
        if (!isTouch || !config.enableMobileAutoAnimation) return;

        setIsHovering(true); // Always active on mobile

        const startTime = Date.now();
        let lastFrameTime = 0;
        const frameInterval = config.mobileAnimationFps > 0 ? 1000 / config.mobileAnimationFps : 0;

        const animate = (currentTime) => {
            // Throttle based on target FPS
            if (frameInterval > 0 && currentTime - lastFrameTime < frameInterval) {
                requestAnimationFrame(animate);
                return;
            }
            lastFrameTime = currentTime;

            const elapsed = Date.now() - startTime;

            // Gentle 3D Float (Sine wave)
            const floatSpeed = 0.002;
            const newX = Math.sin(elapsed * floatSpeed) * 0.2; // +/- 0.2 tilt
            const newY = Math.cos(elapsed * floatSpeed * 0.8) * 0.2;

            x.set(newX);
            y.set(newY);

            // Auto-Scan Flashlight (Figure-8 pattern)
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const scanSpeed = 0.001;
                const activeX = (Math.sin(elapsed * scanSpeed) * 0.4 + 0.5) * rect.width;
                const activeY = (Math.cos(elapsed * scanSpeed * 0.7) * 0.4 + 0.5) * rect.height;
                setMousePos({ x: activeX, y: activeY });
            }

            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [isTouch, x, y, config.enableMobileAutoAnimation, config.mobileAnimationFps]);
    // -------------------------
    // -------------------------

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="min-h-screen flex flex-col items-center justify-center p-4 lg:p-8 relative transition-colors duration-300 overflow-hidden"
            style={{ backgroundColor: 'transparent' }}
        >
            {/* spacious floating container utilizing 80% margins with 1280px cap */}
            <div className="w-full max-w-[95%] lg:max-w-[80%] xl:max-w-7xl flex flex-col justify-center relative z-10">

                {/* --- Top Column: Personal Info & Diagnostics Telemetry --- */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10 w-full select-none"
                >
                    <div className="text-center lg:text-left">
                        <h1
                            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 tracking-tight"
                            style={{ color: 'var(--text-bright)' }}
                        >
                            {name || "Ayaan Ansari"}
                        </h1>
                        <TypewriterEffect roles={homeRoles || []} />
                    </div>

                    {/* Glowing Live Diagnostics Telemetry Panel */}
                    <div
                        className="rounded-xl border backdrop-blur-md relative overflow-hidden group flex items-center gap-6 p-4 w-full lg:w-auto min-w-[280px] lg:min-w-[360px] shadow-[0_0_20px_rgba(34,211,238,0.02)] hover:border-[var(--accent-cyan)] hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] transition-all duration-500 text-left"
                        style={{
                            backgroundColor: theme === 'dark' ? 'rgba(13, 17, 23, 0.45)' : 'rgba(255, 255, 255, 0.65)',
                            borderColor: 'var(--border-secondary)',
                        }}
                    >
                        {/* Status Pulse dot */}
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-cyan)] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[var(--accent-cyan)] shadow-[0_0_12px_var(--accent-cyan)]"></span>
                            </span>
                            <div className="h-8 w-px bg-white/10" />
                        </div>
                        
                        {/* Live dynamic metrics readout */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[10px] tracking-widest text-[var(--text-secondary)] flex-grow">
                            <div>SYS_TEMP: <span className="text-[var(--text-bright)] font-bold">{temp}°C</span></div>
                            <div>SYS_FPS: <span className="text-[var(--accent-pink-bright)] font-bold">{fps} FPS</span></div>
                            <div>CORE_UPTIME: <span className="text-[var(--accent-purple)] font-bold">{uptime}s</span></div>
                            <div>ENGINE: <span className="text-[var(--syntax-keyword)] font-bold">V8_N16_R19</span></div>
                        </div>

                        {/* Visual cyber design highlight */}
                        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none pr-1 pb-1">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z" />
                            </svg>
                        </div>
                    </div>
                </motion.div>

                {/* --- Cards Workspace Grid: Perfectly Symmetric Side-by-Side --- */}
                <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 lg:gap-16 xl:gap-24 w-full">

                    {/* --- Left Panel: macOS IDE Mockup Card (Symmetric 450px height) --- */}
                    <motion.div
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="flex-1 max-w-lg lg:max-w-[700px] w-full relative"
                    >
                        <motion.div
                            className="rounded-2xl border backdrop-blur-sm relative overflow-hidden group w-full h-[450px] flex flex-col justify-between transition-all duration-500 hover:border-[var(--accent-cyan)] hover:shadow-[0_0_45px_rgba(34,211,238,0.15)]"
                            style={{
                                backgroundColor: theme === 'dark' ? 'rgba(13, 17, 23, 0.7)' : 'rgba(255, 255, 255, 0.8)',
                                borderColor: 'var(--border-secondary)',
                                boxShadow: theme === 'dark'
                                    ? '0 0 30px rgba(34, 211, 238, 0.05), inset 0 0 20px rgba(255,255,255,0.02)'
                                    : '0 10px 30px rgba(0, 0, 0, 0.05), inset 0 0 20px rgba(255,255,255,0.5)'
                            }}
                        >
                            {/* Sweeping shimmer hover reflection overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1200ms] pointer-events-none z-30" />
                            {/* Custom thin scrollbar style */}
                            <style>{`
                                .custom-editor-scroll::-webkit-scrollbar {
                                    width: 5px;
                                    height: 5px;
                                }
                                .custom-editor-scroll::-webkit-scrollbar-track {
                                    background: transparent;
                                }
                                .custom-editor-scroll::-webkit-scrollbar-thumb {
                                    background: rgba(34, 211, 238, 0.15);
                                    border-radius: 4px;
                                }
                                .custom-editor-scroll::-webkit-scrollbar-thumb:hover {
                                    background: rgba(34, 211, 238, 0.35);
                                }
                                .custom-editor-scroll {
                                    scrollbar-width: thin;
                                    scrollbar-color: rgba(34, 211, 238, 0.15) transparent;
                                }
                            `}</style>

                            {/* Top macOS-style window header bar */}
                            <div className="relative flex items-center h-10 px-4 border-b select-none flex-shrink-0" style={{
                                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'var(--border-primary)',
                                backgroundColor: theme === 'dark' ? 'rgba(10, 15, 25, 0.5)' : 'rgba(241, 245, 249, 0.85)'
                            }}>
                                {/* Window Dots */}
                                <div className="flex items-center space-x-1.5 z-10">
                                    <span className="w-3 h-3 rounded-full bg-[#ff5f56] block opacity-90"></span>
                                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e] block opacity-90"></span>
                                    <span className="w-3 h-3 rounded-full bg-[#27c93f] block opacity-90"></span>
                                </div>
                                {/* Centered Tab Title */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="flex items-center space-x-1.5 text-xs font-mono text-[var(--text-secondary)]">
                                        <span className="text-[var(--accent-cyan)] font-bold opacity-80">&gt;_</span>
                                        <span className="opacity-90">developer.js</span>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Code Block Editor - precisely 290px tall */}
                            <div className="custom-editor-scroll overflow-y-auto h-[290px] p-6 text-left select-text flex-grow">
                                <div className="grid grid-cols-[auto_1fr] gap-x-4 font-mono text-xs sm:text-sm leading-relaxed">
                                    {editorLines.map((line, index) => (
                                        <React.Fragment key={index}>
                                            {/* Line Number Gutter */}
                                            <span className="text-right select-none opacity-25 font-mono text-[var(--text-secondary)] min-w-[1.25rem] pr-1">
                                                {index + 1}
                                            </span>
                                            {/* Line Content */}
                                             <span className="font-mono min-w-0">
                                                 {parseCodeLine(line, githubLink)}
                                             </span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Dashed Line Separator */}
                            <div className="border-t border-dashed mx-6 flex-shrink-0" style={{
                                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'var(--border-primary)'
                            }}></div>

                            {/* Connection & Mode bottom cards - precisely 120px tall including padding */}
                            <div className="p-6 pt-4 h-[120px] grid grid-cols-2 gap-4 flex-shrink-0">
                                {/* CONNECTION STATUS */}
                                <div className="p-4 rounded-xl border flex flex-col justify-between"
                                    style={{
                                        backgroundColor: theme === 'dark' ? 'rgba(10, 25, 41, 0.35)' : 'rgba(241, 245, 249, 0.6)',
                                        borderColor: theme === 'dark' ? 'rgba(34, 211, 238, 0.06)' : 'var(--border-primary)',
                                    }}
                                >
                                    <span className="text-[9px] sm:text-[10px] font-mono font-semibold uppercase tracking-wider opacity-50" style={{ color: 'var(--text-secondary)' }}>
                                        CONNECTION STATUS
                                    </span>
                                    <span className="text-xs sm:text-sm font-mono font-bold mt-1.5" style={{ color: 'var(--syntax-string)' }}>
                                        {resumeStatus || 'ONLINE'}
                                    </span>
                                </div>

                                {/* OPERATION MODE */}
                                <div className="p-4 rounded-xl border flex flex-col justify-between"
                                    style={{
                                        backgroundColor: theme === 'dark' ? 'rgba(10, 25, 41, 0.35)' : 'rgba(241, 245, 249, 0.6)',
                                        borderColor: theme === 'dark' ? 'rgba(34, 211, 238, 0.06)' : 'var(--border-primary)',
                                    }}
                                >
                                    <span className="text-[9px] sm:text-[10px] font-mono font-semibold uppercase tracking-wider opacity-50" style={{ color: 'var(--text-secondary)' }}>
                                        OPERATION MODE
                                    </span>
                                    <span className="text-xs sm:text-sm font-mono font-bold mt-1.5" style={{ color: 'var(--accent-cyan)' }}>
                                        {resumeMode || 'DEV_01'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* --- Right Column: Enhanced Futuristic Glitch Card (Symmetric 450px height) --- */}
                    <div className="flex-shrink-0 order-2 perspective-1000">
                        <motion.div
                            ref={containerRef}
                            style={{
                                rotateX: config.enable3DTilt ? rotateX : 0,
                                rotateY: config.enable3DTilt ? rotateY : 0,
                                transformStyle: config.enable3DTilt ? "preserve-3d" : "flat",
                            }}
                            className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[450px] md:h-[450px] flex items-center justify-center cursor-pointer"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                        >
                            {/* 1. Glassmorphism Card Frame */}
                            <div
                                className="absolute inset-0 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300"
                                style={{
                                    backgroundColor: theme === 'dark' 
                                        ? (isHovering ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)') 
                                        : (isHovering ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)'),
                                    borderColor: isHovering ? 'var(--accent-cyan)' : 'var(--border-secondary)',
                                    boxShadow: isHovering 
                                        ? '0 0 50px var(--shadow-glow)' 
                                        : (theme === 'dark' ? '0 0 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.05)')
                                }}
                            >
                                {/* Inner Grid Texture */}
                                <div
                                    className="absolute inset-0 opacity-20 rounded-2xl"
                                    style={{
                                        backgroundImage: `linear-gradient(var(--border-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--border-secondary) 1px, transparent 1px)`,
                                        backgroundSize: '40px 40px'
                                    }}
                                />

                                {/* Active Scanline Effect - adaptive */}
                                {config.enableScanline && isHovering && (
                                    <motion.div
                                        className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 z-20"
                                        animate={{ top: ["0%", "100%"] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    />
                                )}
                            </div>

                            {/* 2. Extended Cinematic Lines (Fading Gradients) */}
                            <div className="absolute top-1/2 left-[-100vh] right-[-100vh] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none transform -translate-y-1/2 transition-opacity duration-300"
                                style={{ opacity: isHovering ? 1 : 0.3 }}></div>
                            <div className="absolute left-1/2 top-[-100vh] bottom-[-100vh] w-[1px] bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent pointer-events-none transform -translate-x-1/2 transition-opacity duration-300"
                                style={{ opacity: isHovering ? 1 : 0.3 }}></div>


                            {/* 3. Corner Accents - Theme Aware */}
                            <FaPlus className="absolute -top-3 -left-3 text-2xl transition-all duration-300" style={{ color: isHovering ? 'var(--accent-cyan)' : 'var(--text-tertiary)', opacity: isHovering ? 1 : 0.5 }} />
                            <FaPlus className="absolute -top-3 -right-3 text-2xl transition-all duration-300" style={{ color: isHovering ? 'var(--accent-cyan)' : 'var(--text-tertiary)', opacity: isHovering ? 1 : 0.5 }} />
                            <FaPlus className="absolute -bottom-3 -left-3 text-2xl transition-all duration-300" style={{ color: isHovering ? 'var(--accent-cyan)' : 'var(--text-tertiary)', opacity: isHovering ? 1 : 0.5 }} />
                            <FaPlus className="absolute -bottom-3 -right-3 text-2xl transition-all duration-300" style={{ color: isHovering ? 'var(--accent-cyan)' : 'var(--text-tertiary)', opacity: isHovering ? 1 : 0.5 }} />

                            {/* 4. Text Layer with Theme Color Gradient Mask & Flashlight Reveal */}
                            <div
                                className="absolute inset-6 overflow-hidden break-all text-[10px] sm:text-xs leading-none pointer-events-none select-none z-10 font-bold"
                                style={{
                                    opacity: isHovering ? 1 : 0,
                                    transition: 'opacity 0.2s ease',
                                    fontFamily: "'Fira Code', monospace",
                                    color: 'transparent',
                                    backgroundImage: isHovering ? `radial-gradient(
                                        300px circle at ${mousePos.x}px ${mousePos.y}px, 
                                        var(--accent-cyan),
                                        var(--accent-purple),
                                        transparent
                                    )` : 'none',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    maskImage: isHovering ? `radial-gradient(
                                        circle at ${mousePos.x}px ${mousePos.y}px,
                                        black 40%,
                                        transparent 70%
                                    )` : 'none',
                                    WebkitMaskImage: isHovering ? `radial-gradient(
                                        circle at ${mousePos.x}px ${mousePos.y}px,
                                        black 40%,
                                        transparent 70%
                                    )` : 'none',
                                }}
                            >
                                {text}
                            </div>

                            {/* 5. Central Bolt Element - Floating & Magnetic */}
                            <motion.div
                                className="relative z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center backdrop-blur-xl border pointer-events-none"
                                style={{
                                    x: config.enableMagneticIcon ? iconX : 0,
                                    y: config.enableMagneticIcon ? iconY : 0,
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderColor: isHovering ? 'var(--accent-cyan)' : 'var(--border-secondary)',
                                    transform: config.enable3DTilt ? "translateZ(80px)" : "none", // More depth
                                    boxShadow: isHovering 
                                        ? '0 0 40px var(--shadow-glow)' 
                                        : (theme === 'dark' ? '0 0 20px rgba(0,0,0,0.5)' : '0 10px 20px rgba(0,0,0,0.05)')
                                }}
                            >
                                <div
                                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--bg-surface)' }}
                                >
                                    <SelectedIcon
                                        className={`text-3xl sm:text-4xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-300 ${isHovering ? 'text-[var(--accent-cyan)] scale-110' : 'text-[var(--text-secondary)]'}`}
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>

                </div>
            </div>
        </motion.div>
    );
};

export default FuturisticResume;

