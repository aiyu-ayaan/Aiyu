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
        <h2 className="text-2xl font-bold mb-4 text-cyan-400">Latest Projects</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {latestProjects.map((project, index) => (
            <ProjectCard key={index} project={project} onCardClick={openDialog} />
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/projects" legacyBehavior>
            <a className="text-cyan-400 hover:underline">Show More</a>
          </Link>
        </div>
      </div>
      <ProjectDialog project={selectedProject} onClose={closeDialog} />
    </motion.div>
  );
};

export default HomeProjects;