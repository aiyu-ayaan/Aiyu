
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
      transition={{ duration: 0.3 }}
      className="rounded overflow-hidden cursor-pointer transition-all duration-200 group"
      style={{
        background: 'var(--bg-surface)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--border-secondary)',
      }}
      onClick={() => onCardClick(project)}
      whileHover={{ 
        boxShadow: '0 2px 8px var(--shadow-sm)',
      }}
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
            className="px-3 py-1 text-xs font-bold rounded backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-secondary)',
            }}
          >
            {project.status}
          </motion.span>
        </div>
      </motion.div>

      <motion.div layout className="p-6">
        <motion.h3 
          layout 
          className="text-xl font-bold mb-3 transition-all duration-200"
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
              className="px-3 py-1 rounded text-sm font-medium transition-opacity duration-200 cursor-default"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}
              whileHover={{ 
                opacity: 0.7,
              }}
            >
              {tech}
            </motion.span>
          ))}
          {project.techStack.length > 3 && (
            <motion.span 
              className="px-3 py-1 rounded text-sm font-medium cursor-pointer transition-opacity duration-200"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}
              onClick={openTechStackDialog}
              whileHover={{ 
                opacity: 0.7,
              }}
            >
              +{project.techStack.length - 3} more
            </motion.span>
          )}
        </motion.div>
        <motion.p 
          layout 
          className="text-sm mb-2"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span className="font-semibold">Year:</span> {project.year}
        </motion.p>
      </motion.div>
    </motion.div>
    <TechStackDialog techStack={showTechStackDialog ? project.techStack : null} onClose={closeTechStackDialog} />
    </>
  );
};

export default ProjectCard;
