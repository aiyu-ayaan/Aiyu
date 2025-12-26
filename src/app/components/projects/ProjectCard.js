
"use client";

import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

import TechStackDialog from './TechStackDialog';

const ProjectCard = ({ project, onCardClick }) => {
  const { theme } = useTheme();
  const [showTechStackDialog, setShowTechStackDialog] = useState(false);

  const openTechStackDialog = (e) => {
    e.stopPropagation();
    setShowTechStackDialog(true);
  };

  const closeTechStackDialog = () => {
    setShowTechStackDialog(false);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 group"
        style={{
          background: 'linear-gradient(to bottom right, var(--bg-surface), var(--bg-secondary))',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--border-secondary)',
        }}
        onClick={() => onCardClick(project)}
        whileHover={{
          y: -8,
          scale: 1.02,
          borderColor: 'var(--accent-cyan)',
          boxShadow: '0 25px 50px var(--shadow-lg)',
        }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div layout className="relative overflow-hidden">
          {project.image && (
            <motion.img
              src={project.image}
              alt={project.name}
              className="w-full h-48 object-contain group-hover:scale-110 transition-transform duration-500"
            />
          )}
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: 'linear-gradient(to top, var(--bg-secondary), transparent, transparent)',
            }}
          ></div>
          <div className="absolute top-2 right-2">
            <motion.span
              className="px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm"
              style={{
                backgroundColor: project.status === 'Done'
                  ? 'rgba(34, 197, 94, 0.9)'
                  : 'rgba(234, 179, 8, 0.9)',
                color: project.status === 'Done' ? '#ffffff' : theme === 'dark' ? '#111827' : '#111827',
              }}
              whileHover={{ scale: 1.1 }}
            >
              {project.status}
            </motion.span>
          </div>
        </motion.div>

        <motion.div layout className="p-6">
          <motion.h3
            layout
            className="text-xl font-bold mb-3 text-transparent bg-gradient-to-r bg-clip-text transition-all duration-300"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--accent-orange), var(--accent-cyan))',
            }}
          >
            {project.name}
          </motion.h3>
          <motion.div layout className="flex flex-wrap gap-2 mb-4">
            {project.techStack.slice(0, 3).map((tech, i) => (
              <motion.span
                key={i}
                className="px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 cursor-default"
                style={{
                  background: 'linear-gradient(to right, var(--bg-surface), var(--bg-elevated))',
                  color: 'var(--accent-cyan)',
                }}
                whileHover={{
                  scale: 1.1,
                  background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                  color: '#ffffff',
                }}
              >
                {tech}
              </motion.span>
            ))}
            {project.techStack.length > 3 && (
              <motion.span
                className="text-white px-3 py-1 rounded-lg text-sm font-medium cursor-pointer transition-all duration-300"
                style={{
                  background: 'linear-gradient(to right, var(--accent-orange), var(--accent-pink))',
                }}
                onClick={openTechStackDialog}
                whileHover={{
                  scale: 1.1,
                  background: 'linear-gradient(to right, var(--accent-orange-bright), var(--accent-pink-bright))',
                }}
                whileTap={{ scale: 0.95 }}
              >
                +{project.techStack.length - 3} more
              </motion.span>
            )}
          </motion.div>
          <motion.p
            layout
            className="text-sm mb-2 flex items-center gap-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span style={{ color: 'var(--accent-cyan)' }}>📅</span>
            <span className="font-semibold">Year:</span> {project.year}
          </motion.p>
        </motion.div>
      </motion.div>
      <TechStackDialog techStack={showTechStackDialog ? project.techStack : null} onClose={closeTechStackDialog} />
    </>
  );
};

export default ProjectCard;
