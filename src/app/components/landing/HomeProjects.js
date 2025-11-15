"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import projects from '../../data/projectsData';
import ProjectCard from '../projects/ProjectCard';
import ProjectDialog from '../projects/ProjectDialog';
import ScrollReveal from '../shared/ScrollReveal';
import StaggerContainer from '../shared/StaggerContainer';

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
    <div className="bg-gray-900 text-white p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal direction="up" delay={0.2}>
          <h2 className="text-3xl font-bold mb-8 text-cyan-400 neon-glow text-center">Latest Projects</h2>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.15} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {latestProjects.map((project, index) => (
            <ProjectCard key={index} project={project} onCardClick={openDialog} />
          ))}
        </StaggerContainer>
        
        <ScrollReveal direction="up" delay={0.3}>
          <div className="text-center mt-8">
            <Link href="/projects" legacyBehavior>
              <motion.a 
                className="inline-block text-cyan-400 hover:text-cyan-300 font-semibold px-6 py-3 border-2 border-cyan-400 rounded-lg hover:bg-cyan-400 hover:text-gray-900 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Show More →
              </motion.a>
            </Link>
          </div>
        </ScrollReveal>
      </div>
      <ProjectDialog project={selectedProject} onClose={closeDialog} />
    </div>
  );
};

export default HomeProjects;