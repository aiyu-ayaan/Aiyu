"use client";

import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { FaCalendarDay, FaCodeBranch } from 'react-icons/fa';
import TechStackDialog from './TechStackDialog';
import { getPlaceholderGradient, getProjectInitials } from './projectPlaceholder';

const normalizeStatus = (status) => {
  const safeStatus = String(status || '').trim().toLowerCase();
  if (safeStatus === 'done' || safeStatus === 'completed') {
    return { label: 'Done', color: '#34d399', bg: 'rgba(16, 185, 129, 0.18)' };
  }
  if (safeStatus === 'deferred' || safeStatus === 'deffered' || safeStatus === 'on hold') {
    return { label: 'Deferred', color: '#cbd5e1', bg: 'rgba(100, 116, 139, 0.22)' };
  }
  if (safeStatus === 'working' || safeStatus === 'in progress') {
    return { label: 'Working', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.18)' };
  }
  return { label: safeStatus ? safeStatus : 'Unknown', color: '#93c5fd', bg: 'rgba(59, 130, 246, 0.18)' };
};

const ProjectCard = ({ project, onCardClick = () => { } }) => {
  const [showTechStackDialog, setShowTechStackDialog] = useState(false);

  const stackList = Array.isArray(project?.techStack) ? project.techStack : [];
  const status = useMemo(() => normalizeStatus(project?.status), [project?.status]);
  const placeholderGradient = useMemo(
    () => getPlaceholderGradient(project?.name),
    [project?.name]
  );
  const projectInitials = useMemo(
    () => getProjectInitials(project?.name),
    [project?.name]
  );

  const openTechStackDialog = (event) => {
    event.stopPropagation();
    setShowTechStackDialog(true);
  };

  const closeTechStackDialog = () => {
    setShowTechStackDialog(false);
  };

  return (
    <>
      <motion.article
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="group relative h-full cursor-pointer overflow-hidden rounded-[1.625rem] border transition-shadow duration-300"
        onClick={() => onCardClick(project)}
        whileHover={{ y: -4 }}
        style={{
          borderColor: 'var(--hairline)',
          boxShadow: 'var(--shadow-tile)',
        }}
      >
        <div
          className="relative flex h-full flex-col"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 62%, transparent), color-mix(in srgb, var(--bg-secondary) 55%, transparent))',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div className="relative h-56 overflow-hidden border-b sm:h-60" style={{ borderColor: 'var(--hairline)' }}>
            {project?.image ? (
              <img
                src={project.image}
                alt={project?.name || 'Project'}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="relative flex h-full w-full items-center justify-center overflow-hidden"
                style={{ backgroundImage: placeholderGradient }}
              >
                <div
                  className="absolute -left-8 -top-8 h-28 w-28 rounded-full blur-2xl"
                  style={{ background: 'color-mix(in srgb, var(--accent-cyan) 18%, transparent)' }}
                />
                <div
                  className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-2xl"
                  style={{ background: 'color-mix(in srgb, var(--accent-purple) 18%, transparent)' }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px)',
                    backgroundSize: '22px 22px',
                    opacity: 0.35,
                  }}
                />
                <div className="relative z-10 flex items-center justify-center px-4 text-center">
                  <div
                    className="rounded-xl border px-3 py-1 text-lg font-bold tracking-wide"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                      color: 'var(--text-bright)',
                      backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                    }}
                  >
                    {projectInitials}
                  </div>
                </div>
              </div>
            )}

            <div className="absolute left-4 top-4 flex items-center gap-2">
              <span
                className="rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 78%, transparent)',
                }}
              >
                {project?.projectType || 'Project'}
              </span>
            </div>

            <div className="absolute right-4 top-4">
              <span
                className="rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md"
                style={{
                  borderColor: 'transparent',
                  color: status.color,
                  backgroundColor: status.bg,
                }}
              >
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-6">
            <h3
              className="mb-3 text-2xl font-semibold leading-tight tracking-tight"
              style={{ color: 'var(--text-bright)' }}
            >
              {project?.name || 'Untitled Project'}
            </h3>

            <p className="mb-5 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
              {String(project?.description || '').slice(0, 120)}
              {String(project?.description || '').length > 120 ? '...' : ''}
            </p>

            <div className="mb-5 flex flex-wrap gap-2">
              {stackList.slice(0, 3).map((tech) => (
                <span
                  key={`${project?.name}-${tech}`}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-medium"
                  style={{
                    borderColor: 'var(--hairline)',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--surface-tile)',
                  }}
                >
                  {tech}
                </span>
              ))}

              {stackList.length > 3 && (
                <button
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-[11px] font-medium"
                  style={{
                    borderColor: 'var(--hairline-strong)',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--surface-tile)',
                  }}
                  onClick={openTechStackDialog}
                >
                  +{stackList.length - 3} more
                </button>
              )}
            </div>

            <div
              className="mt-auto flex items-center justify-between border-t pt-4 text-xs"
              style={{ borderColor: 'var(--hairline)', color: 'var(--text-tertiary)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <FaCalendarDay />
                {project?.year || 'Unknown Year'}
              </span>
              <span
                className="inline-flex items-center gap-1.5 font-medium transition-colors duration-300 group-hover:opacity-100"
                style={{ color: 'var(--accent-cyan)' }}
              >
                <FaCodeBranch />
                Open Details
              </span>
            </div>
          </div>
        </div>
      </motion.article>

      <TechStackDialog
        techStack={showTechStackDialog ? stackList : null}
        onClose={closeTechStackDialog}
      />
    </>
  );
};

export default ProjectCard;
