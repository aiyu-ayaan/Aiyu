"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import useDevicePerformance from '../../hooks/useDevicePerformance';

const SpaceBackground = () => {
    const { tier, prefersReducedMotion } = useDevicePerformance();

    // Adaptive configuration based on device performance
    const config = useMemo(() => {
        if (prefersReducedMotion || tier === 'low') {
            return {
                starCount: 6,
                enableShootingStars: false,
                enableMouseTracking: false,
                enableAmbientGlow: false,
                enableAnimatedGrid: false,
                enableNebulaDrift: false,
                enableDustDrift: false,
                blurAmount: 30,
            };
        } else if (tier === 'medium') {
            return {
                starCount: 14,
                enableShootingStars: true,
                enableMouseTracking: false,
                enableAmbientGlow: true,
                enableAnimatedGrid: false,
                enableNebulaDrift: true,
                enableDustDrift: false,
                blurAmount: 60,
            };
        } else {
            return {
                starCount: 24,
                enableShootingStars: true,
                enableMouseTracking: true,
                enableAmbientGlow: true,
                enableAnimatedGrid: true,
                enableNebulaDrift: true,
                enableDustDrift: true,
                blurAmount: 120,
            };
        }
    }, [tier, prefersReducedMotion]);

    // Generate random stars on client side to avoid hydration mismatch
    const [stars, setStars] = useState([]);
    const [shootingStars, setShootingStars] = useState([]);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
    const rafRef = useRef(null);

    useEffect(() => {
        // Static stars
        const generatedStars = [...Array(config.starCount)].map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            opacity: Math.random(),
            delay: Math.random() * 5,
            duration: Math.random() * 3 + 2,
        }));
        setStars(generatedStars);
    }, [config.starCount]);

    useEffect(() => {
        if (!config.enableMouseTracking) return;

        const nextPos = { x: 50, y: 50 };

        const handleMouseMove = (e) => {
            nextPos.x = (e.clientX / window.innerWidth) * 100;
            nextPos.y = (e.clientY / window.innerHeight) * 100;

            if (rafRef.current !== null) return;
            rafRef.current = window.requestAnimationFrame(() => {
                setMousePos({ x: nextPos.x, y: nextPos.y });
                rafRef.current = null;
            });
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [config.enableMouseTracking]);

    useEffect(() => {
        if (!config.enableShootingStars) return;

        // Shooting stars loop
        const interval = setInterval(() => {
            if (Math.random() > 0.85) { // 15% chance to spawn a shooting star
                const newStar = {
                    id: Date.now(),
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                    angle: Math.random() * 45 + 135, // Moving down-right roughly
                };
                setShootingStars(prev => [...prev.slice(-4), newStar]);

                // Cleanup old shooting stars
                setTimeout(() => {
                    setShootingStars(prev => prev.filter(s => s.id !== newStar.id));
                }, 2000);
            }
        }, 2500);

        return () => clearInterval(interval);
    }, [config.enableShootingStars]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* 0. Multi-layer base atmosphere (cheap static CSS gradients) */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        radial-gradient(42% 38% at 16% 18%, color-mix(in srgb, var(--accent-cyan) 20%, transparent), transparent 72%),
                        radial-gradient(40% 34% at 84% 20%, color-mix(in srgb, var(--accent-purple) 18%, transparent), transparent 74%),
                        radial-gradient(45% 40% at 52% 90%, color-mix(in srgb, var(--accent-pink) 14%, transparent), transparent 75%),
                        linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 62%, var(--bg-primary)) 0%, var(--bg-primary) 100%)
                    `,
                }}
            />

            {/* 0.5 Subtle dust texture */}
            <motion.div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--text-muted) 45%, transparent) 1px, transparent 0)',
                    backgroundSize: '3px 3px',
                }}
                animate={config.enableDustDrift && !prefersReducedMotion ? { x: [0, -20, 0], y: [0, 10, 0] } : {}}
                transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
            />

            {/* 1. Deep Space Gradient - Dynamic based on mouse (high-end only) */}
            {config.enableMouseTracking ? (
                <motion.div
                    className="absolute inset-0 opacity-40"
                    animate={{
                        background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, var(--bg-elevated) 0%, var(--bg-primary) 60%)`
                    }}
                    transition={{ type: "tween", ease: "linear", duration: 0.2 }}
                />
            ) : (
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, var(--bg-elevated) 0%, var(--bg-primary) 60%)`
                    }}
                />
            )}

            {/* 2. Animated Grid (Cyber Floor) - High-end only */}
            {config.enableAnimatedGrid && (
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: `
                            linear-gradient(var(--border-secondary) 1px, transparent 1px),
                            linear-gradient(90deg, var(--border-secondary) 1px, transparent 1px)
                        `,
                        backgroundSize: '80px 80px',
                        transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(3)',
                        transformOrigin: 'top center',
                        maskImage: 'linear-gradient(to bottom, transparent, black 50%, transparent)'
                    }}
                >
                    <motion.div
                        className="absolute inset-0"
                        animate={{ y: [0, 80] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        style={{
                            backgroundImage: `inherit`,
                            backgroundSize: 'inherit'
                        }}
                    />
                </div>
            )}

            {/* 2.5 Slow moving nebula veil (medium/high only) */}
            {config.enableNebulaDrift && (
                <motion.div
                    className="absolute inset-0 opacity-25"
                    style={{
                        backgroundImage: `
                            radial-gradient(30% 24% at 22% 72%, color-mix(in srgb, var(--accent-cyan) 30%, transparent), transparent 78%),
                            radial-gradient(28% 22% at 72% 66%, color-mix(in srgb, var(--accent-purple) 30%, transparent), transparent 80%)
                        `,
                        filter: `blur(${Math.max(30, config.blurAmount * 0.55)}px)`,
                        willChange: 'transform',
                    }}
                    animate={prefersReducedMotion ? {} : { x: [0, 16, -12, 0], y: [0, -10, 8, 0], scale: [1, 1.03, 1] }}
                    transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* 3. Floating Stars / Particles - Adaptive count */}
            {stars.map((star, i) => (
                prefersReducedMotion ? (
                    // Static stars for reduced motion
                    <div
                        key={star.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: star.size,
                            height: star.size,
                            backgroundColor: i % 3 === 0 ? 'var(--accent-cyan)' : i % 3 === 1 ? 'var(--accent-purple)' : 'white',
                            opacity: star.opacity,
                        }}
                    />
                ) : (
                    <motion.div
                        key={star.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: star.size,
                            height: star.size,
                            backgroundColor: i % 3 === 0 ? 'var(--accent-cyan)' : i % 3 === 1 ? 'var(--accent-purple)' : 'white',
                            boxShadow: `0 0 ${star.size * 2}px ${i % 2 === 0 ? 'var(--accent-cyan)' : 'white'}`
                        }}
                        animate={{
                            opacity: [star.opacity, 1, star.opacity],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: star.duration,
                            repeat: Infinity,
                            delay: star.delay,
                            ease: "easeInOut"
                        }}
                    />
                )
            ))}

            {/* 4. Shooting Stars - Medium and High only */}
            {config.enableShootingStars && shootingStars.map(star => (
                <motion.div
                    key={star.id}
                    className="absolute h-[2px] w-[100px] bg-gradient-to-r from-transparent via-white to-transparent"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        rotate: `${star.angle}deg`,
                        boxShadow: '0 0 10px var(--accent-cyan)'
                    }}
                    initial={{ opacity: 1, translateX: 0 }}
                    animate={{ opacity: 0, translateX: 500 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            ))}

            {/* 5. Ambient Colored Glows (Theme Aware) - Medium and High only */}
            {config.enableAmbientGlow && (
                <>
                    <motion.div
                        className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20"
                        animate={prefersReducedMotion ? {} : {
                            scale: [1, 1.1, 1],
                            opacity: [0.2, 0.3, 0.2]
                        }}
                        transition={{ duration: 10, repeat: Infinity }}
                        style={{
                            backgroundColor: 'var(--accent-cyan)',
                            filter: `blur(${config.blurAmount}px)`
                        }}
                    />

                    <motion.div
                        className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20"
                        animate={prefersReducedMotion ? {} : {
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.2, 0.1]
                        }}
                        transition={{ duration: 12, repeat: Infinity, delay: 2 }}
                        style={{
                            backgroundColor: 'var(--accent-purple)',
                            filter: `blur(${config.blurAmount}px)`
                        }}
                    />
                </>
            )}
        </div>
    );
};

export default SpaceBackground;

