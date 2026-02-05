"use client";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import useDevicePerformance from '../../hooks/useDevicePerformance';

const SpaceBackground = () => {
    const { tier, prefersReducedMotion } = useDevicePerformance();
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef(null);

    // Lazy mount: Only render expensive effects when component is in viewport
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.01 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Adaptive configuration based on device performance
    const config = useMemo(() => {
        if (prefersReducedMotion || tier === 'low') {
            return {
                starCount: 5,
                enableShootingStars: false,
                enableMouseTracking: false,
                enableAmbientGlow: false,
                enableAnimatedGrid: false,
                blurAmount: 30,
            };
        } else if (tier === 'medium') {
            return {
                starCount: 10, // Reduced from 12
                enableShootingStars: true,
                enableMouseTracking: false,
                enableAmbientGlow: true,
                enableAnimatedGrid: false,
                blurAmount: 50, // Reduced from 60
            };
        } else {
            return {
                starCount: 20, // Reduced from 25
                enableShootingStars: true,
                enableMouseTracking: true,
                enableAmbientGlow: true,
                enableAnimatedGrid: true,
                blurAmount: 80, // Reduced from 120 for better performance
            };
        }
    }, [tier, prefersReducedMotion]);

    // Generate random stars on client side to avoid hydration mismatch
    const [stars, setStars] = useState([]);
    const [shootingStars, setShootingStars] = useState([]);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

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
        if (!config.enableMouseTracking || !isVisible) return;

        // Throttled mouse movement handler using requestAnimationFrame
        let rafId = null;
        let lastMouseEvent = null;
        
        const updateMousePos = () => {
            if (lastMouseEvent) {
                setMousePos({
                    x: (lastMouseEvent.clientX / window.innerWidth) * 100,
                    y: (lastMouseEvent.clientY / window.innerHeight) * 100,
                });
            }
            rafId = null;
        };

        const handleMouseMove = (e) => {
            lastMouseEvent = e;
            if (rafId === null) {
                rafId = requestAnimationFrame(updateMousePos);
            }
        };
        
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [config.enableMouseTracking, isVisible]);

    useEffect(() => {
        if (!config.enableShootingStars || !isVisible) return;

        // Shooting stars loop - reduced frequency for performance
        const interval = setInterval(() => {
            if (Math.random() > 0.9) { // Reduced from 15% to 10% chance
                const newStar = {
                    id: Date.now(),
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                    angle: Math.random() * 45 + 135, // Moving down-right roughly
                };
                setShootingStars(prev => [...prev, newStar]);

                // Cleanup old shooting stars
                setTimeout(() => {
                    setShootingStars(prev => prev.filter(s => s.id !== newStar.id));
                }, 2000);
            }
        }, 3000); // Increased interval from 2500 to 3000

        return () => clearInterval(interval);
    }, [config.enableShootingStars, isVisible]);

    return (
        <div 
            ref={containerRef}
            className="absolute inset-0 overflow-hidden pointer-events-none" 
            style={{ 
                backgroundColor: 'var(--bg-primary)',
                contain: 'layout style paint', // CSS containment for better performance
                willChange: 'auto' // Browser hint for optimization
            }}
        >
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
            {config.enableAnimatedGrid && isVisible && (
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: `
                            linear-gradient(var(--border-secondary) 1px, transparent 1px),
                            linear-gradient(90deg, var(--border-secondary) 1px, transparent 1px)
                        `,
                        backgroundSize: '80px 80px',
                        transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(3) translateZ(0)',
                        transformOrigin: 'top center',
                        maskImage: 'linear-gradient(to bottom, transparent, black 50%, transparent)',
                        willChange: 'transform',
                        contain: 'strict'
                    }}
                >
                    <motion.div
                        className="absolute inset-0"
                        animate={{ y: [0, 80] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        style={{
                            backgroundImage: `inherit`,
                            backgroundSize: 'inherit',
                            willChange: 'transform'
                        }}
                    />
                </div>
            )}

            {/* 3. Floating Stars / Particles - Adaptive count, only render when visible */}
            {isVisible && stars.map((star, i) => (
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
                            transform: 'translateZ(0)', // GPU acceleration
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
                            boxShadow: tier === 'high' ? `0 0 ${star.size * 2}px ${i % 2 === 0 ? 'var(--accent-cyan)' : 'white'}` : 'none', // Disable boxShadow on medium tier
                            willChange: 'opacity, transform',
                        }}
                        animate={{
                            opacity: [star.opacity, 1, star.opacity],
                            scale: [1, 1.15, 1], // Reduced from 1.2 for smoother animation
                        }}
                        transition={{
                            duration: star.duration + 1, // Slower animation is less demanding
                            repeat: Infinity,
                            delay: star.delay,
                            ease: "easeInOut"
                        }}
                    />
                )
            ))}

            {/* 4. Shooting Stars - Medium and High only, with GPU acceleration */}
            {config.enableShootingStars && isVisible && shootingStars.map(star => (
                <motion.div
                    key={star.id}
                    className="absolute h-[2px] w-[80px] bg-gradient-to-r from-transparent via-white to-transparent" // Reduced width from 100px for performance
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        rotate: `${star.angle}deg`,
                        boxShadow: tier === 'high' ? '0 0 10px var(--accent-cyan)' : 'none',
                        willChange: 'transform, opacity',
                    }}
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: 0, x: 400 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            ))}

            {/* 5. Ambient Colored Glows (Theme Aware) - Medium and High only, with GPU acceleration */}
            {config.enableAmbientGlow && isVisible && (
                <>
                    <motion.div
                        className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-15"
                        animate={prefersReducedMotion ? {} : {
                            scale: [1, 1.08, 1], // Reduced scale for smoother animation
                            opacity: [0.15, 0.22, 0.15]
                        }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            backgroundColor: 'var(--accent-cyan)',
                            filter: `blur(${config.blurAmount}px)`,
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)', // Force GPU layer
                        }}
                    />

                    <motion.div
                        className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-15"
                        animate={prefersReducedMotion ? {} : {
                            scale: [1, 1.1, 1], // Reduced from 1.2
                            opacity: [0.1, 0.18, 0.1]
                        }}
                        transition={{ duration: 14, repeat: Infinity, delay: 2, ease: "easeInOut" }}
                        style={{
                            backgroundColor: 'var(--accent-purple)',
                            filter: `blur(${config.blurAmount}px)`,
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)', // Force GPU layer
                        }}
                    />
                </>
            )}
        </div>
    );
};

export default SpaceBackground;

