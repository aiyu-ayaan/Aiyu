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
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ backgroundColor: 'var(--overlay-bg)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="rounded-lg overflow-hidden max-w-md w-full m-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            boxShadow: 'var(--shadow-lg)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <h3 
              className="text-2xl font-bold mb-6 flex items-center gap-3"
              style={{
                color: 'var(--text-primary)',
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
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--accent-cyan)',
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
