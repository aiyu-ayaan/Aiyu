"use client";
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import useDevicePerformance from '../../hooks/useDevicePerformance';

const HolographicEffect = ({ children, className = "", intensity = "medium" }) => {
    const { tier, prefersReducedMotion } = useDevicePerformance();
    const containerRef = useRef(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    // Adaptive configuration based on device performance
    const config = {
        low: {
            enableHologram: false,
            enableParticles: false,
            enableGlitch: false,
            enableGlow: true,
        },
        medium: {
            enableHologram: true,
            enableParticles: false,
            enableGlitch: false,
            enableGlow: true,
        },
        high: {
            enableHologram: true,
            enableParticles: true,
            enableGlitch: true,
            enableGlow: true,
        }
    }[tier] || config.low;

    const intensityMap = {
        low: 0.3,
        medium: 0.6,
        high: 1.0
    };

    const effectIntensity = intensityMap[intensity] || 0.6;

    useEffect(() => {
        if (!config.enableHologram || prefersReducedMotion) return;

        const handleMouseMove = (e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setMousePos({ x, y });
        };

        const container = containerRef.current;
        container.addEventListener('mousemove', handleMouseMove);
        return () => container.removeEventListener('mousemove', handleMouseMove);
    }, [config.enableHologram, prefersReducedMotion]);

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Holographic overlay */}
            {config.enableHologram && (
                <motion.div
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                        background: isHovered ? `
                            radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, 
                                rgba(0, 255, 255, ${0.1 * effectIntensity}) 0%, 
                                rgba(255, 0, 255, ${0.05 * effectIntensity}) 25%, 
                                transparent 50%)
                        ` : 'none',
                        mixBlendMode: 'screen',
                    }}
                    animate={config.enableGlitch && isHovered ? {
                        opacity: [1, 0.8, 1, 0.9, 1],
                    } : {}}
                    transition={{
                        duration: 0.1,
                        repeat: config.enableGlitch ? Infinity : 0,
                        repeatType: "reverse"
                    }}
                />
            )}

            {/* Particle effects */}
            {config.enableParticles && isHovered && (
                <div className="absolute inset-0 pointer-events-none z-10">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                boxShadow: '0 0 6px rgba(0, 255, 255, 0.8)',
                            }}
                            animate={{
                                x: [0, Math.random() * 40 - 20],
                                y: [0, Math.random() * 40 - 20],
                                opacity: [0, 1, 0],
                                scale: [0, 1, 0],
                            }}
                            transition={{
                                duration: 2 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                                ease: "easeOut"
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Glow effect */}
            {config.enableGlow && (
                <motion.div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                        background: isHovered ? `
                            radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, 
                                rgba(0, 255, 255, ${0.15 * effectIntensity}) 0%, 
                                transparent 70%)
                        ` : 'none',
                        filter: 'blur(20px)',
                    }}
                    animate={isHovered ? {
                        scale: [1, 1.1, 1],
                    } : {}}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            )}

            {/* Content */}
            <div className="relative z-20">
                {children}
            </div>

            {/* Scanline effect */}
            {config.enableHologram && isHovered && (
                <motion.div
                    className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none z-30"
                    animate={{
                        top: ["0%", "100%"],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    style={{
                        opacity: 0.6 * effectIntensity,
                    }}
                />
            )}
        </div>
    );
};

export default HolographicEffect;
