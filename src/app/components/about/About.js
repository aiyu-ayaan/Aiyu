"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaArrowRight,
  FaCode,
  FaGraduationCap,
  FaLaptopCode,
  FaLayerGroup,
  FaMedal,
} from 'react-icons/fa';
import QuestProfile from './QuestProfile';
import QuestMap from './QuestMap';
import Link from 'next/link';
import TypewriterEffect from '../shared/TypewriterEffect';
import Divider from '../landing/Divider';
import RouteBetaBadge from '../shared/RouteBetaBadge';

const cardStyle = {
  background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
  border: '1px solid var(--border-secondary)',
  boxShadow: '0 14px 28px var(--shadow-sm)',
};

const timelineContentStyle = {
  background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-secondary))',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-secondary)',
  borderRadius: '0.95rem',
  boxShadow: '0 10px 24px var(--shadow-sm)',
};

const sectionNavItems = [
  { href: '#summary', label: 'Summary' },
  { href: '#profile', label: 'Profile' },
  { href: '#experience', label: 'Experience' },
  { href: '#skills', label: 'Skills' },
  { href: '#education', label: 'Education' },
  { href: '#certifications', label: 'Certifications' },
];

const statIconMap = {
  projects: FaLayerGroup,
  skills: FaCode,
  education: FaGraduationCap,
  certifications: FaMedal,
};

const getSkillBand = (level = 0) => {
  if (level >= 85) return 'Expert';
  if (level >= 70) return 'Advanced';
  if (level >= 55) return 'Intermediate';
  return 'Fundamentals';
};

const About = ({ data }) => {
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);

  const {
    name = 'Developer',
    roles = [],
    professionalSummary = 'I build software with focus, curiosity, and care for the user experience.',
    skills = [],
    experiences = [],
    education = [],
    certifications = [],
  } = data || {};

  const experiencesMapped = useMemo(() => experiences.map(exp => ({ ...exp, type: 'experience' })), [experiences]);
  const educationMapped = useMemo(() => education.map(edu => ({ ...edu, type: 'education', company: edu.institution, role: edu.degree, description: edu.cgpa ? `CGPA: ${edu.cgpa}` : '' })), [education]);
  const certificationsMapped = useMemo(() => certifications.map(cert => ({ ...cert, type: 'certification', company: cert.issuer, role: cert.name, duration: cert.date })), [certifications]);

  const safeRoles = roles.length ? roles : ['Software Developer'];

  const topSkills = useMemo(
    () => [...skills].sort((a, b) => (b.level || 0) - (a.level || 0)).slice(0, 6),
    [skills]
  );

  const visibleSkills = isSkillsExpanded ? skills : skills.slice(0, 8);

  const statCards = [
    {
      key: 'projects',
      value: experiences.length,
      label: 'Professional Roles',
      accent: 'var(--accent-orange)',
    },
    {
      key: 'skills',
      value: skills.length,
      label: 'Technical Skills',
      accent: 'var(--accent-cyan)',
    },
    {
      key: 'education',
      value: education.length,
      label: 'Education Milestones',
      accent: 'var(--accent-purple)',
    },
    {
      key: 'certifications',
      value: certifications.length,
      label: 'Certifications',
      accent: 'var(--accent-pink)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen overflow-hidden p-4 lg:p-8"
      style={{ color: 'var(--text-primary)' }}
    >
      <div
        className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 42%, transparent), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-pink) 32%, transparent), transparent 68%)' }}
      />

      <div className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%]">
        <motion.section
          id="summary"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="rounded-3xl border p-6 sm:p-8 lg:p-10"
          style={{
            ...cardStyle,
            borderColor: 'color-mix(in srgb, var(--border-cyan) 48%, var(--border-secondary))',
          }}
        >
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-cyan) 45%, var(--border-secondary))',
                color: 'var(--accent-cyan)',
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 78%, transparent)',
              }}
            >
              About Me
            </div>
            <RouteBetaBadge />
          </div>

          <h1
            className="mb-3 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent sm:text-5xl lg:text-6xl"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-orange-bright))',
            }}
          >
            {name}
          </h1>

          <TypewriterEffect roles={safeRoles} />

          <p
            className="mt-6 max-w-4xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {professionalSummary}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#experience"
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold transition-all duration-300"
              style={{
                borderColor: 'var(--accent-cyan)',
                color: 'var(--accent-cyan)',
                backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 9%, transparent)',
              }}
            >
              Explore Journey <FaArrowRight size={14} />
            </Link>
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold transition-all duration-300"
              style={{
                borderColor: 'var(--border-secondary)',
                color: 'var(--text-secondary)',
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
              }}
            >
              Let&apos;s Connect
            </Link>
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.65, delay: 0.2, ease: 'easeOut' }}
          className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {statCards.map((item) => {
            const Icon = statIconMap[item.key];
            return (
              <motion.div
                key={item.key}
                whileHover={{ y: -4 }}
                className="rounded-2xl border p-4"
                style={{
                  ...cardStyle,
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
                }}
              >
                <div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: 'color-mix(in srgb, ' + item.accent + ' 14%, transparent)' }}>
                  <Icon size={16} style={{ color: item.accent }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
              </motion.div>
            );
          })}
        </motion.section>

        <Divider />

        <motion.section
          id="profile"
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65 }}
        >
          <QuestProfile data={data} />
        </motion.section>

        <div className="sticky top-[76px] z-10 mt-6 overflow-x-auto pb-1">
          <div
            className="inline-flex min-w-full gap-2 rounded-xl border p-2"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 88%, transparent)',
              borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {sectionNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <Divider />

        <motion.section
          id="experience"
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65 }}
          className="mt-10"
        >
          <QuestMap 
            items={experiencesMapped} 
            title="Professional Experience" 
            icon={FaLaptopCode} 
            zoneType="experience" 
          />
        </motion.section>

        <Divider />

        <motion.section
          id="skills"
          layout
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65 }}
          className="rounded-3xl border p-6 sm:p-8"
          style={cardStyle}
        >
          <h2 className="mb-5 text-2xl font-bold sm:text-3xl" style={{ color: 'var(--accent-cyan)' }}>
            Technical Skills
          </h2>

          {topSkills.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {topSkills.map((skill) => (
                <span
                  key={`tag-${skill.name}`}
                  className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
                    color: 'var(--accent-purple)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-purple) 12%, transparent)',
                  }}
                >
                  {skill.name}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {visibleSkills.map((skill, index) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ duration: 0.35, delay: index * 0.03 }}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {skill.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>{getSkillBand(skill.level)}</span>
                    <span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>{skill.level}%</span>
                  </div>
                </div>

                <div
                  className="h-3 w-full overflow-hidden rounded-full"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)' }}
                >
                  <motion.div
                    className="relative h-3 rounded-full"
                    style={{
                      background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
                    }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.level || 0}%` }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 1.05, ease: 'easeOut', delay: 0.1 + index * 0.04 }}
                  >
                    <motion.span
                      className="absolute inset-y-0 right-0 w-6"
                      style={{
                        background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.45))',
                      }}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.35, delay: 0.7 + index * 0.04 }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {skills.length > 8 && (
            <motion.button
              onClick={() => setIsSkillsExpanded((prev) => !prev)}
              className="mt-6 rounded-lg border px-4 py-2 font-semibold transition-all duration-300"
              style={{
                color: 'var(--accent-cyan)',
                borderColor: 'var(--accent-cyan)',
                backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 7%, transparent)',
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {isSkillsExpanded ? 'Show fewer skills' : 'Show all skills'}
            </motion.button>
          )}
        </motion.section>

        <Divider />

        <motion.section
          id="education"
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65 }}
          className="mt-10"
        >
          <QuestMap 
            items={educationMapped} 
            title="Education" 
            icon={FaGraduationCap} 
            zoneType="education" 
          />
        </motion.section>

        <Divider />

        <motion.section
          id="certifications"
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65 }}
          className="mt-10"
        >
          <QuestMap 
            items={certificationsMapped} 
            title="Certifications" 
            icon={FaMedal} 
            zoneType="certification" 
          />
        </motion.section>
      </div>
    </motion.div>
  );
};

export default About;
