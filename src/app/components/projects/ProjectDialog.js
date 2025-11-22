
"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const ProjectDialog = ({ project, onClose }) => {
  const { theme } = useTheme();
  
  if (!project) return null;

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
          className="rounded-2xl overflow-hidden max-w-2xl w-11/12 max-h-[60vh] overflow-y-auto m-4 relative hide-scrollbar shadow-2xl"
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(to bottom right, #1e1433, #1a0f2e)'
              : 'linear-gradient(to bottom right, #f1f5f9, #e2e8f0)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-accent)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-3xl font-bold p-2 z-10 rounded-lg transition-all duration-300"
            style={{
              color: 'var(--text-tertiary)',
              backgroundColor: theme === 'dark' ? 'rgba(30, 20, 51, 0.8)' : 'rgba(226, 232, 240, 0.8)',
            }}
          >
            &times;
          </button>
          <div className="relative">
            {project.image && <img src={project.image} alt={project.name} className="w-full h-64 object-contain" />}
          </div>
          <div className="p-8">
            <h3 
              className="text-3xl font-bold mb-4 text-transparent bg-gradient-to-r bg-clip-text"
              style={{
                backgroundImage: theme === 'dark'
                  ? 'linear-gradient(to right, #f97316, #22d3ee)'
                  : 'linear-gradient(to right, #ea580c, #0891b2)',
              }}
            >
              {project.name}
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.techStack.map((tech, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1 rounded-lg text-sm font-medium"
                  style={{
                    background: theme === 'dark'
                      ? 'linear-gradient(to right, #374151, #1f2937)'
                      : 'linear-gradient(to right, #e2e8f0, #cbd5e1)',
                    color: theme === 'dark' ? '#22d3ee' : '#0891b2',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
            <p className="text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
              <span style={{ color: 'var(--accent-cyan)' }}>📅</span>
              <span className="font-semibold">Year:</span> {project.year}
            </p>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
            {project.codeLink && (
              <motion.a
                href={project.codeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                style={{
                  background: theme === 'dark'
                    ? 'linear-gradient(to right, #22d3ee, #3b82f6)'
                    : 'linear-gradient(to right, #0891b2, #2563eb)',
                  boxShadow: theme === 'dark'
                    ? '0 10px 30px rgba(34, 211, 238, 0.3)'
                    : '0 10px 30px rgba(8, 145, 178, 0.3)',
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                View Code
              </motion.a>
            )}
            </div>  
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectDialog;
