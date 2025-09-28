
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
      className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
      onClick={() => onCardClick(project)}
    >
      <motion.div layout className="relative">
        {project.image && <img src={project.image} alt={project.name} className="w-full h-48 object-cover" />}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              project.status === 'Done' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-gray-900'
            }`}>
            {project.status}
          </span>
        </div>
      </motion.div>

      <motion.div layout className="p-6">
        <motion.h3 layout className="text-xl font-bold mb-2 text-orange-400">{project.name}</motion.h3>
        <motion.div layout className="flex flex-wrap gap-2 mb-4">
          {project.techStack.slice(0, 3).map((tech, i) => (
            <span key={i} className="bg-gray-700 text-gray-300 px-2 py-1 rounded-md text-sm">
              {tech}
            </span>
          ))}
          {project.techStack.length > 3 && (
<span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-md text-sm cursor-pointer" onClick={openTechStackDialog}>
              +{project.techStack.length - 3} more
            </span>
          )}
        </motion.div>
        <motion.p layout className="text-gray-400 text-sm mb-2">Year: {project.year}</motion.p>
      </motion.div>
    </motion.div>
    <TechStackDialog techStack={showTechStackDialog ? project.techStack : null} onClose={closeTechStackDialog} />
    </>
  );
};

export default ProjectCard;
