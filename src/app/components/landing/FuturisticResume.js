"use client";
import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaBolt } from "react-icons/fa6";
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import TypewriterEffect from '../shared/TypewriterEffect';
import { useTheme } from '../../context/ThemeContext';

const FuturisticResume = ({ data }) => {
    const { theme } = useTheme();
    const { name, homeRoles, githubLink, codeSnippets } = data || {};

    // --- Glitch & Tilt Card Logic ---
    const [text, setText] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef(null);
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    // Mouse position for gradient mask
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Motion values for 3D tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth spring animation for tilt
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), { stiffness: 150, damping: 20 });

    const generateRandomText = (length) => {
        let result = '';
        const charsLength = CHARS.length;
        for (let i = 0; i < length; i++) {
            result += CHARS.charAt(Math.floor(Math.random() * charsLength));
        }
        return result;
    };

    useEffect(() => {
        setText(generateRandomText(4000));
    }, []);

    const handleMouseMove = (e) => {
        if (!containerRef.current) return;
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
        setText(generateRandomText(4000));
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        x.set(0);
        y.set(0);
    };
    // -------------------------

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8 relative transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg-primary)' }}
        >
            {/* Animated background gradient blobs */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div
                    className="absolute top-10 left-10 w-96 h-96 rounded-full mix-blend-screen filter blur-3xl animate-blob"
                    style={{ backgroundColor: 'var(--accent-cyan)', opacity: 0.5 }}
                ></div>
                <div
                    className="absolute bottom-10 right-10 w-96 h-96 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"
                    style={{ backgroundColor: 'var(--accent-pink)', opacity: 0.5 }}
                ></div>
            </div>

            <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">

                {/* --- Left Column: Personal Info --- */}
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="flex-1 text-center lg:text-left order-1 max-w-lg relative"
                >
                    <motion.h1
                        className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        {name || "Ayaan Ansari"}
                    </motion.h1>

                    <div className="mb-8">
                        <TypewriterEffect roles={homeRoles || []} />
                    </div>

                    <motion.div
                        className="p-6 rounded-xl border backdrop-blur-sm relative overflow-hidden group"
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-secondary)'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                        <div className="space-y-2 font-mono text-xs sm:text-sm text-left">
                            {codeSnippets && codeSnippets.map((snippet, index) => (
                                <p key={index} style={{ color: 'var(--text-secondary)' }}>{`// ${snippet}`}</p>
                            ))}
                            <p className="break-all mt-4 pt-4 border-t border-dashed" style={{ borderColor: 'var(--border-secondary)' }}>
                                <span style={{ color: 'var(--accent-purple)' }}>const</span>{' '}
                                <span style={{ color: 'var(--accent-orange)' }}>githubLink</span>{' '}
                                <span style={{ color: 'var(--text-primary)' }}>=</span>{' '}
                                <span style={{ color: 'var(--accent-cyan)' }}>{`"${githubLink || '#'}"`}</span>
                            </p>
                        </div>
                    </motion.div>
                </motion.div>

                {/* --- Right Column: Enhanced Futuristic Glitch Card --- */}
                <div className="flex-shrink-0 order-2 perspective-1000">
                    <motion.div
                        ref={containerRef}
                        style={{
                            rotateX,
                            rotateY,
                            transformStyle: "preserve-3d",
                        }}
                        className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[450px] md:h-[450px] flex items-center justify-center"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* 1. Glassmorphism Card Frame */}
                        <div
                            className="absolute inset-0 rounded-xl border backdrop-blur-md shadow-2xl transition-colors duration-300"
                            style={{
                                backgroundColor: isHovering ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
                                borderColor: 'var(--border-cyan)', // Using theme border
                                boxShadow: isHovering ? '0 0 50px var(--shadow-glow)' : '0 0 30px rgba(0,0,0,0.5)'
                            }}
                        >
                            {/* Inner Grid Texture */}
                            <div
                                className="absolute inset-0 opacity-20"
                                style={{
                                    backgroundImage: `linear-gradient(var(--border-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--border-secondary) 1px, transparent 1px)`,
                                    backgroundSize: '40px 40px'
                                }}
                            />
                        </div>

                        {/* 2. Extended Cinematic Lines (Fading Gradients) */}
                        <div className="absolute top-1/2 left-[-100vh] right-[-100vh] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none transform -translate-y-1/2"></div>
                        <div className="absolute left-1/2 top-[-100vh] bottom-[-100vh] w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent pointer-events-none transform -translate-x-1/2"></div>

                        {/* 3. Corner Accents - Theme Aware */}
                        <FaPlus className="absolute -top-3 -left-3 text-2xl animate-pulse" style={{ color: 'var(--accent-cyan)' }} />
                        <FaPlus className="absolute -top-3 -right-3 text-2xl animate-pulse delay-75" style={{ color: 'var(--accent-cyan)' }} />
                        <FaPlus className="absolute -bottom-3 -left-3 text-2xl animate-pulse delay-150" style={{ color: 'var(--accent-cyan)' }} />
                        <FaPlus className="absolute -bottom-3 -right-3 text-2xl animate-pulse delay-300" style={{ color: 'var(--accent-cyan)' }} />

                        {/* 4. Text Layer with Theme Color Gradient Mask */}
                        <div
                            className="absolute inset-6 overflow-hidden break-all text-[10px] sm:text-xs leading-none pointer-events-none select-none transition-opacity duration-300 z-10"
                            style={{
                                opacity: isHovering ? 1 : 0.15, // Visible but faint when not hovering
                                fontFamily: "'Fira Code', monospace",
                                color: isHovering ? 'transparent' : 'var(--text-tertiary)',
                                backgroundImage: isHovering ? `radial-gradient(
                                    350px circle at ${mousePos.x}px ${mousePos.y}px, 
                                    var(--accent-cyan),
                                    var(--accent-purple),
                                    transparent
                                )` : 'none',
                                backgroundClip: isHovering ? 'text' : 'border-box',
                                WebkitBackgroundClip: isHovering ? 'text' : 'border-box',
                            }}
                        >
                            {text}
                        </div>

                        {/* 5. Central Bolt Element - Floating 3D */}
                        <motion.div
                            className="relative z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center backdrop-blur-xl border pointer-events-none"
                            style={{
                                backgroundColor: 'var(--bg-elevated)',
                                borderColor: 'var(--accent-cyan)',
                                transform: "translateZ(50px)", // Push it forward in 3D space
                                boxShadow: '0 0 30px var(--shadow-glow)'
                            }}
                            animate={{
                                y: [0, -10, 0],
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <div
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: 'var(--bg-surface)' }}
                            >
                                <FaBolt className="text-3xl sm:text-4xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ color: 'var(--accent-cyan)' }} />
                            </div>
                        </motion.div>

                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default FuturisticResume;
