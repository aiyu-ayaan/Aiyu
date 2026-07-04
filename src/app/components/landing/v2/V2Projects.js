"use client";

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRight } from 'react-icons/fa';
import ProjectDialog from '../../projects/ProjectDialog';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import V2ChapterHead from './V2ChapterHead';
import { v2PublicPath } from '@/lib/siteVersion';

const ROW_ACCENTS = ['var(--accent-cyan)', 'var(--accent-purple)', 'var(--accent-orange)'];

const normalizeStatus = (status) => {
  const safeStatus = String(status || '').trim().toLowerCase();
  if (safeStatus === 'done' || safeStatus === 'completed') return 'Done';
  if (safeStatus === 'deferred' || safeStatus === 'deffered' || safeStatus === 'on hold') return 'Deferred';
  if (safeStatus === 'working' || safeStatus === 'in progress') return 'Working';
  return safeStatus || '—';
};

/**
 * Chapter 06 — Selected work as an editorial index. Each project is a
 * full-width ledger row: mono index and year, the project name in display
 * type, status and stack as mono annotations, and a thumbnail that leans in
 * 3D on hover. Rows yaw in from alternating edges; clicking opens the shared
 * ProjectDialog so details behave like everywhere else on the site.
 */
const V2Projects = ({ data, config }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();
  const projects = Array.isArray(data) ? data : [];

  useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

  const latestProjects = useMemo(() => projects.slice(0, 4), [projects]);
  const doneProjects = useMemo(
    () => projects.filter((project) => normalizeStatus(project?.status) === 'Done').length,
    [projects]
  );
  const uniqueStacks = useMemo(() => {
    const stackSet = new Set(projects.flatMap((project) => project?.techStack || []));
    return stackSet.size;
  }, [projects]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-20 sm:py-28"
      style={{ borderTop: '1px solid var(--hairline)' }}
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <V2ChapterHead
          index="06"
          eyebrow="Selected Work"
          title="Projects, front and center."
          accent="var(--accent-cyan)"
        />

        <p data-v2="rise" className="-mt-8 mb-14 font-mono text-sm sm:-mt-12" style={{ color: 'var(--text-muted)' }}>
          <span data-counter={projects.length}>{projects.length}</span> built ·{' '}
          <span data-counter={doneProjects}>{doneProjects}</span> shipped ·{' '}
          <span data-counter={uniqueStacks}>{uniqueStacks}</span> technologies
        </p>

        {latestProjects.length > 0 ? (
          <div style={{ borderTop: '1px solid var(--hairline)', perspective: '1600px' }}>
            {latestProjects.map((project, index) => {
              const accent = ROW_ACCENTS[index % ROW_ACCENTS.length];
              const stack = Array.isArray(project?.techStack) ? project.techStack.slice(0, 4) : [];
              return (
                <button
                  type="button"
                  key={project?._id || `${project?.name}-${index}`}
                  data-v2={index % 2 === 0 ? 'door-left' : 'door-right'}
                  onClick={() => setSelectedProject(project)}
                  className="group grid w-full cursor-pointer grid-cols-12 items-center gap-4 py-8 text-left transition-colors duration-300 sm:py-10"
                  style={{ borderBottom: '1px solid var(--hairline)' }}
                >
                  <span className="col-span-2 font-mono text-sm sm:col-span-1" style={{ color: accent }}>
                    {String(index + 1).padStart(2, '0')}
                    <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                      {project?.year || ''}
                    </span>
                  </span>

                  <div className="col-span-10 sm:col-span-6">
                    <h3
                      className="text-3xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-5xl"
                      style={{ color: 'var(--text-bright)' }}
                    >
                      {project?.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
                      {project?.description}
                    </p>
                    <p className="mt-3 font-mono text-xs uppercase tracking-[0.15em]" style={{ color: `color-mix(in srgb, ${accent} 75%, var(--text-secondary))` }}>
                      {normalizeStatus(project?.status)}{stack.length ? ` · ${stack.join(' / ')}` : ''}
                    </p>
                  </div>

                  <div className="col-span-8 col-start-3 sm:col-span-4 sm:col-start-8">
                    {project?.image ? (
                      <span
                        className="relative block h-32 overflow-hidden rounded-xl border transition-transform duration-500 group-hover:[transform:rotateY(-8deg)_rotateX(3deg)_translateZ(24px)] sm:h-40"
                        style={{ borderColor: 'var(--hairline)', transformStyle: 'preserve-3d' }}
                      >
                        <Image
                          src={project.image}
                          alt={project?.name || 'Project preview'}
                          fill
                          sizes="(max-width: 768px) 90vw, 33vw"
                          className="object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="hidden h-32 items-center justify-center rounded-xl border font-mono text-xs uppercase tracking-[0.25em] sm:flex sm:h-40"
                        style={{ borderColor: 'var(--hairline)', color: 'var(--text-muted)', backgroundColor: `color-mix(in srgb, ${accent} 5%, transparent)` }}
                      >
                        {'</>'}
                      </span>
                    )}
                  </div>

                  <span className="col-span-2 hidden justify-self-end sm:col-span-1 sm:block" aria-hidden="true">
                    <FaArrowRight
                      className="h-5 w-5 transition-all duration-300 group-hover:translate-x-1.5"
                      style={{ color: accent }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p data-v2="rise" className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
            $ projects --list → nothing here yet; add them from the admin panel.
          </p>
        )}

        <p data-v2="rise" className="mt-12 font-mono text-sm">
          <Link href={v2PublicPath(config, '/projects')} className="underline-offset-4 hover:underline" style={{ color: 'var(--accent-cyan)' }}>
            → the complete archive
          </Link>
        </p>
      </div>

      <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} isV2={true} />
    </section>
  );
};

export default V2Projects;
