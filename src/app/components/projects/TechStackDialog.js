"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TechStackDialog = ({ techStack, onClose }) => {
  if (!techStack) return null;

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
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden max-w-md w-full m-4 border border-gray-700 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <h3 className="text-2xl font-bold mb-6 text-transparent bg-gradient-to-r from-orange-400 to-cyan-400 bg-clip-text flex items-center gap-3">
              <span className="text-cyan-400">{"<"}</span>
              All Tech Stacks
              <span className="text-cyan-400">{"/>"}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech, i) => (
                <span key={i} className="bg-gradient-to-r from-gray-700 to-gray-800 text-cyan-300 px-3 py-1 rounded-lg text-sm font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TechStackDialog;
