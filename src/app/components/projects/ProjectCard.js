
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="m3-rounded-lg overflow-hidden cursor-pointer m3-elevation-1 transition-all duration-300 group"
      style={{
        background: 'var(--m3-surface-variant)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--m3-outline)',
      }}
      onClick={() => onCardClick(project)}
      whileHover={{ 
        y: -4, 
        boxShadow: 'var(--m3-elevation-3)',
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
            background: theme === 'dark'
              ? 'linear-gradient(to top, #111827, transparent, transparent)'
              : 'linear-gradient(to top, #e2e8f0, transparent, transparent)',
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
            backgroundImage: theme === 'dark'
              ? 'linear-gradient(to right, #f97316, #22d3ee)'
              : 'linear-gradient(to right, #ea580c, #0891b2)',
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
                background: theme === 'dark'
                  ? 'linear-gradient(to right, #374151, #1f2937)'
                  : 'linear-gradient(to right, #e2e8f0, #cbd5e1)',
                color: theme === 'dark' ? '#22d3ee' : '#0891b2',
              }}
              whileHover={{ 
                scale: 1.1,
                background: theme === 'dark'
                  ? 'linear-gradient(to right, #0891b2, #2563eb)'
                  : 'linear-gradient(to right, #0e7490, #1d4ed8)',
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
                background: theme === 'dark'
                  ? 'linear-gradient(to right, #f97316, #ec4899)'
                  : 'linear-gradient(to right, #ea580c, #db2777)',
              }}
              onClick={openTechStackDialog}
              whileHover={{ 
                scale: 1.1,
                background: theme === 'dark'
                  ? 'linear-gradient(to right, #fb923c, #f472b6)'
                  : 'linear-gradient(to right, #f97316, #ec4899)',
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
