"use client";

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Container that staggers animations of its children
 */
const StaggerContainer = ({ 
  children, 
  staggerDelay = 0.1,
  direction = 'up',
  once = true,
  className = ''
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once, 
    amount: 0.2,
    margin: "-50px"
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.2
      }
    }
  };

  const directionOffset = {
    up: { y: 40 },
    down: { y: -40 },
    left: { x: 40 },
    right: { x: -40 }
  };

  const offset = directionOffset[direction] || directionOffset.up;

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      ...offset
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.4, 0.25, 1]
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <motion.div key={index} variants={itemVariants}>
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div variants={itemVariants}>
          {children}
        </motion.div>
      )}
    </motion.div>
  );
};

export default StaggerContainer;
