"use client";

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * ScrollReveal component for animating elements on scroll
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to animate
 * @param {string} props.direction - Animation direction: 'up', 'down', 'left', 'right'
 * @param {number} props.delay - Animation delay in seconds
 * @param {number} props.duration - Animation duration in seconds
 * @param {boolean} props.once - Whether animation should happen only once
 * @param {number} props.amount - Portion of element that needs to be visible (0-1)
 */
const ScrollReveal = ({ 
  children, 
  direction = 'up', 
  delay = 0, 
  duration = 0.6,
  once = true,
  amount = 0.3,
  className = ''
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once, 
    amount,
    margin: "-50px"
  });

  const directionOffset = {
    up: { y: 60, x: 0 },
    down: { y: -60, x: 0 },
    left: { x: 60, y: 0 },
    right: { x: -60, y: 0 }
  };

  const offset = directionOffset[direction] || directionOffset.up;

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        x: offset.x, 
        y: offset.y 
      }}
      animate={isInView ? { 
        opacity: 1, 
        x: 0, 
        y: 0 
      } : {
        opacity: 0, 
        x: offset.x, 
        y: offset.y 
      }}
      transition={{ 
        duration, 
        delay,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
