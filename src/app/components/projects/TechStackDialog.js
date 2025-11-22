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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="rounded overflow-hidden max-w-md w-full m-4"
          style={{
            background: 'var(--bg-elevated)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-secondary)',
            boxShadow: '0 4px 16px var(--shadow-md)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <h3 
              className="text-2xl font-bold mb-6"
              style={{
                color: 'var(--text-primary)',
              }}
            >
              All Tech Stacks
            </h3>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{
                    background: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-primary)',
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
