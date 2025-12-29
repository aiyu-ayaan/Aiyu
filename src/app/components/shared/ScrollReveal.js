"use client";
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  },
  fadeUp: {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  },
  fadeDown: {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0 }
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 }
  },
  fadeRight: {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  },
  slideUp: {
    hidden: { y: 100, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  },
  slideLeft: {
    hidden: { x: -100, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  },
  slideRight: {
    hidden: { x: 100, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  },
  flipUp: {
    hidden: { opacity: 0, rotateX: -90, transformPerspective: 1000 },
    visible: { opacity: 1, rotateX: 0, transformPerspective: 1000 }
  },
  zoomIn: {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 }
  }
};

export default function ScrollReveal({ 
  children, 
  variant = 'fadeUp',
  delay = 0,
  duration = 0.6,
  once = true,
  amount = 0.2,
  className = '',
  ...props 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once, 
    amount,
    margin: "-50px"
  });

  const selectedVariant = variants[variant] || variants.fadeUp;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={selectedVariant}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ScrollStagger({ 
  children, 
  staggerDelay = 0.1,
  variant = 'fadeUp',
  duration = 0.6,
  once = true,
  className = '' 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: 0.2 });

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <ScrollReveal
            key={index}
            variant={variant}
            delay={index * staggerDelay}
            duration={duration}
            once={once}
          >
            {child}
          </ScrollReveal>
        ))
      ) : (
        children
      )}
    </div>
  );
}
