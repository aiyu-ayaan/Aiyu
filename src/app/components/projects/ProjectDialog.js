
"use client";
import React, { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarDay, FaCodeBranch, FaExternalLinkAlt, FaLayerGroup, FaTimes, FaBook } from 'react-icons/fa';
import { getPlaceholderGradient, getProjectInitials } from './projectPlaceholder';

const isOptimizableImage = (src) =>
  typeof src === 'string' && (src.startsWith('/') || src.startsWith('https://'));

const normalizeStatus = (status) => {
  const safeStatus = String(status || '').trim().toLowerCase();
  if (safeStatus === 'done' || safeStatus === 'completed') {
    return { label: 'Done', color: '#34d399', bg: 'rgba(16, 185, 129, 0.16)' };
  }
  if (safeStatus === 'deferred' || safeStatus === 'deffered' || safeStatus === 'on hold') {
    return { label: 'Deferred', color: '#cbd5e1', bg: 'rgba(100, 116, 139, 0.2)' };
  }
  if (safeStatus === 'working' || safeStatus === 'in progress') {
    return { label: 'Working', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.16)' };
  }
  return { label: safeStatus ? safeStatus : 'Unknown', color: '#93c5fd', bg: 'rgba(59, 130, 246, 0.16)' };
};

const ProjectDialog = ({ project, onClose }) => {
  const stackList = Array.isArray(project?.techStack) ? project.techStack : [];
  const status = useMemo(() => normalizeStatus(project?.status), [project?.status]);
  const placeholderGradient = useMemo(() => getPlaceholderGradient(project?.name), [project?.name]);
  const projectInitials = useMemo(() => getProjectInitials(project?.name), [project?.name]);

  useEffect(() => {
    if (!project) return undefined;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [project]);

  if (!project) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6 backdrop-blur-md sm:py-10"
        style={{
          background:
            'radial-gradient(circle at 25% 20%, color-mix(in srgb, var(--accent-cyan) 16%, transparent), transparent 44%), radial-gradient(circle at 75% 75%, color-mix(in srgb, var(--accent-purple) 18%, transparent), transparent 46%), var(--overlay-bg)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 18 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-5xl overflow-hidden rounded-3xl border shadow-2xl"
          style={{
            maxHeight: '88vh',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 95%, transparent), color-mix(in srgb, var(--bg-secondary) 96%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="h-1.5 w-full"
            style={{
              background:
                'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple), var(--accent-pink), var(--accent-cyan))',
              backgroundSize: '220% 100%',
            }}
          />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
            style={{
              borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
              color: 'var(--text-secondary)',
              backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
            }}
            aria-label="Close project details"
          >
            <FaTimes />
          </button>

          <div className="hide-scrollbar overflow-y-auto" style={{ maxHeight: 'calc(88vh - 6px)' }}>
            <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                <div
                  className="relative overflow-hidden rounded-2xl border"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 72%, transparent)',
                  }}
                >
                  <div className="relative aspect-video">
                    {project?.image ? (
                      isOptimizableImage(project.image) ? (
                        <Image
                          src={project.image}
                          alt={project?.name || 'Project preview'}
                          fill
                          sizes="(max-width: 1024px) 100vw, 58vw"
                          className="object-cover"
                          priority
                        />
                      ) : (
                        <img
                          src={project.image}
                          alt={project?.name || 'Project preview'}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      )
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
                            backgroundSize: '24px 24px',
                            opacity: 0.35,
                          }}
                        />
                        <span
                          className="relative z-10 rounded-xl border px-4 py-2 text-2xl font-bold tracking-wide"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                            color: 'var(--text-bright)',
                            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                          }}
                        >
                          {projectInitials}
                        </span>
                      </div>
                    )}
                  </div>

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

                <div
                  className="rounded-2xl border p-4 sm:p-5"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 72%, transparent)',
                  }}
                >
                  <p className="mb-2 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                    Project Description
                  </p>
                  <p className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
                    {project?.description || 'No project description provided.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col">
                <h3
                  className="mb-3 text-3xl font-bold leading-tight"
                  style={{
                    background: 'linear-gradient(to right, var(--accent-orange), var(--accent-pink), var(--accent-purple))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {project?.name || 'Untitled Project'}
                </h3>

                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <div
                    className="rounded-xl border px-3 py-2 text-sm"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                    }}
                  >
                    <span className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                      <FaCalendarDay />
                      Year
                    </span>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {project?.year || 'Unknown'}
                    </p>
                  </div>
                  <div
                    className="rounded-xl border px-3 py-2 text-sm"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                    }}
                  >
                    <span className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                      <FaLayerGroup />
                      Stack Size
                    </span>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {stackList.length} technologies
                    </p>
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                  {stackList.map((tech) => (
                    <span
                      key={`${project?.name}-${tech}`}
                      className="rounded-lg border px-2.5 py-1 text-xs font-semibold"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                        color: 'var(--accent-cyan)',
                        backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex flex-wrap gap-3">
                  {project?.codeLink && (
                    <motion.a
                      href={project.codeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                      style={{
                        color: '#ffffff',
                        background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                        boxShadow: '0 12px 30px var(--shadow-lg)',
                      }}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FaCodeBranch />
                      View Code
                      <FaExternalLinkAlt className="text-[11px]" />
                    </motion.a>
                  )}
                  
                  {project?.blogLink && (
                    <motion.a
                      href={project.blogLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                      style={{
                        color: '#ffffff',
                        background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                        boxShadow: '0 12px 30px var(--shadow-lg)',
                      }}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FaBook />
                      Read Blog
                      <FaExternalLinkAlt className="text-[11px]" />
                    </motion.a>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                    }}
                  >
                    <FaTimes />
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>

          {project?.codeLink && (
            <div
              className="border-t px-5 py-3 text-xs sm:px-7"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                color: 'var(--text-tertiary)',
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 65%, transparent)',
              }}
            >
              External link opens in new tab.
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectDialog;
