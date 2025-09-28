
"use client";
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import ProjectDialog from './ProjectDialog';
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

  const projects = [
    {
      name: 'ExpenseSync',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['Kotlin', 'Jetpack Compose', 'Firebase', 'Koin', 'MVVM'],
      year: '2025',
      status: 'Done',
      projectType: 'application',
      description: 'A cross-platform expense management application with 500+ active users and a 4.6/5 average rating. Architected with MVVM, Clean Architecture, and Repository Pattern for maintainable, testable code. Implemented real-time data synchronization with Firebase Firestore reducing sync delays by 75%. Created desktop version with WhatsApp Web-style QR authentication, increasing multi-device usage by 45%.',
      codeLink: '#',
    },
    {
      name: 'Project Alpha',
      techStack: ['React', 'Node.js', 'MongoDB'],
      year: '2025',
      status: 'Working',
      projectType: 'application',
      description: 'A dummy project for testing the timeline.',
    },
    {
      name: 'Research Hub',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['Kotlin Multiplatform', 'Compose', 'Koin', 'Retrofit'],
      year: '2024',
      status: 'Done',
      projectType: 'application',
      description: 'A cross-platform research collaboration tool that increased team productivity by 30%. Implemented Kotlin Multiplatform for shared business logic between Android and Desktop platforms. Utilized Kotlin Flow and Coroutines for reactive state management and asynchronous operations. Integrated push notifications with Firebase Cloud Messaging, improving user engagement by 40%.',
      codeLink: '#',
    },
    {
      name: 'Project Beta',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['Vue.js', 'Express', 'PostgreSQL'],
      year: '2024',
      status: 'Done',
      projectType: 'application',
      description: 'Another dummy project for testing.',
      codeLink: '#',
    },
    {
      name: 'BIT App',
      image: 'https://aiyu-ayaan.github.io/BIT-App/assets/poster.png',
      techStack: ['Android', 'Kotlin', 'Firebase', 'MVVM'],
      year: '2023',
      status: 'Working',
      projectType: 'application',
      description: 'An app used by 1000+ university students with a 4.7/5 rating on the Google Play Store. Utilized WorkManager for background tasks and Room for local data storage. Implemented a custom analytics dashboard to monitor usage patterns and inform feature development.',
      codeLink: '#',
    },
    {
      name: 'TTS-Engine',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['Android Library', 'Kotlin'],
      year: '2023',
      status: 'Done',
      projectType: 'library',
      description: 'An Android library for Text-to-Speech with real-time text highlighting and lifecycle-aware functionality. Published to JitPack with 500+ downloads and integration in 5+ production applications.',
      codeLink: '#',
    },
  ];

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
    const year = project.year.split(' - ')[0];
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
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2">Projects</h1>
          <p className="text-blue-400 text-lg sm:text-xl">&gt; A collection of my work</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <div className="flex flex-col items-center">
            <label htmlFor="techStackFilter" className="text-gray-300 text-lg mb-2">Filter by Tech Stack:</label>
            <select
              id="techStackFilter"
              className="bg-gray-800 text-white p-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-auto"
              value={selectedTechStack}
              onChange={(e) => setSelectedTechStack(e.target.value)}
            >
              {uniqueTechStacks.map((tech) => (
                <option key={tech} value={tech}>
                  {toPascalCase(tech)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col items-center">
            <label htmlFor="projectTypeFilter" className="text-gray-300 text-lg mb-2">Filter by Project Type:</label>
            <select
              id="projectTypeFilter"
              className="bg-gray-800 text-white p-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-auto"
              value={selectedProjectType}
              onChange={(e) => setSelectedProjectType(e.target.value)}
            >
              {uniqueProjectTypes.map((type) => (
                <option key={type} value={type}>
                  {toPascalCase(type)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Timeline projectsByYear={projectsByYear} years={years} onCardClick={openDialog} />

        <ProjectDialog project={selectedProject} onClose={closeDialog} />
      </div>
    </motion.div>
  );
};

export default Projects;
