"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

export default function ProgressBar() {
    const { scrollYProgress } = useScroll();

    // Spring physics for smooth movement
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Transform spring value to percentage for tip position
    const x = useTransform(scaleX, [0, 1], ["0%", "100%"]);
    const tipOpacity = useTransform(scaleX, [0, 0.01], [0, 1]);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <motion.div
            className="absolute bottom-0 left-0 right-0 h-[2px] z-[100] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
        >
            {/* Progress Line */}
            <motion.div
                className="absolute inset-0 origin-left"
                style={{
                    scaleX,
                    background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                    filter: 'drop-shadow(0 0 2px var(--accent-cyan))'
                }}
            />

            {/* Glowing Tip - Separated to avoid squashing */}
            <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-1 rounded-full bg-white blur-[1px]"
                style={{
                    left: x,
                    x: "-100%", // Offset to keep it at the end of the bar
                    boxShadow: '0 0 10px 2px var(--accent-cyan)',
                    opacity: tipOpacity
                }}
            />
        </motion.div>
    );
}
