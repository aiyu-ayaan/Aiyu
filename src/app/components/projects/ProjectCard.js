
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
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden cursor-pointer border border-gray-700 hover:border-cyan-500 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 group"
      onClick={() => onCardClick(project)}
      whileHover={{ y: -8, scale: 1.02 }}
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
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-2 right-2">
          <motion.span
            className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm ${
              project.status === 'Done' ? 'bg-green-500/90 text-white' : 'bg-yellow-500/90 text-gray-900'
            }`}
            whileHover={{ scale: 1.1 }}
          >
            {project.status}
          </motion.span>
        </div>
      </motion.div>

      <motion.div layout className="p-6">
        <motion.h3 layout className="text-xl font-bold mb-3 text-transparent bg-gradient-to-r from-orange-400 to-cyan-400 bg-clip-text group-hover:from-cyan-400 group-hover:to-orange-400 transition-all duration-300">{project.name}</motion.h3>
        <motion.div layout className="flex flex-wrap gap-2 mb-4">
          {project.techStack.slice(0, 3).map((tech, i) => (
            <motion.span 
              key={i} 
              className="bg-gradient-to-r from-gray-700 to-gray-800 text-cyan-300 px-3 py-1 rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-blue-600 hover:text-white transition-all duration-300 cursor-default"
              whileHover={{ scale: 1.1 }}
            >
              {tech}
            </motion.span>
          ))}
          {project.techStack.length > 3 && (
            <motion.span 
              className="bg-gradient-to-r from-orange-600 to-pink-600 text-white px-3 py-1 rounded-lg text-sm font-medium cursor-pointer hover:from-orange-500 hover:to-pink-500 transition-all duration-300" 
              onClick={openTechStackDialog}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              +{project.techStack.length - 3} more
            </motion.span>
          )}
        </motion.div>
        <motion.p layout className="text-gray-400 text-sm mb-2 flex items-center gap-2">
          <span className="text-cyan-400">📅</span> 
          <span className="font-semibold">Year:</span> {project.year}
        </motion.p>
      </motion.div>
    </motion.div>
    <TechStackDialog techStack={showTechStackDialog ? project.techStack : null} onClose={closeTechStackDialog} />
    </>
  );
};

export default ProjectCard;
