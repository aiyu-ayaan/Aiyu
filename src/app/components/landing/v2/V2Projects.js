"use client";

/**
 * Chapter 06 — "Open Source & Community" on the home page.
 *
 * Rebuilt as a card grid rather than the previous ledger rows. The home page
 * already leads with three full-width ledger sections; repeating that rhythm a
 * fourth time made selected work read as more list rather than as the portfolio
 * centrepiece. Cards also give live repo signals (stars, language, last push) a
 * place to sit without crowding the title line.
 *
 * Cards link to the detail page instead of opening a dialog, so the entry that
 * carries the README is shareable, crawlable and keyboard reachable.
 *
 * Motion comes from the shared useV2Fx engine via data-v2 attributes, which
 * already honours prefers-reduced-motion and the lite device tier.
 */
import { useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRight } from 'react-icons/fa6';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import V2ChapterHead from './V2ChapterHead';
import RepoMeta from '../../projects/v2/RepoMeta';
import {
  compareProjects,
  formatCount,
  isSynced,
  normalizeStatus,
  statusAccent,
  sumRepoStat,
} from '../../projects/v2/repoDisplay';
import { v2PublicPath } from '@/lib/siteVersion';

const FEATURED_COUNT = 4;

const V2Projects = ({ data, config }) => {
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  const projects = useMemo(
    () => (Array.isArray(data) ? [...data].sort(compareProjects) : []),
    [data]
  );

  useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

  const featured = useMemo(() => projects.slice(0, FEATURED_COUNT), [projects]);
  const totalStars = useMemo(() => sumRepoStat(projects, 'stars'), [projects]);
  const syncedCount = useMemo(() => projects.filter(isSynced).length, [projects]);
  const stackCount = useMemo(
    () => new Set(projects.flatMap((project) => project?.techStack || [])).size,
    [projects]
  );

  const projectsPath = v2PublicPath(config, '/projects');

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-20 sm:py-28"
      style={{ borderTop: '1px solid var(--hairline)' }}
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <V2ChapterHead
          index="06"
          eyebrow="Open Source & Community"
          title={config?.projectsTitle || 'Built in the open.'}
          accent="var(--accent-cyan)"
        />

        <p data-v2="rise" className="-mt-8 mb-14 font-mono text-sm sm:-mt-12" style={{ color: 'var(--text-muted)' }}>
          <span data-counter={projects.length}>{projects.length}</span> projects
          {syncedCount > 0 && <> · <span data-counter={syncedCount}>{syncedCount}</span> live from GitHub</>}
          {totalStars > 0 && <> · {formatCount(totalStars)} stars</>}
          {' '}· <span data-counter={stackCount}>{stackCount}</span> technologies
        </p>

        {featured.length > 0 ? (
          <ul
            data-v2-group
            data-v2-stagger="0.08"
            className="grid list-none grid-cols-1 gap-px p-0 sm:grid-cols-2"
            style={{ backgroundColor: 'var(--hairline)', border: '1px solid var(--hairline)' }}
          >
            {featured.map((project, index) => {
              const accent = statusAccent(project?.status);
              const stack = (project?.techStack || []).slice(0, 3);

              return (
                <li key={project?._id || `${project?.name}-${index}`} data-v2="flip-x">
                  <Link
                    href={`${projectsPath}/${project?.slug || project?._id}`}
                    className="group flex h-full flex-col gap-4 p-6 transition-colors duration-300 sm:p-8"
                    style={{ backgroundColor: 'var(--bg-primary, #05070d)' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-mono text-xs" style={{ color: accent }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <FaArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5"
                        style={{ color: accent }}
                      />
                    </div>

                    {project?.image && (
                      <span
                        className="relative block h-40 overflow-hidden rounded-lg border"
                        style={{ borderColor: 'var(--hairline)' }}
                      >
                        <Image
                          src={project.image}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 90vw, 45vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </span>
                    )}

                    <h3
                      className="text-2xl font-bold tracking-tight sm:text-3xl"
                      style={{ color: 'var(--text-bright)' }}
                    >
                      {project?.name}
                    </h3>

                    <p
                      className="line-clamp-3 flex-1 text-sm leading-relaxed"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {project?.description}
                    </p>

                    {isSynced(project) ? (
                      <RepoMeta project={project} />
                    ) : (
                      <p className="font-mono text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
                        {normalizeStatus(project?.status)}
                        {project?.year ? ` · ${project.year}` : ''}
                      </p>
                    )}

                    {stack.length > 0 && (
                      <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {stack.join(' / ')}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-16 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
            → No projects published yet.
          </p>
        )}

        {projects.length > featured.length && (
          <Link
            href={projectsPath}
            data-v2="rise"
            className="mt-10 inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.2em] underline-offset-4 hover:underline"
            style={{ color: 'var(--accent-cyan)' }}
          >
            [ view all {projects.length} ]
            <FaArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
};

export default V2Projects;
