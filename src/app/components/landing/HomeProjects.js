"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ProjectCard from '../projects/ProjectCard';
import ProjectDialog from '../projects/ProjectDialog';
import { useTheme } from '../../context/ThemeContext';

const HomeProjects = ({ data }) => {
  const { theme } = useTheme();
  const [selectedProject, setSelectedProject] = useState(null);
  const projects = data || [];

  const openDialog = (project) => {
    setSelectedProject(project);
  };

  const closeDialog = () => {
    setSelectedProject(null);
  };

  const latestProjects = projects.slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="p-4 lg:p-8 transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-4xl font-bold mb-8 flex items-center gap-3"
          style={{ color: 'var(--accent-cyan)' }}
        >
          <span style={{ color: 'var(--accent-orange)' }}>{"<"}</span>
          Latest Projects
          <span style={{ color: 'var(--accent-orange)' }}>{"/>"}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {latestProjects.map((project, index) => (
            <ProjectCard key={index} project={project} onCardClick={openDialog} />
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/projects" legacyBehavior>
            <motion.a
              className="inline-flex items-center gap-2 font-medium text-lg px-6 py-3 rounded border transition-all duration-200 group"
              style={{
                color: 'var(--accent-cyan)',
                borderColor: 'var(--accent-cyan)',
                boxShadow: 'var(--shadow-sm)',
              }}
              whileHover={{
                boxShadow: 'var(--shadow-md)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              View All Projects
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.a>
          </Link>
        </div>
      </div>
      <ProjectDialog project={selectedProject} onClose={closeDialog} />
    </motion.div>
  );
};

export default HomeProjects;