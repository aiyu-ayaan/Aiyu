
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
            background: 'linear-gradient(to bottom right, var(--bg-surface), var(--bg-secondary))',
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
              backgroundColor: 'var(--bg-elevated)',
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
                backgroundImage: 'linear-gradient(to right, var(--accent-orange), var(--accent-cyan))',
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
                    background: 'linear-gradient(to right, var(--bg-surface), var(--bg-elevated))',
                    color: 'var(--accent-cyan)',
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
                  background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                  boxShadow: '0 10px 30px var(--shadow-lg)',
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
