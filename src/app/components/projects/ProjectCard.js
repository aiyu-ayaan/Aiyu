
"use client";

import { motion } from 'framer-motion';
import React, { useState } from 'react';

import TechStackDialog from './TechStackDialog';

const ProjectCard = ({ project, onCardClick }) => {

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
        whileHover={{ scale: 1.03, y: -5 }}
        transition={{ duration: 0.3 }}
        className="glass-card glass-card-hover rounded-xl overflow-hidden cursor-pointer shadow-medium hover:shadow-strong"
        onClick={() => onCardClick(project)}
      >
        <motion.div layout className="relative bg-gray-800/50">
          {project.image && (
            <motion.img 
              src={project.image} 
              alt={project.name} 
              className="w-full h-48 object-contain"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            />
          )}
          <div className="absolute top-2 right-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`px-3 py-1 text-xs font-semibold rounded-full shadow-medium ${
                project.status === 'Done' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-yellow-500 text-gray-900'
              }`}
            >
              {project.status}
            </motion.span>
          </div>
        </motion.div>

        <motion.div layout className="p-6">
          <motion.h3 
            layout 
            className="text-xl font-bold mb-3 text-orange-400 hover:text-orange-300 transition-colors"
          >
            {project.name}
          </motion.h3>
          <motion.div layout className="flex flex-wrap gap-2 mb-4">
            {project.techStack.slice(0, 3).map((tech, i) => (
              <motion.span 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-700/70 text-gray-300 px-3 py-1 rounded-md text-sm hover:bg-gray-600 transition-colors"
              >
                {tech}
              </motion.span>
            ))}
            {project.techStack.length > 3 && (
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-cyan-600/70 text-white px-3 py-1 rounded-md text-sm cursor-pointer hover:bg-cyan-500 transition-colors" 
                onClick={openTechStackDialog}
              >
                +{project.techStack.length - 3} more
              </motion.span>
            )}
          </motion.div>
          <motion.p 
            layout 
            className="text-gray-400 text-sm font-medium"
          >
            Year: {project.year}
          </motion.p>
        </motion.div>
      </motion.div>
      <TechStackDialog techStack={showTechStackDialog ? project.techStack : null} onClose={closeTechStackDialog} />
    </>
  );
};

export default ProjectCard;
