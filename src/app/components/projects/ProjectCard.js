"use client";

import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FaCalendarDay } from 'react-icons/fa';

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
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative rounded-2xl overflow-hidden cursor-pointer group"
        onClick={() => onCardClick(project)}
        whileHover={{
          y: -5,
          scale: 1.02,
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Glow behind the card */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl z-[-1]" />

        {/* Card Main Container */}
        <div
          className="relative z-10 w-full h-full rounded-2xl border flex flex-col transition-all duration-300 backdrop-blur-md"
          style={{
            background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.7), rgba(15, 23, 42, 0.9))',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Shine effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent -translate-x-full group-hover:translate-x-full ease-in-out" />

          <motion.div layout className="relative overflow-hidden w-full" style={{ height: project.image ? '200px' : '0' }}>
            {project.image && (
              <>
                <motion.img
                  src={project.image}
                  alt={project.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                />
                {/* Clean gradient fade into the card body */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />

                <div className="absolute top-3 right-3 z-20">
                  <motion.span
                    className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full backdrop-blur-md border border-white/10 shadow-lg"
                    style={{
                      backgroundColor: project.status === 'Done'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                      color: project.status === 'Done' ? '#34d399' : '#fbbf24',
                    }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {project.status}
                  </motion.span>
                </div>
              </>
            )}
          </motion.div>

          <motion.div layout className={`p-6 md:p-8 flex flex-col flex-grow ${!project.image && 'pt-8'}`}>
            {!project.image && (
              <div className="absolute top-4 right-4 z-20">
                <motion.span
                  className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full backdrop-blur-md border border-white/10 shadow-lg"
                  style={{
                    backgroundColor: project.status === 'Done'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(245, 158, 11, 0.2)',
                    color: project.status === 'Done' ? '#34d399' : '#fbbf24',
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  {project.status}
                </motion.span>
              </div>
            )}

            <motion.h3
              layout
              className="text-2xl md:text-3xl font-extrabold mb-4 tracking-tight"
              style={{
                background: 'linear-gradient(to right, #fb923c, #ec4899, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {project.name}
            </motion.h3>

            <motion.div layout className="flex flex-wrap gap-2 mb-6 mt-auto">
              {project.techStack.slice(0, 3).map((tech, i) => (
                <motion.span
                  key={i}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide border transition-all duration-300 cursor-default shadow-sm"
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.05)',
                    borderColor: 'rgba(56, 189, 248, 0.2)',
                    color: '#38bdf8',
                  }}
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)',
                    color: '#fff',
                  }}
                >
                  {tech}
                </motion.span>
              ))}
              {project.techStack.length > 3 && (
                <motion.span
                  className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide border cursor-pointer transition-all duration-300 shadow-sm"
                  style={{
                    backgroundColor: 'rgba(236, 72, 153, 0.05)',
                    borderColor: 'rgba(236, 72, 153, 0.2)',
                    color: '#ec4899',
                  }}
                  onClick={openTechStackDialog}
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: 'rgba(236, 72, 153, 0.15)',
                    borderColor: 'rgba(236, 72, 153, 0.4)',
                    boxShadow: '0 0 12px rgba(236, 72, 153, 0.3)',
                    color: '#fff',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  +{project.techStack.length - 3} more
                </motion.span>
              )}
            </motion.div>

            <motion.div
              layout
              className="flex items-center gap-2 pt-4 border-t border-gray-700/50 mt-4"
            >
              <FaCalendarDay className="text-cyan-400 text-sm" />
              <span className="text-sm font-semibold tracking-wide text-gray-200">
                <span className="text-gray-400 mr-1">Year:</span> {project.year}
              </span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
      <TechStackDialog techStack={showTechStackDialog ? project.techStack : null} onClose={closeTechStackDialog} />
    </>
  );
};

export default ProjectCard;
