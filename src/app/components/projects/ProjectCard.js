
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
      className="rounded-lg overflow-hidden cursor-pointer transition-all duration-300 group"
      style={{
        backgroundColor: 'var(--bg-surface)',
        boxShadow: 'var(--shadow-md)',
      }}
      onClick={() => onCardClick(project)}
      whileHover={{ 
        y: -4,
        boxShadow: 'var(--shadow-lg)',
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
          className="absolute inset-0 opacity-40"
          style={{
            background: 'linear-gradient(to top, var(--bg-surface), transparent, transparent)',
          }}
        ></div>
        <div className="absolute top-2 right-2">
          <motion.span
            className="px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm"
            style={{
              backgroundColor: project.status === 'Done' 
                ? 'var(--status-success)' 
                : 'var(--status-warning)',
              color: '#ffffff',
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
          className="text-xl font-bold mb-3 transition-all duration-300"
          style={{
            color: 'var(--text-primary)',
          }}
        >
          {project.name}
        </motion.h3>
        <motion.div layout className="flex flex-wrap gap-2 mb-4">
          {project.techStack.slice(0, 3).map((tech, i) => (
            <motion.span 
              key={i} 
              className="px-3 py-1 rounded text-sm font-medium transition-all duration-300 cursor-default"
              style={{
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--accent-cyan)',
              }}
              whileHover={{ 
                backgroundColor: 'var(--accent-cyan)',
                color: '#ffffff',
              }}
            >
              {tech}
            </motion.span>
          ))}
          {project.techStack.length > 3 && (
            <motion.span 
              className="text-white px-3 py-1 rounded text-sm font-medium cursor-pointer transition-all duration-300"
              style={{
                backgroundColor: 'var(--accent-purple)',
              }}
              onClick={openTechStackDialog}
              whileHover={{ 
                opacity: 0.8,
              }}
              whileTap={{ scale: 0.98 }}
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
