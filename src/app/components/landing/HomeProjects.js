"use client";

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaBoxes, FaCheckCircle, FaTools } from 'react-icons/fa';
import ProjectCard from '../projects/ProjectCard';
import ProjectDialog from '../projects/ProjectDialog';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { useSectionFx } from '../shared/gsapScroll';

const normalizeStatus = (status) => {
  const safeStatus = String(status || '').trim().toLowerCase();
  if (safeStatus === 'done' || safeStatus === 'completed') return 'Done';
  if (safeStatus === 'deferred' || safeStatus === 'deffered' || safeStatus === 'on hold') return 'Deferred';
  if (safeStatus === 'working' || safeStatus === 'in progress') return 'Working';
  return safeStatus;
};

const HomeProjects = ({ data }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();
  const projects = Array.isArray(data) ? data : [];

  useSectionFx(sectionRef, { reducedMotion: prefersReducedMotion });

  const latestProjects = useMemo(() => projects.slice(0, 3), [projects]);
  const doneProjects = useMemo(
    () => projects.filter((project) => normalizeStatus(project?.status) === 'Done').length,
    [projects]
  );
  const uniqueStacks = useMemo(() => {
    const stackSet = new Set(projects.flatMap((project) => project?.techStack || []));
    return stackSet.size;
  }, [projects]);

  const statCards = [
    { label: 'Total Projects', value: projects.length, icon: FaBoxes, accent: 'var(--accent-cyan)' },
    { label: 'Completed', value: doneProjects, icon: FaCheckCircle, accent: 'var(--status-success)' },
    { label: 'Tech Used', value: uniqueStacks, icon: FaTools, accent: 'var(--accent-purple)' },
  ];

  return (
    <div
      ref={sectionRef}
      className="chapter-section"
      style={{
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        perspective: '1400px',
      }}
    >
      <div
        data-parallax="0.3"
        className="pointer-events-none absolute -right-6 top-4 h-44 w-44 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 11%, transparent), transparent 70%)' }}
      />

      <div
        data-reveal="tilt"
        className="chapter-panel glass-panel relative mx-auto flex w-full max-w-[95%] flex-col justify-center p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
      >
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div data-reveal="left" className="max-w-2xl">
            <p className="eyebrow mb-3">Featured Work</p>
            <h2 className="headline-section">
              Latest projects.
            </h2>
            <p className="subcopy mt-4">
              Recent builds with production-focused architecture and clean user experience.
            </p>
          </div>
          <Link href="/projects" data-reveal="right" className="pill-ghost self-start lg:self-auto">
            View All Projects <FaArrowRight size={12} />
          </Link>
        </div>

        <div data-reveal-group data-reveal-stagger="0.09" className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                data-reveal="flip"
                className="glass-tile p-6"
              >
                <div
                  className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border"
                  style={{ backgroundColor: `color-mix(in srgb, ${item.accent} 12%, transparent)` }}
                >
                  <Icon size={14} style={{ color: item.accent }} />
                </div>
                <p className="text-4xl font-semibold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                  <span data-counter={item.value}>{item.value}</span>
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
              </div>
            );
          })}
        </div>

        {latestProjects.length > 0 ? (
          <div data-reveal-group data-reveal-stagger="0.11" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-7">
            {latestProjects.map((project, index) => (
              <div key={project?._id || `${project?.name}-${index}`} data-reveal="flip">
                <ProjectCard project={project} onCardClick={setSelectedProject} />
              </div>
            ))}
          </div>
        ) : (
          <div data-reveal="zoom" className="glass-tile p-10 text-center">
            <h3 className="mb-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Projects Coming Soon
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Add projects from the admin panel and they will appear here automatically.
            </p>
          </div>
        )}
      </div>

      <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
};

export default HomeProjects;
