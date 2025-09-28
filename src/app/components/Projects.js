
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import ProjectDialog from './ProjectDialog';
import Timeline from './Timeline';

const Projects = () => {
  const [selectedProject, setSelectedProject] = React.useState(null);
  

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
      name: 'Project Alpha',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['React', 'Node.js', 'MongoDB'],
      year: '2025',
      status: 'Working',
      description: 'A dummy project for testing the timeline.',
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
      name: 'Project Beta',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['Vue.js', 'Express', 'PostgreSQL'],
      year: '2024',
      status: 'Done',
      description: 'Another dummy project for testing.',
      codeLink: '#',
    },
    {
      name: 'BIT App',
      image: 'https://via.placeholder.com/400x250',
      techStack: ['Android', 'Kotlin', 'Firebase', 'MVVM'],
      year: '2023',
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

  const projectsByYear = projects.reduce((acc, project) => {
    const year = project.year.split(' - ')[0];
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(project);
    return acc;
  }, {});

  const years = Object.keys(projectsByYear).sort((a, b) => b - a);

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

        

        <Timeline projectsByYear={projectsByYear} years={years} onCardClick={openDialog} />

        <ProjectDialog project={selectedProject} onClose={closeDialog} />
      </div>
    </motion.div>
  );
};

export default Projects;
