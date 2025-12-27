"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const SpaceBackground = () => {
    // Generate random stars on client side to avoid hydration mismatch
    const [stars, setStars] = useState([]);
    const [shootingStars, setShootingStars] = useState([]);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        // Static stars
        const generatedStars = [...Array(80)].map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            opacity: Math.random(),
            delay: Math.random() * 5,
            duration: Math.random() * 3 + 2,
        }));
        setStars(generatedStars);

        // Mouse movement handler
        const handleMouseMove = (e) => {
            setMousePos({
                x: (e.clientX / window.innerWidth) * 100,
                y: (e.clientY / window.innerHeight) * 100,
            });
        };
        window.addEventListener('mousemove', handleMouseMove);

        // Shooting stars loop
        const interval = setInterval(() => {
            if (Math.random() > 0.7) { // 30% chance to spawn a shooting star
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
        }, 1500);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* 1. Deep Space Gradient - Dynamic based on mouse */}
            <motion.div
                className="absolute inset-0 opacity-40"
                animate={{
                    background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, var(--bg-elevated) 0%, var(--bg-primary) 60%)`
                }}
                transition={{ type: "tween", ease: "linear", duration: 0.2 }}
            />

            {/* 2. Animated Grid (Cyber Floor) */}
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
            ))}

            {/* 4. Shooting Stars */}
            {shootingStars.map(star => (
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

            {/* 5. Ambient Colored Glows (Theme Aware) */}
            <motion.div
                className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px]"
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.3, 0.2]
                }}
                transition={{ duration: 10, repeat: Infinity }}
                style={{ backgroundColor: 'var(--accent-cyan)' }}
            />

            <motion.div
                className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px]"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 12, repeat: Infinity, delay: 2 }}
                style={{ backgroundColor: 'var(--accent-purple)' }}
            />
        </div>
    );
};

export default SpaceBackground;
