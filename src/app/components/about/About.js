"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaBriefcase, FaGraduationCap, FaCertificate } from 'react-icons/fa';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TypewriterEffect from '../shared/TypewriterEffect';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from '../../data/aboutData';
import Link from 'next/link';
import Divider from '../landing/Divider';

gsap.registerPlugin(ScrollTrigger);

const About = () => {
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);
  const headerRef = useRef(null);
  const summaryRef = useRef(null);
  const skillsRef = useRef(null);
  const experienceRef = useRef(null);
  const educationRef = useRef(null);
  const certificationsRef = useRef(null);

  useEffect(() => {
    const header = headerRef.current;
    const summary = summaryRef.current;
    const skillsSection = skillsRef.current;
    const experience = experienceRef.current;
    const educationSection = educationRef.current;
    const certificationsSection = certificationsRef.current;

    // Animate header with parallax
    if (header) {
      gsap.fromTo(
        header,
        { opacity: 0, y: -50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
        }
      );
    }

    // Animate summary section
    if (summary) {
      gsap.fromTo(
        summary,
        { opacity: 0, x: -50, scale: 0.95 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: summary,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }

    // Animate skills section
    if (skillsSection) {
      gsap.fromTo(
        skillsSection,
        { opacity: 0, x: 50, scale: 0.95 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: skillsSection,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }

    // Animate experience section
    if (experience) {
      gsap.fromTo(
        experience,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: experience,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }

    // Animate education section
    if (educationSection) {
      gsap.fromTo(
        educationSection,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: educationSection,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }

    // Animate certifications section
    if (certificationsSection) {
      gsap.fromTo(
        certificationsSection,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: certificationsSection,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [isSkillsExpanded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="min-h-screen bg-gray-900 text-white p-4 lg:p-8"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={headerRef}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">{name}</h1>
                    <TypewriterEffect roles={roles} />
                  </motion.div>
          
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                    <motion.div
                      ref={summaryRef}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700 hover:border-cyan-500 transition-all duration-300"
                      whileHover={{ scale: 1.02, y: -5 }}
                    >
                      <h2 className="text-3xl font-bold mb-6 text-cyan-400 flex items-center gap-3">
                        <span className="text-orange-500">{"</>"}</span>
                        Professional Summary
                      </h2>
                      <p className="text-gray-300 text-lg leading-relaxed">
                        {professionalSummary}
                      </p>
                    </motion.div>
        </div>

        <Divider />

        <motion.div
          ref={experienceRef}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-4xl font-bold mb-8 text-center text-cyan-400 flex items-center justify-center gap-3">
            <span className="text-orange-500">{"<"}</span>
            Professional Experience
            <span className="text-orange-500">{"/>"}</span>
          </h2>
          <VerticalTimeline>
            {experiences.map((exp, index) => (
              <VerticalTimelineElement
                key={index}
                className="vertical-timeline-element--work"
                contentStyle={{ background: 'rgb(31 41 55)', color: '#fff' }}
                contentArrowStyle={{ borderRight: '7px solid  rgb(31 41 55)' }}
                iconStyle={{ background: 'rgb(249 115 22)', color: '#fff' }}
                icon={<FaBriefcase />}
              >
                <h3 className="vertical-timeline-element-title text-xl font-bold text-orange-400">{exp.role}</h3>
                <h4 className="vertical-timeline-element-subtitle text-gray-400">{exp.company}</h4>
                <p className="text-gray-300">{exp.duration}</p>
                <p className="text-gray-300">{exp.description}</p>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </motion.div>

        <Divider />

        <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mt-8">
          <motion.div
            ref={skillsRef}
            layout
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, layout: { duration: 0.3 } }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700 hover:border-cyan-500 transition-all duration-300"
          >
            <h2 className="text-3xl font-bold mb-6 text-cyan-400 flex items-center gap-3">
              <span className="text-orange-500">{"<"}</span>
              Technical Skills
              <span className="text-orange-500">{"/>"}</span>
            </h2>
            <div className="space-y-4">
              {skills.map((skill, index) => (
                <motion.div
                  key={skill.name}
                  layout
                  initial={{ opacity: 0, y: -20 }}
                  animate={{
                    opacity: isSkillsExpanded || index < 5 ? 1 : 0,
                    y: isSkillsExpanded || index < 5 ? 0 : -20,
                    height: isSkillsExpanded || index < 5 ? 'auto' : 0,
                    marginBottom: isSkillsExpanded || index < 5 ? '1rem' : 0,
                  }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="flex justify-between mb-2">
                    <span className="text-base font-medium text-gray-300">{skill.name}</span>
                    <span className="text-sm font-medium text-cyan-400">{skill.level}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                    <motion.div
                      className="h-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 relative"
                      style={{ width: `${skill.level}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.level}%` }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-white"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                        style={{ opacity: 0.3 }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
            {skills.length > 5 && (
              <motion.button
                onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
                className="text-cyan-400 hover:text-cyan-300 font-semibold mt-6 px-4 py-2 border border-cyan-400 rounded-lg hover:bg-cyan-400 hover:bg-opacity-10 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isSkillsExpanded ? '↑ Show Less' : '↓ Show More Skills'}
              </motion.button>
            )}
          </motion.div>
        </div>

        <Divider />

        <motion.div
          ref={educationRef}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-4xl font-bold mb-8 text-center text-cyan-400 flex items-center justify-center gap-3">
            <span className="text-orange-500">{"<"}</span>
            Education
            <span className="text-orange-500">{"/>"}</span>
          </h2>
          <VerticalTimeline>
            {education.map((edu, index) => (
              <VerticalTimelineElement
                key={index}
                className="vertical-timeline-element--education"
                contentStyle={{ background: 'rgb(31 41 55)', color: '#fff' }}
                contentArrowStyle={{ borderRight: '7px solid  rgb(31 41 55)' }}
                iconStyle={{ background: 'rgb(249 115 22)', color: '#fff' }}
                icon={<FaGraduationCap />}
              >
                <h3 className="vertical-timeline-element-title text-xl font-bold text-orange-400">{edu.institution}</h3>
                <h4 className="vertical-timeline-element-subtitle text-gray-300">{edu.degree}</h4>
                <p className="text-gray-400">{edu.duration}</p>
                <p className="text-gray-500">{edu.cgpa}</p>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </motion.div>

        <Divider />

        <motion.div
          ref={certificationsRef}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-4xl font-bold mb-8 text-center text-cyan-400 flex items-center justify-center gap-3">
            <span className="text-orange-500">{"<"}</span>
            Certifications
            <span className="text-orange-500">{"/>"}</span>
          </h2>
          <VerticalTimeline>
            {certifications.map((cert, index) => (
              <VerticalTimelineElement
                key={index}
                className="vertical-timeline-element--education"
                contentStyle={{ background: 'rgb(31 41 55)', color: '#fff' }}
                contentArrowStyle={{ borderRight: '7px solid  rgb(31 41 55)' }}
                iconStyle={{ background: 'rgb(249 115 22)', color: '#fff' }}
                icon={<FaCertificate />}
              >
                {cert.url ? (
                  <Link href={cert.url} target="_blank" rel="noopener noreferrer" legacyBehavior>
                    <a>
                      <h3 className="vertical-timeline-element-title text-xl font-bold text-orange-400 hover:underline cursor-pointer">{cert.name}</h3>
                    </a>
                  </Link>
                ) : (
                  <h3 className="vertical-timeline-element-title text-xl font-bold text-orange-400">{cert.name}</h3>
                )}
                <h4 className="vertical-timeline-element-subtitle text-gray-300">{cert.issuer}</h4>
                <p className="text-gray-400">{cert.date}</p>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default About;
