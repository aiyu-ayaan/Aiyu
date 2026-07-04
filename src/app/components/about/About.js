"use client";

import React, { useMemo, useState, useRef } from 'react';
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
import { usePathname } from 'next/navigation';
import { getVersionedPath } from '@/lib/siteVersion';
import TypewriterEffect from '../shared/TypewriterEffect';
import Divider from '../landing/Divider';
import RouteBetaBadge from '../shared/RouteBetaBadge';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { useSectionFx } from '../shared/gsapScroll';

const cardStyle = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 58%, transparent), color-mix(in srgb, var(--bg-secondary) 46%, transparent))',
  border: '1px solid var(--hairline)',
  boxShadow: 'var(--shadow-panel)',
  backdropFilter: 'blur(28px) saturate(150%)',
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
  const pathname = usePathname();
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);
  const ref = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  useSectionFx(ref, { reducedMotion: prefersReducedMotion });

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
    <div
      ref={ref}
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
        <section
          id="summary"
          data-reveal="tilt"
          className="glass-panel overflow-hidden p-6 sm:p-8 lg:p-10"
          style={{
            ...cardStyle,
            borderColor: 'color-mix(in srgb, var(--accent-cyan) 48%, var(--border-secondary))',
          }}
        >
          <div className="mb-5 flex flex-wrap items-center gap-2" data-reveal="rise">
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

          <h1 className="headline-section mb-3" data-reveal="left">
            {name}
          </h1>

          <div data-reveal="rise">
            <TypewriterEffect roles={safeRoles} />
          </div>

          <p
            data-reveal="left-soft"
            className="subcopy mt-6 max-w-4xl !text-base sm:!text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {professionalSummary}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3" data-reveal="rise">
            <Link
              href="#experience"
              className="pill-solid"
            >
              Explore Journey <FaArrowRight size={14} />
            </Link>
            <Link
              href={getVersionedPath(pathname, "/contact-us")}
              className="pill-ghost"
            >
              Let&apos;s Connect
            </Link>
          </div>
        </section>

        <section
          data-reveal-auto
          data-reveal-stagger="0.08"
          className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {statCards.map((item) => {
            const Icon = statIconMap[item.key];
            return (
              <div
                key={item.key}
                className="glass-tile p-4 transition-transform duration-300 hover:-translate-y-1"
                style={{
                  ...cardStyle,
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
                }}
              >
                <div className="mb-3 inline-flex rounded-lg p-2" style={{ backgroundColor: 'color-mix(in srgb, ' + item.accent + ' 14%, transparent)' }}>
                  <Icon size={16} style={{ color: item.accent }} />
                </div>
                <p className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-bright)' }}>{item.value}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
              </div>
            );
          })}
        </section>

        <Divider />

        <section
          id="profile"
          data-reveal="tilt"
        >
          <QuestProfile data={data} />
        </section>

        <div className="sticky top-[76px] z-10 mt-6 overflow-x-auto pb-1" data-reveal="rise">
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

        <section
          id="experience"
          data-reveal="tilt"
          className="mt-10"
        >
          <QuestMap 
            items={experiencesMapped} 
            title="Professional Experience" 
            icon={FaLaptopCode} 
            zoneType="experience" 
          />
        </section>

        <Divider />

        <section
          id="skills"
          data-reveal="tilt"
          className="glass-panel p-6 sm:p-8"
          style={cardStyle}
        >
          <h2 className="headline-section mb-5 !text-2xl sm:!text-3xl">
            Technical Skills
          </h2>

          {topSkills.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2" data-reveal="rise">
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

          <div className="space-y-4" data-reveal-group data-reveal-stagger="0.04">
            {visibleSkills.map((skill, index) => (
              <div
                key={skill.name}
                data-reveal="rise"
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
                    viewport={{ once: true }}
                    transition={{ duration: 1.05, ease: 'easeOut', delay: 0.15 }}
                  >
                    <motion.span
                      className="absolute inset-y-0 right-0 w-6"
                      style={{
                        background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.45))',
                      }}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.35, delay: 0.6 }}
                    />
                  </motion.div>
                </div>
              </div>
            ))}
          </div>

          {skills.length > 8 && (
            <button
              onClick={() => setIsSkillsExpanded((prev) => !prev)}
              className="pill-ghost mt-8 transition-transform duration-200 hover:scale-[1.03]"
              data-reveal="rise"
            >
              {isSkillsExpanded ? 'Show fewer skills' : 'Show all skills'}
            </button>
          )}
        </section>

        <Divider />

        <section
          id="education"
          data-reveal="tilt"
          className="mt-10"
        >
          <QuestMap 
            items={educationMapped} 
            title="Education" 
            icon={FaGraduationCap} 
            zoneType="education" 
          />
        </section>

        <Divider />

        <section
          id="certifications"
          data-reveal="tilt"
          className="mt-10"
        >
          <QuestMap 
            items={certificationsMapped} 
            title="Certifications" 
            icon={FaMedal} 
            zoneType="certification" 
          />
        </section>
      </div>
    </div>
  );
};

export default About;
