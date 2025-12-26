"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
// import projects, { roles } from '../../data/projectsData';
import ProjectDialog from './ProjectDialog';
import TypewriterEffect from '../shared/TypewriterEffect';
import Timeline from './Timeline';
import { useTheme } from '../../context/ThemeContext';

const Projects = ({ data }) => {
  const { theme } = useTheme();
  const projects = data || [];
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setConfigLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch config', err);
        setConfigLoading(false);
      });
  }, []);

  const roles = [
    config?.projectsSubtitle || 'A collection of my work',
    'Click on a project to learn more'
  ];

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
      className="min-h-screen p-4 lg:p-8 transition-colors duration-300"
      style={{
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          {configLoading ? (
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-16 w-3/4 max-w-lg bg-gray-700/50 rounded-lg mb-4"></div>
              <div className="h-8 w-1/2 max-w-md bg-gray-700/50 rounded-lg"></div>
            </div>
          ) : (
            <>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 pb-2 bg-gradient-to-r bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
                }}
              >
                {config?.projectsTitle || 'Projects Portfolio'}
              </h1>
              <TypewriterEffect roles={roles} />
            </>
          )}
        </motion.div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <motion.div
            className="flex flex-col items-center"
            whileHover={{ scale: 1.02 }}
          >
            <label
              htmlFor="techStackFilter"
              className="text-lg mb-2 font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Filter by Tech Stack:
            </label>
            <select
              id="techStackFilter"
              className="p-3 rounded-lg border-2 focus:outline-none focus:ring-2 w-full md:w-auto cursor-pointer transition-all duration-300"
              style={{
                background: 'linear-gradient(to bottom right, var(--bg-surface), var(--bg-secondary))',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-secondary)',
              }}
              value={selectedTechStack}
              onChange={(e) => setSelectedTechStack(e.target.value)}
            >
              {uniqueTechStacks.map((tech) => (
                <option
                  key={tech}
                  value={tech}
                  className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
                >
                  {toPascalCase(tech)}
                </option>
              ))}
            </select>
          </motion.div>

          <motion.div
            className="flex flex-col items-center"
            whileHover={{ scale: 1.02 }}
          >
            <label
              htmlFor="projectTypeFilter"
              className="text-lg mb-2 font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Filter by Project Type:
            </label>
            <select
              id="projectTypeFilter"
              className="p-3 rounded-lg border-2 focus:outline-none focus:ring-2 w-full md:w-auto cursor-pointer transition-all duration-300"
              style={{
                background: 'linear-gradient(to bottom right, var(--bg-surface), var(--bg-secondary))',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-secondary)',
              }}
              value={selectedProjectType}
              onChange={(e) => setSelectedProjectType(e.target.value)}
            >
              {uniqueProjectTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                  className={theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
                >
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
