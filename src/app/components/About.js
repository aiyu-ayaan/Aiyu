
"use client";
import React from 'react';
import { motion } from 'framer-motion';

const About = () => {
  const skills = [
    { name: 'Kotlin (Advanced)', level: 90 },
    { name: 'Java (Intermediate)', level: 70 },
    { name: 'Python (Intermediate)', level: 60 },
    { name: 'C# (Basic)', level: 40 },
    { name: 'JavaScript (Basic)', level: 50 },
  ];

  

  const experiences = [
    {
      company: 'Adrosonic',
      role: 'Software Engineer',
      duration: 'Jun 2025 - Present',
      description: 'Developing enterprise-level applications using WordPress and .NET Framework. Building scalable web applications with modern backend technologies.',
    },
    {
      company: 'Adrosonic',
      role: 'Software Engineer (Trainee) - Internship',
      duration: 'Dec 2024 - Jun 2025',
      description: 'Developed a POC for Dynamics 365 and Instanda integration, reducing process automation time by 40%. Redesigned office website UI/UX, improving load times and user engagement.',
    },
    {
      company: 'BeyondSchool',
      role: 'Android Developer Intern',
      duration: 'Jul 2022 - Mar 2023',
      description: 'Implemented Text-to-Speech and Speech-to-Text functionality, increasing app accessibility. Designed and integrated gamification features, boosting user retention.',
    },
  ];

  const education = [
    {
      institution: 'Birla Institute of Technology, Mesra',
      degree: 'Master of Computer Applications',
      duration: 'Aug 2023 - May 2025',
      cgpa: '8.1/10.0',
    },
    {
      institution: 'Birla Institute of Technology, Mesra',
      degree: 'Bachelor of Computer Applications',
      duration: 'Aug 2019 - May 2022',
      cgpa: '8.2/10.0',
    },
  ];

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
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2">Ayaan Ansari</h1>
          <p className="text-blue-400 text-lg sm:text-xl">&gt; Mobile Android Developer</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">Professional Summary</h2>
            <p className="text-gray-300">
              Android Developer with 2+ years of experience building innovative mobile applications with Kotlin and Jetpack Compose. Proven track record of implementing responsive UIs, integrating APIs, and delivering user-focused solutions. Passionate about creating high-performance, scalable mobile experiences with modern architecture patterns.
            </p>
          </motion.div>

          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">Technical Skills</h2>
            <div className="space-y-4">
              {skills.map((skill) => (
                <div key={skill.name}>
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
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        
        
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-cyan-400">Professional Experience</h2>
          <div className="space-y-6">
            {experiences.map((exp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 * index }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-orange-400">{exp.role}</h3>
                  <span className="text-gray-400">{exp.duration}</span>
                </div>
                <p className="text-gray-500 mb-4">{exp.company}</p>
                <p className="text-gray-300">{exp.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-cyan-400">Education</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {education.map((edu, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 * index }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <h3 className="text-xl font-bold text-orange-400">{edu.institution}</h3>
                <p className="text-gray-300">{edu.degree}</p>
                <p className="text-gray-400">{edu.duration}</p>
                <p className="text-gray-500">{edu.cgpa}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default About;
