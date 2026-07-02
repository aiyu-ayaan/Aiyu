"use client";

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaBoxes, FaCheckCircle, FaTools } from 'react-icons/fa';
import ProjectCard from '../../projects/ProjectCard';
import ProjectDialog from '../../projects/ProjectDialog';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';

const normalizeStatus = (status) => {
  const safeStatus = String(status || '').trim().toLowerCase();
  if (safeStatus === 'done' || safeStatus === 'completed') return 'Done';
  if (safeStatus === 'deferred' || safeStatus === 'deffered' || safeStatus === 'on hold') return 'Deferred';
  if (safeStatus === 'working' || safeStatus === 'in progress') return 'Working';
  return safeStatus;
};

/**
 * Projects chapter, v2: stat tiles flip up from flat with count-ups, then the
 * project cards surface from camera depth one by one. Reuses the shared
 * ProjectCard / ProjectDialog so behavior matches the rest of the site.
 */
const V2Projects = ({ data }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();
  const projects = Array.isArray(data) ? data : [];

  useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

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
      style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', perspective: '1400px' }}
    >
      <div
        data-v2-depth="0.3"
        className="pointer-events-none absolute -right-6 top-4 h-44 w-44 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 11%, transparent), transparent 70%)' }}
      />

      <div
        data-v2="float"
        data-v2-tilt
        className="chapter-panel glass-panel relative mx-auto flex w-full max-w-[95%] flex-col justify-center p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
      >
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div data-v2="door-left" className="max-w-2xl">
            <p className="eyebrow mb-3">Featured Work</p>
            <h2 className="headline-section">Latest projects.</h2>
            <p className="subcopy mt-4">
              Recent builds with production-focused architecture and clean user experience.
            </p>
          </div>
          <Link href="/projects" data-v2="door-right" className="pill-ghost self-start lg:self-auto">
            View All Projects <FaArrowRight size={12} />
          </Link>
        </div>

        <div data-v2-group data-v2-stagger="0.1" className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5" style={{ perspective: '1100px' }}>
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} data-v2="flip-x" className="glass-tile p-6">
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
          <div data-v2-group data-v2-stagger="0.14" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-7" style={{ perspective: '1300px' }}>
            {latestProjects.map((project, index) => (
              <div key={project?._id || `${project?.name}-${index}`} data-v2="deep">
                <ProjectCard project={project} onCardClick={setSelectedProject} />
              </div>
            ))}
          </div>
        ) : (
          <div data-v2="float" className="glass-tile p-10 text-center">
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

export default V2Projects;
