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
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800 rounded-lg overflow-hidden max-w-md w-full m-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-orange-400">All Tech Stacks</h3>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech, i) => (
                <span key={i} className="bg-gray-700 text-gray-300 px-2 py-1 rounded-md text-sm">
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
