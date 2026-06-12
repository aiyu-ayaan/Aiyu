"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { FaBolt, FaCode, FaTerminal, FaRobot, FaRocket, FaBrain } from "react-icons/fa6";
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import TypewriterEffect from '../shared/TypewriterEffect';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { gsap, useGSAP } from '../shared/gsapScroll';

const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

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
    const { tier, prefersReducedMotion } = useDevicePerformance();
    const { name, homeRoles, githubLink, codeSnippets, resumeStatus, resumeMode, resumeIcon } = data || {};

    const heroRef = useRef(null);

    // Adaptive configuration based on device performance
    const config = useMemo(() => {
        if (prefersReducedMotion || tier === 'low') {
            return {
                enable3DTilt: false,
                enableTextRegeneration: false,
                enableMagneticIcon: false,
                enableScanline: false,
                enableMobileAutoAnimation: false,
                enableScene: false,
                enableScrollFx: false,
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
                enableScene: true,
                enableScrollFx: true,
                sceneQuality: 'medium',
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
                enableScene: true,
                enableScrollFx: true,
                sceneQuality: 'high',
                tiltStiffness: 100,
                tiltDamping: 30,
                mobileAnimationFps: 60, // Full
            };
        }
    }, [tier, prefersReducedMotion]);

    // Select the icon based on prop, default to Bolt
    const SelectedIcon = ICON_MAP[resumeIcon] || FaBolt;

    const displayName = name || "Ayaan Ansari";

    // GSAP choreography: 3D entrance timeline, then a scroll-scrubbed "depth
    // exit" where the two cards swing apart as the hero leaves the viewport.
    useGSAP(() => {
        if (prefersReducedMotion) return;

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.hero-name-char', {
            autoAlpha: 0,
            yPercent: 70,
            rotateX: -90,
            transformPerspective: 600,
            duration: 0.8,
            stagger: 0.035,
        })
            .from('.hero-typewriter', { autoAlpha: 0, y: 24, duration: 0.6 }, '-=0.45')
            .from('.hero-telemetry', {
                autoAlpha: 0,
                rotateY: -32,
                z: -90,
                transformPerspective: 900,
                duration: 0.8,
            }, '-=0.45')
            .from('.hero-ide-card', {
                autoAlpha: 0,
                x: -90,
                rotateY: 26,
                z: -140,
                transformPerspective: 1200,
                duration: 1,
            }, '-=0.5')
            .from('.hero-glitch-wrap', {
                autoAlpha: 0,
                x: 90,
                rotateY: -26,
                z: -140,
                transformPerspective: 1200,
                duration: 1,
            }, '-=0.85')
            .from('.hero-scroll-cue', { autoAlpha: 0, y: -14, duration: 0.5 }, '-=0.4');

        if (config.enableScrollFx && heroRef.current) {
            // The scrub targets only the stage wrapper (which the intro
            // timeline never touches) with explicit fromTo end points, so
            // start values can never be captured mid-intro and the effect is
            // fully reversible when scrolling back up.
            gsap.fromTo('.hero-stage', {
                yPercent: 0,
                scale: 1,
                rotateX: 0,
                autoAlpha: 1,
            }, {
                yPercent: -8,
                scale: 0.93,
                rotateX: 7,
                autoAlpha: 0.25,
                transformOrigin: 'center top',
                transformPerspective: 1400,
                ease: 'none',
                immediateRender: false,
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: 'top top',
                    end: 'bottom 30%',
                    scrub: 0.4,
                },
            });
            gsap.fromTo('.hero-scroll-cue', { autoAlpha: 1 }, {
                autoAlpha: 0,
                ease: 'none',
                immediateRender: false,
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: 'top top',
                    end: '12% top',
                    scrub: true,
                },
            });
        }
    }, { scope: heroRef, dependencies: [prefersReducedMotion, config.enableScrollFx] });

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
        <div
            ref={heroRef}
            className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-24 transition-colors duration-300 sm:px-6 lg:px-8"
            style={{ backgroundColor: 'transparent' }}
        >
            {/* three.js particle nebula backdrop (lazy, perf-gated) */}
            {config.enableScene && <HeroScene quality={config.sceneQuality} />}

            {/* spacious floating container utilizing 80% margins with 1280px cap */}
            <div
                className="pointer-events-none absolute left-1/2 top-20 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--text-bright) 12%, var(--accent-cyan)), transparent 70%)', opacity: 0.26 }}
            />

            <div className="hero-stage relative z-10 flex w-full max-w-[95%] flex-col justify-center lg:max-w-[80%]">

                {/* --- Hero Head: centered large-type introduction --- */}
                <div className="hero-head mb-14 flex w-full select-none flex-col items-center gap-6 text-center lg:mb-18">
                    <div className="flex flex-col items-center gap-4">
                        <p className="eyebrow">Portfolio</p>
                        <h1
                            aria-label={displayName}
                            className="headline-hero"
                            style={{ perspective: '600px' }}
                        >
                            {displayName.split('').map((char, index) => (
                                <span
                                    key={index}
                                    aria-hidden="true"
                                    className="hero-name-char inline-block"
                                    style={{ transformOrigin: '50% 85%' }}
                                >
                                    {char === ' ' ? ' ' : char}
                                </span>
                            ))}
                        </h1>
                        <div className="hero-typewriter">
                            <TypewriterEffect roles={homeRoles || []} />
                        </div>
                    </div>

                    {/* Live telemetry condensed into a quiet glass strip */}
                    <div className="hero-telemetry glass-tile flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 py-3">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: 'var(--status-success)' }}></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--status-success)' }}></span>
                        </span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                            Temp <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{temp}°C</span>
                        </span>
                        <span className="hidden h-3 w-px sm:block" style={{ backgroundColor: 'var(--hairline-strong)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                            Render <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fps} fps</span>
                        </span>
                        <span className="hidden h-3 w-px sm:block" style={{ backgroundColor: 'var(--hairline-strong)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                            Uptime <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{uptime}s</span>
                        </span>
                        <span className="hidden h-3 w-px sm:block" style={{ backgroundColor: 'var(--hairline-strong)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                            Engine <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>V8_N16_R19</span>
                        </span>
                    </div>
                </div>

                {/* --- Cards Workspace Grid: Perfectly Symmetric Side-by-Side --- */}
                <div className="grid w-full items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.82fr)] lg:gap-12 xl:gap-16" style={{ perspective: '1600px' }}>

                    {/* --- Left Panel: macOS IDE Mockup Card (Symmetric 450px height) --- */}
                    <div className="hero-ide-card relative w-full">
                        <motion.div
                            className="glass-panel group relative flex h-[450px] w-full flex-col justify-between overflow-hidden"
                        >
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
                            <div className="relative flex items-center h-11 px-4 border-b select-none flex-shrink-0" style={{
                                borderColor: 'var(--hairline)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 55%, transparent)',
                            }}>
                                {/* Window Dots */}
                                <div className="flex items-center space-x-1.5 z-10">
                                    <span className="w-3 h-3 rounded-full bg-[#ff5f56] block opacity-90"></span>
                                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e] block opacity-90"></span>
                                    <span className="w-3 h-3 rounded-full bg-[#27c93f] block opacity-90"></span>
                                </div>
                                {/* Centered Tab Title */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>developer.js</span>
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

                            {/* Hairline Separator */}
                            <div className="border-t mx-6 flex-shrink-0" style={{ borderColor: 'var(--hairline)' }}></div>

                            {/* Connection & Mode bottom cards - precisely 120px tall including padding */}
                            <div className="p-6 pt-4 h-[120px] grid grid-cols-2 gap-4 flex-shrink-0">
                                {/* CONNECTION STATUS */}
                                <div className="p-4 rounded-2xl border flex flex-col justify-between"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 45%, transparent)',
                                        borderColor: 'var(--hairline)',
                                    }}
                                >
                                    <span className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                                        Connection
                                    </span>
                                    <span className="text-xs sm:text-sm font-semibold mt-1.5 inline-flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--status-success)' }} />
                                        {resumeStatus || 'ONLINE'}
                                    </span>
                                </div>

                                {/* OPERATION MODE */}
                                <div className="p-4 rounded-2xl border flex flex-col justify-between"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 45%, transparent)',
                                        borderColor: 'var(--hairline)',
                                    }}
                                >
                                    <span className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                                        Mode
                                    </span>
                                    <span className="text-xs sm:text-sm font-semibold mt-1.5" style={{ color: 'var(--text-primary)' }}>
                                        {resumeMode || 'DEV_01'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* --- Right Column: Enhanced Futuristic Glitch Card (Symmetric 450px height) --- */}
                    <div className="hero-glitch-wrap order-2 flex justify-center perspective-1000 lg:justify-end">
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
                            {/* 1. Glass Card Frame */}
                            <div
                                className="absolute inset-0 backdrop-blur-xl transition-all duration-500"
                                style={{
                                    borderRadius: 'var(--radius-panel)',
                                    border: '1px solid',
                                    background: `linear-gradient(180deg,
                                        color-mix(in srgb, var(--bg-surface) ${isHovering ? 72 : 58}%, transparent),
                                        color-mix(in srgb, var(--bg-secondary) ${isHovering ? 64 : 50}%, transparent))`,
                                    borderColor: isHovering ? 'var(--hairline-strong)' : 'var(--hairline)',
                                    boxShadow: isHovering
                                        ? '0 32px 80px -28px var(--shadow-md)'
                                        : 'var(--shadow-panel)',
                                }}
                            >
                                {/* Soft top light, like glass catching the light */}
                                <div
                                    className="absolute inset-x-8 top-0 h-px"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--text-bright) 28%, transparent), transparent)',
                                        opacity: isHovering ? 0.9 : 0.45,
                                        transition: 'opacity 0.4s ease',
                                    }}
                                />
                            </div>

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
                                        color-mix(in srgb, var(--text-bright) 85%, transparent),
                                        color-mix(in srgb, var(--text-tertiary) 60%, transparent),
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

                            {/* 5. Central Icon Element - Floating & Magnetic */}
                            <motion.div
                                className="relative z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-[1.75rem] flex items-center justify-center backdrop-blur-xl border pointer-events-none"
                                style={{
                                    x: config.enableMagneticIcon ? iconX : 0,
                                    y: config.enableMagneticIcon ? iconY : 0,
                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                                    borderColor: isHovering ? 'var(--hairline-strong)' : 'var(--hairline)',
                                    transform: config.enable3DTilt ? "translateZ(80px)" : "none", // More depth
                                    boxShadow: '0 18px 44px -16px var(--shadow-md)',
                                }}
                            >
                                <div
                                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
                                        borderColor: 'var(--hairline)',
                                    }}
                                >
                                    <SelectedIcon
                                        className={`text-3xl sm:text-4xl transition-all duration-300 ${isHovering ? 'scale-110' : ''}`}
                                        style={{ color: isHovering ? 'var(--text-bright)' : 'var(--text-secondary)' }}
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>

                </div>
            </div>

            {/* Scroll cue */}
            <div className="hero-scroll-cue pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-tertiary)' }}>
                    Scroll
                </span>
                <span
                    className="block h-9 w-px animate-pulse"
                    style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--text-bright) 55%, transparent), transparent)' }}
                />
            </div>
        </div>
    );
};

export default FuturisticResume;
