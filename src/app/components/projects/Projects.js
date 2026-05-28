"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaCheckCircle,
  FaFilter,
  FaLayerGroup,
  FaSearch,
  FaStream,
  FaThLarge,
  FaTools,
} from 'react-icons/fa';
import ProjectDialog from './ProjectDialog';
import ProjectCard from './ProjectCard';
import TypewriterEffect from '../shared/TypewriterEffect';
import RouteBetaBadge from '../shared/RouteBetaBadge';
import Timeline from './Timeline';
import { getPlaceholderGradient, getProjectInitials } from './projectPlaceholder';
import { ProjectsPageSkeleton } from '../shared/skeletons/PublicPageSkeletons';

const heroCardStyle = {
  background:
    'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
  border: '1px solid color-mix(in srgb, var(--border-secondary) 75%, transparent)',
  boxShadow: '0 16px 36px var(--shadow-sm)',
};

const toPascalCase = (value) => {
  if (!value) return '';
  return String(value)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const normalizeStatus = (status) => {
  const safeStatus = String(status || '').trim().toLowerCase();
  if (safeStatus === 'done' || safeStatus === 'completed') return 'Done';
  if (safeStatus === 'deferred' || safeStatus === 'deffered' || safeStatus === 'on hold') return 'Deferred';
  if (safeStatus === 'working' || safeStatus === 'in progress') return 'Working';
  return safeStatus ? toPascalCase(safeStatus) : 'Unknown';
};

const extractGroupYear = (yearValue) => {
  const safeYear = String(yearValue || '').trim();
  if (!safeYear) return 'Unknown';

  const parts = safeYear
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length ? parts[parts.length - 1] : safeYear;
};

const extractSortYear = (yearValue) => {
  const matches = String(yearValue || '').match(/\d{4}/g);
  if (!matches || matches.length === 0) return 0;
  const finalYear = Number.parseInt(matches[matches.length - 1], 10);
  return Number.isNaN(finalYear) ? 0 : finalYear;
};

const getDisplayOrderValue = (project) => {
  const parsedOrder = Number.parseInt(project?.displayOrder, 10);
  return Number.isNaN(parsedOrder) ? Number.MAX_SAFE_INTEGER : parsedOrder;
};

const sortProjects = (firstProject, secondProject) => {
  const orderDifference = getDisplayOrderValue(firstProject) - getDisplayOrderValue(secondProject);
  if (orderDifference !== 0) return orderDifference;
  return extractSortYear(secondProject?.year) - extractSortYear(firstProject?.year);
};

const sortYearsDesc = (a, b) => {
  const parsedA = Number.parseInt(a, 10);
  const parsedB = Number.parseInt(b, 10);

  if (Number.isNaN(parsedA) && Number.isNaN(parsedB)) return b.localeCompare(a);
  if (Number.isNaN(parsedA)) return 1;
  if (Number.isNaN(parsedB)) return -1;
  return parsedB - parsedA;
};

const Projects = ({ data, initialConfig = null }) => {
  const projects = Array.isArray(data) ? data : [];

  const [config, setConfig] = useState(initialConfig);
  const [configLoading, setConfigLoading] = useState(!initialConfig);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTechStack, setSelectedTechStack] = useState('All');
  const [selectedProjectType, setSelectedProjectType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    if (initialConfig) {
      return;
    }

    let isMounted = true;

    fetch('/api/config')
      .then((res) => res.json())
      .then((payload) => {
        if (!isMounted) return;
        setConfig(payload);
        setConfigLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Failed to fetch config', error);
        setConfigLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialConfig]);

  const roles = [
    config?.projectsSubtitle || 'A curated collection of products and experiments',
    'Search and filter to quickly focus on what matters',
  ];

  const uniqueTechStacks = useMemo(() => {
    const allTechStacks = projects.flatMap((project) =>
      Array.isArray(project?.techStack) ? project.techStack : []
    );
    return ['All', ...new Set(allTechStacks)].sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const uniqueProjectTypes = useMemo(() => {
    const allProjectTypes = projects.map((project) => project?.projectType).filter(Boolean);
    return ['All', ...new Set(allProjectTypes)].sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const uniqueStatuses = useMemo(() => {
    const statuses = projects.map((project) => normalizeStatus(project?.status));
    return ['All', ...new Set(statuses)].sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return projects
      .filter((project) => {
        const stackList = Array.isArray(project?.techStack) ? project.techStack : [];
        const normalizedStatus = normalizeStatus(project?.status);

        const searchText = [
          project?.name,
          project?.description,
          project?.projectType,
          project?.year,
          normalizedStatus,
          ...stackList,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesSearch = !normalizedQuery || searchText.includes(normalizedQuery);
        const matchesTechStack = selectedTechStack === 'All' || stackList.includes(selectedTechStack);
        const matchesProjectType =
          selectedProjectType === 'All' || project?.projectType === selectedProjectType;
        const matchesStatus = selectedStatus === 'All' || normalizedStatus === selectedStatus;

        return matchesSearch && matchesTechStack && matchesProjectType && matchesStatus;
      })
      .sort(sortProjects);
  }, [projects, searchQuery, selectedTechStack, selectedProjectType, selectedStatus]);

  const projectsByYear = useMemo(() => {
    return filteredProjects.reduce((accumulator, project) => {
      const year = extractGroupYear(project?.year);
      if (!accumulator[year]) {
        accumulator[year] = [];
      }
      accumulator[year].push(project);
      return accumulator;
    }, {});
  }, [filteredProjects]);

  const years = useMemo(() => Object.keys(projectsByYear).sort(sortYearsDesc), [projectsByYear]);

  const filteredUniqueStacks = useMemo(() => {
    const stackSet = new Set(filteredProjects.flatMap((project) => project?.techStack || []));
    return stackSet.size;
  }, [filteredProjects]);

  const completedFiltered = useMemo(() => {
    return filteredProjects.filter((project) => normalizeStatus(project?.status) === 'Done').length;
  }, [filteredProjects]);

  const spotlightProject = filteredProjects[0] || null;
  const remainingProjects = spotlightProject ? filteredProjects.slice(1) : [];

  const activeFilters = [
    selectedTechStack !== 'All' ? `Tech: ${toPascalCase(selectedTechStack)}` : null,
    selectedProjectType !== 'All' ? `Type: ${toPascalCase(selectedProjectType)}` : null,
    selectedStatus !== 'All' ? `Status: ${selectedStatus}` : null,
    searchQuery.trim().length > 0 ? `Search: ${searchQuery.trim()}` : null,
  ].filter(Boolean);

  const resetFilters = () => {
    setSelectedTechStack('All');
    setSelectedProjectType('All');
    setSelectedStatus('All');
    setSearchQuery('');
  };

  const statCards = [
    {
      label: 'Visible Projects',
      value: filteredProjects.length,
      icon: FaLayerGroup,
      accent: 'var(--accent-cyan)',
    },
    {
      label: 'Completed',
      value: completedFiltered,
      icon: FaCheckCircle,
      accent: 'var(--status-success)',
    },
    {
      label: 'Tech In View',
      value: filteredUniqueStacks,
      icon: FaTools,
      accent: 'var(--accent-purple)',
    },
  ];

  if (configLoading) {
    return <ProjectsPageSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative min-h-screen overflow-hidden p-4 lg:p-8"
      style={{ color: 'var(--text-primary)' }}
    >
      <div
        className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 34%, transparent), transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-pink) 28%, transparent), transparent 70%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%]">
        <motion.section
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl p-6 sm:p-8"
          style={heroCardStyle}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p
              className="inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-cyan) 40%, var(--border-secondary))',
                color: 'var(--accent-cyan)',
              }}
            >
              Project Command Center
            </p>
            <RouteBetaBadge />
          </div>

          <>
            <h1
              className="mb-1 pb-2 leading-tight bg-linear-to-r bg-clip-text text-4xl font-bold text-transparent sm:text-5xl lg:text-6xl"
              style={{
                backgroundImage:
                  'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-orange-bright))',
              }}
            >
              {config?.projectsTitle || 'Projects Portfolio'}
            </h1>
            <TypewriterEffect roles={roles} />
          </>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  <div
                    className="mb-2 inline-flex rounded-lg p-2"
                    style={{ backgroundColor: `color-mix(in srgb, ${item.accent} 14%, transparent)` }}
                  >
                    <Icon size={14} style={{ color: item.accent }} />
                  </div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-6 rounded-2xl border p-4 sm:p-5"
          style={{
            ...heroCardStyle,
            border: '1px solid color-mix(in srgb, var(--border-secondary) 72%, transparent)',
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <FaFilter style={{ color: 'var(--accent-orange)' }} />
              Filter + Search
            </div>

            <div className="inline-flex rounded-lg border p-1"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: viewMode === 'grid' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  backgroundColor:
                    viewMode === 'grid'
                      ? 'color-mix(in srgb, var(--accent-cyan) 12%, transparent)'
                      : 'transparent',
                }}
              >
                <span className="inline-flex items-center gap-1.5"><FaThLarge /> Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: viewMode === 'timeline' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  backgroundColor:
                    viewMode === 'timeline'
                      ? 'color-mix(in srgb, var(--accent-cyan) 12%, transparent)'
                      : 'transparent',
                }}
              >
                <span className="inline-flex items-center gap-1.5"><FaStream /> Timeline</span>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="projectSearch" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Search Projects
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }} />
              <input
                id="projectSearch"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, stack, type, or description"
                className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="techStackFilter" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Tech Stack
              </label>
              <select
                id="techStackFilter"
                className="w-full rounded-lg border px-3 py-2.5 focus:outline-none"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                  color: 'var(--text-primary)',
                }}
                value={selectedTechStack}
                onChange={(event) => setSelectedTechStack(event.target.value)}
              >
                {uniqueTechStacks.map((tech) => (
                  <option key={tech} value={tech}>
                    {toPascalCase(tech)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="projectTypeFilter" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Project Type
              </label>
              <select
                id="projectTypeFilter"
                className="w-full rounded-lg border px-3 py-2.5 focus:outline-none"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                  color: 'var(--text-primary)',
                }}
                value={selectedProjectType}
                onChange={(event) => setSelectedProjectType(event.target.value)}
              >
                {uniqueProjectTypes.map((type) => (
                  <option key={type} value={type}>
                    {toPascalCase(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {uniqueStatuses.map((status) => {
              const isActive = selectedStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors duration-200"
                  style={{
                    borderColor: isActive
                      ? 'color-mix(in srgb, var(--accent-cyan) 55%, var(--border-secondary))'
                      : 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--accent-cyan) 11%, transparent)'
                      : 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  }}
                >
                  {status}
                </button>
              );
            })}

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-orange) 50%, var(--border-secondary))',
                color: 'var(--accent-orange)',
                backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
              }}
            >
              Reset Filters
            </button>
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
                    color: 'var(--accent-purple)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-purple) 10%, transparent)',
                  }}
                >
                  {filter}
                </span>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8"
        >
          {filteredProjects.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="space-y-6">
                {spotlightProject && (
                  <motion.article
                    whileHover={{ y: -3 }}
                    className="cursor-pointer rounded-2xl border p-5 sm:p-6"
                    style={heroCardStyle}
                    onClick={() => setSelectedProject(spotlightProject)}
                  >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-center">
                      <div>
                        <p
                          className="mb-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--accent-orange) 48%, var(--border-secondary))',
                            color: 'var(--accent-orange)',
                            backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
                          }}
                        >
                          Spotlight Project
                        </p>
                        <h3 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          {spotlightProject.name}
                        </h3>
                        <p className="mb-4 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                          {String(spotlightProject.description || '').slice(0, 220)}
                          {String(spotlightProject.description || '').length > 220 ? '...' : ''}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(spotlightProject.techStack || []).slice(0, 4).map((tech) => (
                            <span
                              key={`${spotlightProject.name}-${tech}`}
                              className="rounded-md border px-2.5 py-1 text-xs font-semibold"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                                color: 'var(--accent-cyan)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                              }}
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                          backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                          minHeight: '180px',
                        }}
                      >
                        {spotlightProject.image ? (
                          <img
                            src={spotlightProject.image}
                            alt={spotlightProject.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div
                            className="relative flex h-full min-h-45 items-center justify-center overflow-hidden"
                            style={{ backgroundImage: getPlaceholderGradient(spotlightProject?.name) }}
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
                                className="rounded-xl border px-4 py-1.5 text-xl font-bold tracking-wide"
                                style={{
                                  borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                                  color: 'var(--text-bright)',
                                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                                }}
                              >
                                {getProjectInitials(spotlightProject?.name)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.article>
                )}

                {remainingProjects.length > 0 && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {remainingProjects.map((project, index) => (
                      <ProjectCard
                        key={project?._id || `${project?.name}-${index}`}
                        project={project}
                        onCardClick={setSelectedProject}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Timeline projectsByYear={projectsByYear} years={years} onCardClick={setSelectedProject} />
            )
          ) : (
            <div
              className="rounded-2xl border p-10 text-center"
              style={{
                ...heroCardStyle,
                border: '1px solid color-mix(in srgb, var(--border-secondary) 72%, transparent)',
              }}
            >
              <h3 className="mb-2 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                No Projects Match These Filters
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Try adjusting search or filters to reveal more work.
              </p>
            </div>
          )}
        </motion.section>

        <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} />
      </div>
    </motion.div>
  );
};

export default Projects;
