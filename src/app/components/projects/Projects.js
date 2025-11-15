
"use client";
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import projects, { roles } from '../../data/projectsData';
import ProjectDialog from './ProjectDialog';
import TypewriterEffect from '../shared/TypewriterEffect';
import Timeline from './Timeline';

const Projects = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTechStack, setSelectedTechStack] = useState('All');
  const [selectedProjectType, setSelectedProjectType] = useState('All');

  const openDialog = (project) => {
    setSelectedProject(project);
  };

  const closeDialog = () => {
    setSelectedProject(null);
  };

  const uniqueTechStacks = useMemo(() => {
    const allTechStacks = projects.flatMap(project => project.techStack);
    return ['All', ...new Set(allTechStacks)].sort();
  }, [projects]);

  const uniqueProjectTypes = useMemo(() => {
    const allProjectTypes = projects.map(project => project.projectType);
    return ['All', ...new Set(allProjectTypes)].sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesTechStack = selectedTechStack === 'All' || project.techStack.includes(selectedTechStack);
      const matchesProjectType = selectedProjectType === 'All' || project.projectType === selectedProjectType;
      return matchesTechStack && matchesProjectType;
    });
  }, [projects, selectedTechStack, selectedProjectType]);

  const projectsByYear = filteredProjects.reduce((acc, project) => {
    const yearParts = project.year.split(' - ');
    const year = yearParts.length > 1 ? yearParts[1] : yearParts[0];
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(project);
    return acc;
  }, {});

  const years = Object.keys(projectsByYear).sort((a, b) => b - a);

  const toPascalCase = (str) => {
    if (!str) return '';
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="min-h-screen bg-gray-900 text-white p-4 lg:p-8"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2"
          >
            Projects
          </motion.h1>
          <TypewriterEffect roles={roles} />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center gap-4 mb-8"
        >
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <label htmlFor="techStackFilter" className="text-gray-300 text-lg mb-2">Filter by Tech Stack:</label>
            <select
              id="techStackFilter"
              className="bg-gray-800 text-white p-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-auto hover:border-orange-500 transition-colors duration-300"
              value={selectedTechStack}
              onChange={(e) => setSelectedTechStack(e.target.value)}
            >
              {uniqueTechStacks.map((tech) => (
                <option key={tech} value={tech}>
                  {toPascalCase(tech)}
                </option>
              ))}
            </select>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col items-center"
          >
            <label htmlFor="projectTypeFilter" className="text-gray-300 text-lg mb-2">Filter by Project Type:</label>
            <select
              id="projectTypeFilter"
              className="bg-gray-800 text-white p-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-auto hover:border-orange-500 transition-colors duration-300"
              value={selectedProjectType}
              onChange={(e) => setSelectedProjectType(e.target.value)}
            >
              {uniqueProjectTypes.map((type) => (
                <option key={type} value={type}>
                  {toPascalCase(type)}
                </option>
              ))}
            </select>
          </motion.div>
        </motion.div>

        <Timeline projectsByYear={projectsByYear} years={years} onCardClick={openDialog} />

        <ProjectDialog project={selectedProject} onClose={closeDialog} />
      </div>
    </motion.div>
  );
};

export default Projects;
