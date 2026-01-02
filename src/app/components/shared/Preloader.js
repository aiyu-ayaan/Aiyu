"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader() {
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
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

    return (
        <AnimatePresence mode="wait">
            {loading && (
                <motion.div
                    key="preloader"
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center font-sans"
                    style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)'
                    }}
                    exit={{ y: "-100%" }} // Curtain effect: slides up
                    transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }} // Custom bezier for "heavy" curtain feel
                >
                    {/* Content Container */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center gap-8 relative"
                    >
                        {/* Percentage Text */}
                        <span
                            className="text-8xl md:text-9xl font-bold font-mono tracking-tighter"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {progress}%
                        </span>

                        {/* Loading Bar Container */}
                        <div
                            className="w-64 h-1 md:w-96 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-secondary)' }}
                        >
                            <motion.div
                                className="h-full"
                                style={{
                                    width: `${progress}%`,
                                    backgroundColor: 'var(--accent-cyan)'
                                }}
                                layoutId="loader-bar"
                            />
                        </div>

                        {/* Witty Text */}
                        <motion.p
                            className="font-mono text-sm uppercase tracking-widest mt-4"
                            style={{ color: 'var(--text-secondary)' }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            Loading Experience...
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
