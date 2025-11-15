"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import projects from '../../data/projectsData';
import ProjectCard from '../projects/ProjectCard';
import ProjectDialog from '../projects/ProjectDialog';

gsap.registerPlugin(ScrollTrigger);

const HomeProjects = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRef = useRef([]);
  const isInView = useInView(sectionRef, { once: false, margin: "-100px" });

  const openDialog = (project) => {
    setSelectedProject(project);
  };

  const closeDialog = () => {
    setSelectedProject(null);
  };

  const latestProjects = projects.slice(0, 2);

  useEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    const cards = cardsRef.current;

    if (!section || !title || cards.length === 0) return;

    // Animate title
    gsap.fromTo(
      title,
      { opacity: 0, x: -50 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    // Stagger animate cards
    gsap.fromTo(
      cards,
      { opacity: 0, y: 50, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="bg-gray-900 text-white p-4 lg:p-8"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2 
          ref={titleRef}
          className="text-4xl font-bold mb-8 text-cyan-400 flex items-center gap-3"
          animate={isInView ? { x: [0, 10, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <span className="text-orange-500">{"<"}</span>
          Latest Projects
          <span className="text-orange-500">{"/>"}</span>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {latestProjects.map((project, index) => (
            <div 
              key={index} 
              ref={(el) => (cardsRef.current[index] = el)}
            >
              <ProjectCard project={project} onCardClick={openDialog} />
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/projects" legacyBehavior>
            <motion.a 
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold text-lg px-6 py-3 rounded-lg border-2 border-cyan-400 hover:border-cyan-300 transition-all duration-300 group"
              whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(34, 211, 238, 0.5)" }}
              whileTap={{ scale: 0.95 }}
            >
              View All Projects
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.a>
          </Link>
        </div>
      </div>
      <ProjectDialog project={selectedProject} onClose={closeDialog} />
    </motion.div>
  );
};

export default HomeProjects;