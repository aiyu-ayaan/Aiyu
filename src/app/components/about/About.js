"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaBriefcase, FaGraduationCap, FaCertificate } from 'react-icons/fa';
import TypewriterEffect from '../shared/TypewriterEffect';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from '../../data/aboutData';
import Link from 'next/link';

const About = () => {
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);

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
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2">{name}</h1>
                    <TypewriterEffect roles={roles} />
                  </motion.div>
          
                  <div class="grid grid-cols-1 md:grid-cols-1 gap-8">
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="bg-gray-800 p-6 rounded-lg"
                    >
                      <h2 className="text-2xl font-bold mb-4 text-cyan-400">Summary</h2>
                      <p className="text-gray-300">
                        {professionalSummary}
                      </p>
                    </motion.div>
        </div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-cyan-400">Professional Experience</h2>
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

        <div class="grid grid-cols-1 md:grid-cols-1 gap-8 mt-8">
          <motion.div
            layout
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, layout: { duration: 0.3 } }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">Skills</h2>
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
                  <div className="flex justify-between mb-1">
                    <span className="text-base font-medium text-gray-300">{skill.name}</span>
                    <span className="text-sm font-medium text-gray-400">{skill.level}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <motion.div
                      className="bg-blue-500 h-2.5 rounded-full"
                      style={{ width: `${skill.level}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.level}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            {skills.length > 5 && (
              <button
                onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
                className="text-cyan-400 hover:underline mt-4"
              >
                {isSkillsExpanded ? 'Show Less' : 'Show More'}
              </button>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-cyan-400">Education</h2>
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

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-cyan-400">Certifications</h2>
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