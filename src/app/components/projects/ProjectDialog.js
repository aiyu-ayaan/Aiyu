
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden max-w-2xl w-11/12 max-h-[60vh] overflow-y-auto m-4 relative hide-scrollbar border border-gray-700 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-cyan-400 text-3xl font-bold p-2 z-10 hover:bg-gray-800 rounded-lg transition-all duration-300"
          >
            &times;
          </button>
          <div className="relative">
            {project.image && <img src={project.image} alt={project.name} className="w-full h-64 object-contain" />}
          </div>
          <div className="p-8">
            <h3 className="text-3xl font-bold mb-4 text-transparent bg-gradient-to-r from-orange-400 to-cyan-400 bg-clip-text">{project.name}</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.techStack.map((tech, i) => (
                <span key={i} className="bg-gradient-to-r from-gray-700 to-gray-800 text-cyan-300 px-3 py-1 rounded-lg text-sm font-medium">
                  {tech}
                </span>
              ))}
            </div>
            <p className="text-gray-400 text-sm mb-4 flex items-center gap-2">
              <span className="text-cyan-400">📅</span>
              <span className="font-semibold">Year:</span> {project.year}
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">{project.description}</p>
            {project.codeLink && (
              <motion.a
                href={project.codeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/30"
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
