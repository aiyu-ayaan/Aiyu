
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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="rounded overflow-hidden max-w-2xl w-11/12 max-h-[60vh] overflow-y-auto m-4 relative hide-scrollbar"
          style={{
            background: 'var(--bg-elevated)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-secondary)',
            boxShadow: '0 4px 16px var(--shadow-md)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-2xl font-bold p-2 z-10 transition-opacity duration-200"
            style={{
              color: 'var(--text-tertiary)',
              backgroundColor: 'transparent',
            }}
          >
            &times;
          </button>
          <div className="relative">
            {project.image && <img src={project.image} alt={project.name} className="w-full h-64 object-contain" />}
          </div>
          <div className="p-8">
            <h3 
              className="text-3xl font-bold mb-4"
              style={{
                color: 'var(--text-primary)',
              }}
            >
              {project.name}
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.techStack.map((tech, i) => (
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
            <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
              <span className="font-semibold">Year:</span> {project.year}
            </p>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
            {project.codeLink && (
              <motion.a
                href={project.codeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 px-6 py-3 rounded font-semibold transition-opacity duration-200"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-secondary)',
                }}
                whileHover={{ opacity: 0.7 }}
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
