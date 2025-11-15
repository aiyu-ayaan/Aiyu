"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaBriefcase, FaGraduationCap, FaCertificate } from 'react-icons/fa';
import TypewriterEffect from '../shared/TypewriterEffect';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from '../../data/aboutData';
import Link from 'next/link';
import Divider from '../landing/Divider';
import ScrollReveal from '../shared/ScrollReveal';
import StaggerContainer from '../shared/StaggerContainer';

const About = () => {
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-12"
        >
          <motion.h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2"
            whileHover={{ scale: 1.02 }}
          >
            {name}
          </motion.h1>
          <TypewriterEffect roles={roles} />
        </motion.div>
          
        <ScrollReveal direction="up" delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
              className="glass-card glass-card-hover p-6 rounded-xl shadow-medium"
            >
              <h2 className="text-3xl font-bold mb-4 text-cyan-400 neon-glow">Summary</h2>
              <p className="text-gray-300 leading-relaxed text-lg">
                {professionalSummary}
              </p>
            </motion.div>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <Divider />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <div className="mt-8">
            <h2 className="text-4xl font-bold mb-8 text-center text-cyan-400 neon-glow">Professional Experience</h2>
            <VerticalTimeline>
              {experiences.map((exp, index) => (
                <VerticalTimelineElement
                  key={index}
                  className="vertical-timeline-element--work"
                  contentStyle={{ 
                    background: 'rgba(31, 41, 55, 0.8)', 
                    color: '#fff',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}
                  contentArrowStyle={{ borderRight: '7px solid  rgba(31, 41, 55, 0.8)' }}
                  iconStyle={{ background: 'rgb(249 115 22)', color: '#fff', boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.2)' }}
                  icon={<FaBriefcase />}
                >
                  <h3 className="vertical-timeline-element-title text-xl font-bold text-orange-400">{exp.role}</h3>
                  <h4 className="vertical-timeline-element-subtitle text-gray-300 font-semibold">{exp.company}</h4>
                  <p className="text-cyan-400 font-medium">{exp.duration}</p>
                  <p className="text-gray-300 mt-2 leading-relaxed">{exp.description}</p>
                </VerticalTimelineElement>
              ))}
            </VerticalTimeline>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <Divider />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mt-8">
            <motion.div
              layout
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3, layout: { duration: 0.3 } }}
              className="glass-card glass-card-hover p-6 rounded-xl shadow-medium"
            >
              <h2 className="text-3xl font-bold mb-6 text-cyan-400 neon-glow">Skills</h2>
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
                      <span className="text-base font-medium text-gray-200">{skill.name}</span>
                      <span className="text-sm font-medium text-cyan-400">{skill.level}%</span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        style={{ width: `${skill.level}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.level}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
              {skills.length > 5 && (
                <motion.button
                  onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold px-6 py-3 mt-4 border-2 border-cyan-400 rounded-lg hover:bg-cyan-400 hover:text-gray-900 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isSkillsExpanded ? 'Show Less ↑' : 'Show More ↓'}
                </motion.button>
              )}
            </motion.div>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <Divider />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <div className="mt-8">
            <h2 className="text-4xl font-bold mb-8 text-center text-cyan-400 neon-glow">Education</h2>
            <VerticalTimeline>
              {education.map((edu, index) => (
                <VerticalTimelineElement
                  key={index}
                  className="vertical-timeline-element--education"
                  contentStyle={{ 
                    background: 'rgba(31, 41, 55, 0.8)', 
                    color: '#fff',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}
                  contentArrowStyle={{ borderRight: '7px solid  rgba(31, 41, 55, 0.8)' }}
                  iconStyle={{ background: 'rgb(249 115 22)', color: '#fff', boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.2)' }}
                  icon={<FaGraduationCap />}
                >
                  <h3 className="vertical-timeline-element-title text-xl font-bold text-orange-400">{edu.institution}</h3>
                  <h4 className="vertical-timeline-element-subtitle text-gray-300 font-semibold">{edu.degree}</h4>
                  <p className="text-cyan-400 font-medium">{edu.duration}</p>
                  <p className="text-gray-400 font-medium mt-1">{edu.cgpa}</p>
                </VerticalTimelineElement>
              ))}
            </VerticalTimeline>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <Divider />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <div className="mt-8">
            <h2 className="text-4xl font-bold mb-8 text-center text-cyan-400 neon-glow">Certifications</h2>
            <VerticalTimeline>
              {certifications.map((cert, index) => (
                <VerticalTimelineElement
                  key={index}
                  className="vertical-timeline-element--education"
                  contentStyle={{ 
                    background: 'rgba(31, 41, 55, 0.8)', 
                    color: '#fff',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}
                  contentArrowStyle={{ borderRight: '7px solid  rgba(31, 41, 55, 0.8)' }}
                  iconStyle={{ background: 'rgb(249 115 22)', color: '#fff', boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.2)' }}
                  icon={<FaCertificate />}
                >
                  {cert.url ? (
                    <Link href={cert.url} target="_blank" rel="noopener noreferrer" legacyBehavior>
                      <a>
                        <h3 className="vertical-timeline-element-title text-xl font-bold text-orange-400 hover:text-orange-300 hover:underline cursor-pointer transition-colors">{cert.name}</h3>
                      </a>
                    </Link>
                  ) : (
                    <h3 className="vertical-timeline-element-title text-xl font-bold text-orange-400">{cert.name}</h3>
                  )}
                  <h4 className="vertical-timeline-element-subtitle text-gray-300 font-semibold">{cert.issuer}</h4>
                  <p className="text-cyan-400 font-medium">{cert.date}</p>
                </VerticalTimelineElement>
              ))}
            </VerticalTimeline>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default About;
