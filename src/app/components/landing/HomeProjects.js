"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaArrowRight, FaBoxes, FaCheckCircle, FaTools } from 'react-icons/fa';
import ProjectCard from '../projects/ProjectCard';
import ProjectDialog from '../projects/ProjectDialog';

const normalizeStatus = (status) => {
  const safeStatus = String(status || '').trim().toLowerCase();
  if (safeStatus === 'done' || safeStatus === 'completed') return 'Done';
  if (safeStatus === 'deferred' || safeStatus === 'deffered' || safeStatus === 'on hold') return 'Deferred';
  if (safeStatus === 'working' || safeStatus === 'in progress') return 'Working';
  return safeStatus;
};

const HomeProjects = ({ data }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const projects = Array.isArray(data) ? data : [];

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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative p-4 lg:p-8"
      style={{
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="pointer-events-none absolute -right-6 top-4 h-44 w-44 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 26%, transparent), transparent 70%)' }}
      />

      <div className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%] rounded-3xl border p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
          borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
          boxShadow: '0 16px 36px var(--shadow-sm)',
        }}
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-orange) 45%, var(--border-secondary))',
                color: 'var(--accent-orange)',
              }}
            >
              Featured Work
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Latest Projects
            </h2>
            <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Recent builds with production-focused architecture and clean user experience.
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
            }}
          >
            View All Projects <FaArrowRight size={12} />
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-xl border p-3"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                }}
              >
                <div className="mb-2 inline-flex rounded-lg p-2"
                  style={{ backgroundColor: `color-mix(in srgb, ${item.accent} 14%, transparent)` }}
                >
                  <Icon size={14} style={{ color: item.accent }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
              </div>
            );
          })}
        </div>

        {latestProjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {latestProjects.map((project, index) => (
              <ProjectCard key={project?._id || `${project?.name}-${index}`} project={project} onCardClick={setSelectedProject} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl border p-8 text-center"
            style={{
              borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
            }}
          >
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
    </motion.div>
  );
};

export default HomeProjects;
