"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { professionalSummary } from '../../data/aboutData';
import { useTheme } from '../../context/ThemeContext';

const HomeAbout = () => {
  const { theme } = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="p-4 lg:p-8 relative transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
          <motion.div
            className="p-8 rounded transition-all duration-200"
            style={{
              background: 'var(--bg-surface)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border-secondary)',
            }}
            whileHover={{ 
              boxShadow: '0 2px 8px var(--shadow-sm)',
            }}
          >
            <h2 
              className="text-3xl font-bold mb-6 flex items-center gap-3"
              style={{ color: 'var(--text-primary)' }}
            >
              <span style={{ color: 'var(--text-tertiary)' }}>{"</>"}</span>
              Summary
            </h2>
            <p 
              className="text-lg leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {professionalSummary}
            </p>
          </motion.div>
        </div>
        <div className="text-center mt-8">
          <Link href="/about-me" legacyBehavior>
            <motion.a 
              className="inline-flex items-center gap-2 font-semibold text-lg group transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
              whileHover={{ opacity: 0.7 }}
            >
              View Full Resume
              <span>→</span>
            </motion.a>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default HomeAbout;