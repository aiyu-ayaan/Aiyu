"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import projects from '../../data/projectsData';
import ProjectCard from '../projects/ProjectCard';
import ProjectDialog from '../projects/ProjectDialog';

const HomeProjects = () => {
  const [selectedProject, setSelectedProject] = useState(null);

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
      className="bg-gray-900 text-white p-4 lg:p-8"
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold mb-8 text-cyan-400 flex items-center gap-3">
          <span className="text-orange-500">{"<"}</span>
          Latest Projects
          <span className="text-orange-500">{"/>"}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {latestProjects.map((project, index) => (
            <ProjectCard key={index} project={project} onCardClick={openDialog} />
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/projects" legacyBehavior>
            <motion.a 
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold text-lg px-6 py-3 rounded-lg border-2 border-cyan-400 hover:border-cyan-300 transition-all duration-300 group"
              whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(34, 211, 238, 0.5)" }}
              whileTap={{ scale: 0.95 }}
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