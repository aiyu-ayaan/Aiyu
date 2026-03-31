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
        className="group relative cursor-pointer overflow-hidden rounded-2xl border"
        onClick={() => onCardClick(project)}
        whileHover={{ y: -4 }}
      >
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 14%, transparent), color-mix(in srgb, var(--accent-purple) 12%, transparent))',
          }}
        />

        <div
          className="relative flex h-full flex-col"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 95%, transparent), color-mix(in srgb, var(--bg-secondary) 95%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
          }}
        >
          <div className="relative h-44 overflow-hidden border-b" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)' }}>
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
                  style={{ background: 'color-mix(in srgb, var(--accent-cyan) 35%, transparent)' }}
                />
                <div
                  className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-2xl"
                  style={{ background: 'color-mix(in srgb, var(--accent-purple) 35%, transparent)' }}
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

            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span
                className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 78%, transparent)',
                }}
              >
                {project?.projectType || 'Project'}
              </span>
            </div>

            <div className="absolute right-3 top-3">
              <span
                className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
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

          <div className="flex flex-1 flex-col p-5">
            <h3
              className="mb-2 text-xl font-bold leading-snug"
              style={{
                background: 'linear-gradient(to right, var(--accent-orange), var(--accent-pink), var(--accent-purple))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {project?.name || 'Untitled Project'}
            </h3>

            <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {String(project?.description || '').slice(0, 120)}
              {String(project?.description || '').length > 120 ? '...' : ''}
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              {stackList.slice(0, 3).map((tech) => (
                <span
                  key={`${project?.name}-${tech}`}
                  className="rounded-md border px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                    color: 'var(--accent-cyan)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                  }}
                >
                  {tech}
                </span>
              ))}

              {stackList.length > 3 && (
                <button
                  type="button"
                  className="rounded-md border px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-orange) 45%, var(--border-secondary))',
                    color: 'var(--accent-orange)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
                  }}
                  onClick={openTechStackDialog}
                >
                  +{stackList.length - 3} more
                </button>
              )}
            </div>

            <div
              className="mt-auto flex items-center justify-between border-t pt-3 text-xs"
              style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)', color: 'var(--text-tertiary)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <FaCalendarDay />
                {project?.year || 'Unknown Year'}
              </span>
              <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--accent-cyan)' }}>
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
