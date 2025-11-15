
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
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">Projects Portfolio</h1>
          <TypewriterEffect roles={roles} />
        </motion.div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <motion.div 
            className="flex flex-col items-center"
            whileHover={{ scale: 1.02 }}
          >
            <label htmlFor="techStackFilter" className="text-gray-300 text-lg mb-2 font-semibold">Filter by Tech Stack:</label>
            <select
              id="techStackFilter"
              className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-3 rounded-lg border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 w-full md:w-auto cursor-pointer hover:border-cyan-600 transition-all duration-300"
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
            className="flex flex-col items-center"
            whileHover={{ scale: 1.02 }}
          >
            <label htmlFor="projectTypeFilter" className="text-gray-300 text-lg mb-2 font-semibold">Filter by Project Type:</label>
            <select
              id="projectTypeFilter"
              className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-3 rounded-lg border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 w-full md:w-auto cursor-pointer hover:border-cyan-600 transition-all duration-300"
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
        </div>

        <Timeline projectsByYear={projectsByYear} years={years} onCardClick={openDialog} />

        <ProjectDialog project={selectedProject} onClose={closeDialog} />
      </div>
    </motion.div>
  );
};

export default Projects;
