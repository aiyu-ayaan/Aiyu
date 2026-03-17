"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const TechStackDialog = ({ techStack, onClose }) => {
  const { theme } = useTheme();

  if (!techStack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
        style={{ backgroundColor: 'var(--overlay-bg)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="rounded-2xl overflow-hidden max-w-md w-full m-4 shadow-2xl"
          style={{
            background: 'var(--bg-surface)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-accent)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <h3
              className="text-2xl font-bold mb-6 text-transparent bg-gradient-to-r bg-clip-text flex items-center gap-3"
              style={{
                backgroundImage: theme === 'dark'
                  ? 'linear-gradient(to right, #f97316, #22d3ee)'
                  : 'linear-gradient(to right, #ea580c, #0891b2)',
              }}
            >
              <span style={{ color: 'var(--accent-cyan)' }}>{"<"}</span>
              All Tech Stacks
              <span style={{ color: 'var(--accent-cyan)' }}>{"/>"}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--accent-cyan)',
                    border: '1px solid var(--border-secondary)',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TechStackDialog;
