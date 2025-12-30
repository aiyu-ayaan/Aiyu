"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaBriefcase, FaGraduationCap, FaCertificate } from 'react-icons/fa';
import TypewriterEffect from '../shared/TypewriterEffect';
// import { name, roles, professionalSummary, skills, experiences, education, certifications } from '../../data/aboutData';
import Link from 'next/link';
import Divider from '../landing/Divider';
import { useTheme } from '../../context/ThemeContext';

const About = ({ data }) => {
  const { theme } = useTheme();
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);
  const { name, roles, professionalSummary, skills, experiences, education, certifications } = data || {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
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
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 pb-2 bg-gradient-to-r bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
            }}
          >
            {name}
          </h1>
          <TypewriterEffect roles={roles} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="p-8 rounded-2xl shadow-2xl transition-all duration-300"
            style={{
              background: 'linear-gradient(to bottom right, var(--bg-surface), var(--bg-secondary))',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border-secondary)',
            }}
            id="summary"
            whileHover={{
              scale: 1.02,
              y: -5,
              borderColor: 'var(--accent-cyan)',
            }}

          >
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3"
              style={{ color: 'var(--accent-cyan)' }}
            >
              <span style={{ color: 'var(--accent-orange)' }}>{"</>"}</span>
              Professional Summary
            </h2>
            <p
              className="text-lg leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {professionalSummary}
            </p>
          </motion.div>
        </div>

        <Divider />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 text-center flex items-center justify-center gap-2 sm:gap-3"
            style={{ color: 'var(--accent-cyan)' }}
          >
            <span style={{ color: 'var(--accent-orange)' }}>{"<"}</span>
            Professional Experience
            <span style={{ color: 'var(--accent-orange)' }}>{"/>"}</span>
          </h2>
          <VerticalTimeline>
            {experiences.map((exp, index) => (
              <VerticalTimelineElement
                key={index}
                className="vertical-timeline-element--work"
                contentStyle={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
                contentArrowStyle={{
                  borderRight: '7px solid var(--bg-surface)',
                }}
                iconStyle={{
                  background: 'var(--accent-orange)',
                  color: '#fff',
                }}
                icon={<FaBriefcase />}
              >
                <h3
                  className="vertical-timeline-element-title text-xl font-bold"
                  style={{ color: 'var(--accent-orange-bright)' }}
                >
                  {exp.role}
                </h3>
                <h4
                  className="vertical-timeline-element-subtitle"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {exp.company}
                </h4>
                <p style={{ color: 'var(--text-secondary)' }}>{exp.duration}</p>
                <p style={{ color: 'var(--text-secondary)' }}>{exp.description}</p>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </motion.div>

        <Divider />

        <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mt-8">
          <motion.div
            layout
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, layout: { duration: 0.3 } }}
            className="p-8 rounded-2xl shadow-2xl transition-all duration-300"
            style={{
              background: 'linear-gradient(to bottom right, var(--bg-surface), var(--bg-secondary))',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border-secondary)',
            }}
            id="skills"
          >
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3"
              style={{ color: 'var(--accent-cyan)' }}
            >
              <span style={{ color: 'var(--accent-orange)' }}>{"<"}</span>
              Technical Skills
              <span style={{ color: 'var(--accent-orange)' }}>{"/>"}</span>
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
                    <span
                      className="text-base font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {skill.name}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--accent-cyan)' }}
                    >
                      {skill.level}%
                    </span>
                  </div>
                  <div
                    className="w-full rounded-full h-3 overflow-hidden shadow-inner"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  >
                    <motion.div
                      className="h-3 rounded-full relative"
                      style={{
                        width: `${skill.level}%`,
                        background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
                      }}
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
                className="font-semibold mt-6 px-4 py-2 border rounded-lg transition-all duration-300"
                style={{
                  color: 'var(--accent-cyan)',
                  borderColor: 'var(--accent-cyan)',
                }}
                whileHover={{
                  scale: 1.05,
                  backgroundColor: 'var(--bg-hover)',
                }}
                whileTap={{ scale: 0.95 }}
              >
                {isSkillsExpanded ? '↑ Show Less' : '↓ Show More Skills'}
              </motion.button>
            )}
          </motion.div>
        </div>

        <Divider />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 text-center flex items-center justify-center gap-2 sm:gap-3"
            style={{ color: 'var(--accent-cyan)' }}
          >
            <span style={{ color: 'var(--accent-orange)' }}>{"<"}</span>
            Education
            <span style={{ color: 'var(--accent-orange)' }}>{"/>"}</span>
          </h2>
          <VerticalTimeline>
            {education.map((edu, index) => (
              <VerticalTimelineElement
                key={index}
                className="vertical-timeline-element--education"
                contentStyle={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
                contentArrowStyle={{
                  borderRight: '7px solid var(--bg-surface)',
                }}
                iconStyle={{
                  background: 'var(--accent-orange)',
                  color: '#fff',
                }}
                icon={<FaGraduationCap />}
              >
                <h3
                  className="vertical-timeline-element-title text-xl font-bold"
                  style={{ color: 'var(--accent-orange-bright)' }}
                >
                  {edu.institution}
                </h3>
                <h4
                  className="vertical-timeline-element-subtitle"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {edu.degree}
                </h4>
                <p style={{ color: 'var(--text-tertiary)' }}>{edu.duration}</p>
                <p style={{ color: 'var(--text-muted)' }}>{edu.cgpa}</p>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </motion.div>

        <Divider />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 text-center flex items-center justify-center gap-2 sm:gap-3"
            style={{ color: 'var(--accent-cyan)' }}
          >
            <span style={{ color: 'var(--accent-orange)' }}>{"<"}</span>
            Certifications
            <span style={{ color: 'var(--accent-orange)' }}>{"/>"}</span>
          </h2>
          <VerticalTimeline>
            {certifications.map((cert, index) => (
              <VerticalTimelineElement
                key={index}
                className="vertical-timeline-element--education"
                contentStyle={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
                contentArrowStyle={{
                  borderRight: '7px solid var(--bg-surface)',
                }}
                iconStyle={{
                  background: 'var(--accent-orange)',
                  color: '#fff',
                }}
                icon={<FaCertificate />}
              >
                {cert.url ? (
                  <Link href={cert.url} target="_blank" rel="noopener noreferrer" legacyBehavior>
                    <a>
                      <h3
                        className="vertical-timeline-element-title text-xl font-bold hover:underline cursor-pointer"
                        style={{ color: 'var(--accent-orange-bright)' }}
                      >
                        {cert.name}
                      </h3>
                    </a>
                  </Link>
                ) : (
                  <h3
                    className="vertical-timeline-element-title text-xl font-bold"
                    style={{ color: 'var(--accent-orange-bright)' }}
                  >
                    {cert.name}
                  </h3>
                )}
                <h4
                  className="vertical-timeline-element-subtitle"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {cert.issuer}
                </h4>
                <p style={{ color: 'var(--text-tertiary)' }}>{cert.date}</p>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </motion.div>
      </div>
    </motion.div >
  );
};

export default About;
