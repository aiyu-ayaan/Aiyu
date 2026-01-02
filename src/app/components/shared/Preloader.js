"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Preloader({ children }) {
    const pathname = usePathname();
    // Skip preloader on admin pages
    const isAdmin = pathname?.startsWith('/admin');

    const [loading, setLoading] = useState(!isAdmin);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (isAdmin) return;

        // Check session/local storage to only show once per session if desired
        // For now, always show as requested for 'experience'

        // Simulate loading
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(() => setLoading(false), 500); // Slight delay after 100%
                    return 100;
                }
                // Random increment for realistic feel
                const increment = Math.floor(Math.random() * 10) + 1;
                return Math.min(prev + increment, 100);
            });
        }, 150);

        return () => clearInterval(timer);
    }, []);

    // Toggle body class to hide n8n chat via CSS
    useEffect(() => {
        if (loading) {
            document.body.classList.add('preloader-active');
        } else {
            document.body.classList.remove('preloader-active');
        }
        return () => {
            document.body.classList.remove('preloader-active');
        };
    }, [loading]);

    if (isAdmin) {
        return <>{children}</>;
    }

    return (
        <>
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="preloader"
                        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center font-sans"
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            perspective: '1000px'
                        }}
                        exit={{ y: "-100%" }}
                        transition={{
                            type: "tween",
                            duration: 0.8,
                            ease: [0.22, 1, 0.36, 1] // Custom "Out Quint" style for ultra smooth exit
                        }}
                    >
                        {/* Content Container */}
                        <motion.div
                            initial={{ opacity: 0, rotateX: 15 }}
                            animate={{ opacity: 1, rotateX: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -200, transition: { duration: 0.5 } }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center gap-10 relative transform-style-3d"
                        >
                            {/* 3D Percentage Text */}
                            <div className="relative group">
                                <span
                                    className="text-8xl md:text-9xl font-bold font-mono tracking-tighter relative z-10"
                                    style={{
                                        color: 'var(--text-primary)',
                                        textShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    {progress}%
                                </span>
                                <span
                                    className="absolute top-0 left-0 text-8xl md:text-9xl font-bold font-mono tracking-tighter blur-lg opacity-50"
                                    style={{ color: 'var(--accent-cyan)' }}
                                >
                                    {progress}%
                                </span>
                            </div>

                            {/* 3D Loading Bar Container */}
                            <div
                                className="relative w-72 h-4 md:w-96"
                                style={{
                                    perspective: '500px',
                                    transformStyle: 'preserve-3d'
                                }}
                            >
                                {/* Bar Background (Base) */}
                                <div
                                    className="absolute inset-0 rounded-full opacity-20"
                                    style={{
                                        backgroundColor: 'var(--text-secondary)',
                                        transform: 'rotateX(20deg)'
                                    }}
                                />

                                {/* Filling Bar (3D Effect) */}
                                <motion.div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                        width: `${progress}%`,
                                        background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                                        boxShadow: '0 0 20px var(--accent-cyan), 0 0 10px var(--accent-purple)',
                                        transform: 'rotateX(20deg) translateZ(5px)'
                                    }}
                                    layoutId="loader-bar"
                                >
                                    {/* Glare/Sheen */}
                                    <div className="absolute inset-0 bg-white/30 rounded-full" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)' }} />
                                </motion.div>
                            </div>

                            {/* Witty Text */}
                            <motion.p
                                className="font-mono text-xs md:text-sm uppercase tracking-[0.3em]"
                                style={{ color: 'var(--text-secondary)' }}
                                animate={{ opacity: [0.3, 1, 0.3], textShadow: ['0 0 0px var(--accent-cyan)', '0 0 10px var(--accent-cyan)', '0 0 0px var(--accent-cyan)'] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                Initializing Reality...
                            </motion.p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Reveal Animation */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={!loading ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
                transition={{
                    type: "spring",
                    stiffness: 50,
                    damping: 15,
                    mass: 1,
                    delay: 0.1
                }}
                style={{ width: '100%' }}
            >
                {children}
            </motion.div>
        </>
    );
}
