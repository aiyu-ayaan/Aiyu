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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="bg-gray-900 text-white p-4 lg:p-8"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-3xl font-bold mb-8 text-cyan-400"
        >
          Latest Projects
        </motion.h2>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {latestProjects.map((project, index) => (
            <motion.div key={index} variants={itemVariants}>
              <ProjectCard project={project} onCardClick={openDialog} />
            </motion.div>
          ))}
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-8"
        >
          <Link href="/projects" legacyBehavior>
            <a className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-300 text-lg font-semibold">
              Show More →
            </a>
          </Link>
        </motion.div>
      </div>
      <ProjectDialog project={selectedProject} onClose={closeDialog} />
    </motion.div>
  );
};

export default HomeProjects;