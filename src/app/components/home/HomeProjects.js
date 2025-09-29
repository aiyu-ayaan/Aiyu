
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import projects from '../../data/projects';
import ProjectCard from '../ProjectCard';

const HomeProjects = () => {
  const latestProjects = projects.slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="bg-gray-900 text-white p-4 lg:p-8"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-cyan-400">Latest Projects</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {latestProjects.map((project, index) => (
            <ProjectCard key={index} project={project} />
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/projects" legacyBehavior>
            <a className="text-cyan-400 hover:underline">Show More</a>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default HomeProjects;
