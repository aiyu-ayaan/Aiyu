
"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectDialog = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800 rounded-lg overflow-hidden max-w-2xl w-full m-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <img src={project.image} alt={project.name} className="w-full h-64 object-cover" />
          </div>
          <div className="p-6">
            <h3 className="text-2xl font-bold mb-2 text-orange-400">{project.name}</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.techStack.map((tech, i) => (
                <span key={i} className="bg-gray-700 text-gray-300 px-2 py-1 rounded-md text-sm">
                  {tech}
                </span>
              ))}
            </div>
            <p className="text-gray-400 text-sm mb-4">Year: {project.year}</p>
            <p className="text-gray-300">{project.description}</p>
            <motion.a
              href={project.codeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              View Code
            </motion.a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectDialog;
