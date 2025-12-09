"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from '../../context/ThemeContext';

const HomeAbout = ({ data }) => {
  const { theme } = useTheme();
  const { professionalSummary } = data || {};

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
            className="p-8 rounded-2xl shadow-2xl transition-all duration-300"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(to bottom right, #1f2937, #111827)'
                : 'linear-gradient(to bottom right, #f1f5f9, #e2e8f0)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border-secondary)',
            }}
            whileHover={{
              scale: 1.02,
              y: -5,
              borderColor: 'var(--accent-cyan)',
            }}
          >
            <h2
              className="text-3xl font-bold mb-6 flex items-center gap-3"
              style={{ color: 'var(--accent-cyan)' }}
            >
              <span style={{ color: 'var(--accent-orange)' }}>{"</>"}</span>
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
              className="inline-flex items-center gap-2 font-semibold text-lg group"
              style={{ color: 'var(--accent-cyan)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Full Resume
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.a>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default HomeAbout;