
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import ProjectDialog from './ProjectDialog';
import ProjectCard from './ProjectCard';

const Projects = () => {
  const [selectedProject, setSelectedProject] = React.useState(null);
  const [selectedTag, setSelectedTag] = React.useState('All');

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
      description: 'A cross-platform expense management application with 500+ active users and a 4.6/5 average rating. Architected with MVVM, Clean Architecture, and Repository Pattern for maintainable, testable code. Implemented real-time data synchronization with Firebase Firestore reducing sync delays by 75%. Created desktop version with WhatsApp Web-style QR authentication, increasing multi-device usage by 45%.',
      codeLink: '#',
    },
    {
      name: 'Research Hub',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['Kotlin Multiplatform', 'Compose', 'Koin', 'Retrofit'],
      year: '2024',
      status: 'Done',
      description: 'A cross-platform research collaboration tool that increased team productivity by 30%. Implemented Kotlin Multiplatform for shared business logic between Android and Desktop platforms. Utilized Kotlin Flow and Coroutines for reactive state management and asynchronous operations. Integrated push notifications with Firebase Cloud Messaging, improving user engagement by 40%.',
      codeLink: '#',
    },
    {
      name: 'BIT App',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['Android', 'Kotlin', 'Firebase', 'MVVM'],
      year: '2021 - Present',
      status: 'Working',
      description: 'An app used by 1000+ university students with a 4.7/5 rating on the Google Play Store. Utilized WorkManager for background tasks and Room for local data storage. Implemented a custom analytics dashboard to monitor usage patterns and inform feature development.',
      codeLink: '#',
    },
    {
      name: 'TTS-Engine',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['Android Library', 'Kotlin'],
      year: '2023',
      status: 'Done',
      description: 'An Android library for Text-to-Speech with real-time text highlighting and lifecycle-aware functionality. Published to JitPack with 500+ downloads and integration in 5+ production applications.',
      codeLink: '#',
    },
  ];

  const allTechStacks = ['All', ...new Set(projects.flatMap((p) => p.techStack))];

  const filteredProjects = selectedTag === 'All' ? projects : projects.filter((p) => p.techStack.includes(selectedTag));

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

        <div className="relative inline-block text-left mb-8 w-full md:w-auto">
            <select
              className="appearance-none w-full bg-gray-800 border border-gray-700 text-white py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-gray-700 focus:border-gray-500"
              onChange={(e) => setSelectedTag(e.target.value)}
              value={selectedTag}
            >
              {allTechStacks.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={index} project={project} onCardClick={openDialog} />
          ))}
        </div>

        <ProjectDialog project={selectedProject} onClose={closeDialog} />
      </div>
    </motion.div>
  );
};

export default Projects;
