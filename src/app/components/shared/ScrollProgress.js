"use client";

import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Scroll progress indicator component
 */
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-cyan-500 to-orange-500 origin-left z-50"
      style={{ scaleX }}
    />
  );
};

export default ScrollProgress;
