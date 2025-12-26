"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const SpaceBackground = () => {
    // Generate random stars on client side to avoid hydration mismatch
    const [stars, setStars] = useState([]);

    useEffect(() => {
        const generatedStars = [...Array(50)].map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 5,
            duration: Math.random() * 3 + 2,
        }));
        setStars(generatedStars);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* 1. Deep Space Gradient */}
            <div
                className="absolute inset-0 opacity-40"
                style={{
                    background: `radial-gradient(circle at 50% 50%, 
                        var(--bg-elevated) 0%, 
                        var(--bg-primary) 100%)`
                }}
            />

            {/* 2. Animated Grid (New "Floor" Effect) */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `
                        linear-gradient(var(--border-secondary) 1px, transparent 1px),
                        linear-gradient(90deg, var(--border-secondary) 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px',
                    transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(2)',
                    transformOrigin: 'top center',
                    maskImage: 'linear-gradient(to bottom, transparent, black 40%, transparent)'
                }}
            >
                <motion.div
                    className="absolute inset-0"
                    animate={{ y: [0, 100] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    style={{
                        backgroundImage: `inherit`,
                        backgroundSize: 'inherit'
                    }}
                />
            </div>

            {/* 3. Floating Stars / Particles */}
            {stars.map((star, i) => (
                <motion.div
                    key={star.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                        backgroundColor: i % 2 === 0 ? 'var(--accent-cyan)' : 'var(--accent-purple)',
                        boxShadow: `0 0 ${star.size * 2}px var(--accent-cyan)`
                    }}
                    animate={{
                        opacity: [0.2, 1, 0.2],
                        scale: [1, 1.5, 1],
                    }}
                    transition={{
                        duration: star.duration,
                        repeat: Infinity,
                        delay: star.delay,
                        ease: "easeInOut"
                    }}
                />
            ))}

            {/* 4. Ambient Colored Glows (Theme Aware) */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[100px]"
                style={{ backgroundColor: 'var(--accent-cyan)' }} />

            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[100px]"
                style={{ backgroundColor: 'var(--accent-purple)' }} />

        </div>
    );
};

export default SpaceBackground;
