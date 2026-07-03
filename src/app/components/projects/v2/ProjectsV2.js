"use client";

import React, { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { FaArrowRight, FaSearch } from 'react-icons/fa';
import ProjectDialog from '../ProjectDialog';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx, refreshScrollTriggersSoon } from '../../landing/v2/gsap3d';

const ROW_ACCENTS = ['var(--accent-cyan)', 'var(--accent-purple)', 'var(--accent-orange)', 'var(--accent-pink)'];

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
    const parts = safeYear.split('-').map((part) => part.trim()).filter(Boolean);
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

const sortProjects = (a, b) => {
    const orderDifference = getDisplayOrderValue(a) - getDisplayOrderValue(b);
    if (orderDifference !== 0) return orderDifference;
    return extractSortYear(b?.year) - extractSortYear(a?.year);
};

const sortYearsDesc = (a, b) => {
    const parsedA = Number.parseInt(a, 10);
    const parsedB = Number.parseInt(b, 10);
    if (Number.isNaN(parsedA) && Number.isNaN(parsedB)) return b.localeCompare(a);
    if (Number.isNaN(parsedA)) return 1;
    if (Number.isNaN(parsedB)) return -1;
    return parsedB - parsedA;
};

const chipStyle = (active, accent = 'var(--accent-cyan)') => ({
    color: active ? accent : 'var(--text-secondary)',
});

/**
 * /v2/projects — the complete archive as an editorial index. Same data and
 * dialog as the classic projects page, but presented as year-grouped ledger
 * rows over hairline rules: mono year dividers with ghost numerals, display
 * type titles, status + stack annotations, thumbnails that lean in 3D on
 * hover. Filtering is a mono command strip instead of glass filter panels.
 */
const ProjectsV2 = ({ data, config }) => {
    const projects = useMemo(() => (Array.isArray(data) ? data : []), [data]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedType, setSelectedType] = useState('All');

    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    const uniqueStatuses = useMemo(() => {
        const statuses = projects.map((project) => normalizeStatus(project?.status));
        return ['All', ...new Set(statuses)].sort((a, b) => a.localeCompare(b));
    }, [projects]);

    const uniqueTypes = useMemo(() => {
        const types = projects.map((project) => project?.projectType).filter(Boolean);
        return ['All', ...new Set(types)].sort((a, b) => a.localeCompare(b));
    }, [projects]);

    const filteredProjects = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return projects
            .filter((project) => {
                const stackList = Array.isArray(project?.techStack) ? project.techStack : [];
                const normalizedStatus = normalizeStatus(project?.status);
                const searchText = [project?.name, project?.description, project?.projectType, project?.year, normalizedStatus, ...stackList]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                const matchesSearch = !normalizedQuery || searchText.includes(normalizedQuery);
                const matchesStatus = selectedStatus === 'All' || normalizedStatus === selectedStatus;
                const matchesType = selectedType === 'All' || project?.projectType === selectedType;

                return matchesSearch && matchesStatus && matchesType;
            })
            .sort(sortProjects);
    }, [projects, searchQuery, selectedStatus, selectedType]);

    const projectsByYear = useMemo(() => {
        return filteredProjects.reduce((accumulator, project) => {
            const year = extractGroupYear(project?.year);
            if (!accumulator[year]) accumulator[year] = [];
            accumulator[year].push(project);
            return accumulator;
        }, {});
    }, [filteredProjects]);

    const years = useMemo(() => Object.keys(projectsByYear).sort(sortYearsDesc), [projectsByYear]);

    const shippedCount = useMemo(
        () => projects.filter((project) => normalizeStatus(project?.status) === 'Done').length,
        [projects]
    );
    const stackCount = useMemo(
        () => new Set(projects.flatMap((project) => project?.techStack || [])).size,
        [projects]
    );

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        dependencies: [filteredProjects],
    });

    const handleFilterChange = (setter) => (value) => {
        setter(value);
        refreshScrollTriggersSoon();
    };

    let globalRowIndex = 0;

    return (
        <div ref={sectionRef} className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                {/* Page head — same voice as a chapter head, sized for a full page. */}
                <div className="relative mb-14 sm:mb-20">
                    <span
                        data-v2-depth="-0.4"
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none text-[7rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[13rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-cyan) 20%, transparent)',
                            opacity: 0.8,
                        }}
                    >
                        {'</>'}
                    </span>

                    <p data-v2="line" className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-cyan)' }}>
                        ~/projects — the archive
                    </p>
                    <h1
                        data-v2="line"
                        className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        {config?.projectsTitle || 'Every project, on the record.'}
                    </h1>
                    <p data-v2="rise" className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        {config?.projectsSubtitle || 'A curated collection of products and experiments, year by year.'}
                    </p>

                    <p data-v2="rise" className="mt-8 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span data-counter={projects.length}>{projects.length}</span> built ·{' '}
                        <span data-counter={shippedCount}>{shippedCount}</span> shipped ·{' '}
                        <span data-counter={stackCount}>{stackCount}</span> technologies
                    </p>
                </div>

                {/* Command strip: mono search + bracketed filter chips over a hairline. */}
                <div data-v2="rise" className="mb-4 space-y-4 pb-6" style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <label className="flex items-center gap-3 font-mono text-sm" htmlFor="v2-project-search">
                        <FaSearch aria-hidden="true" className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-cyan)' }} />
                        <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>$ grep</span>
                        <input
                            id="v2-project-search"
                            type="text"
                            value={searchQuery}
                            onChange={(event) => handleFilterChange(setSearchQuery)(event.target.value)}
                            placeholder="name, stack, type…"
                            className="w-full min-w-0 bg-transparent pb-1 focus:outline-none"
                            style={{
                                color: 'var(--text-primary)',
                                borderBottom: '1px solid var(--hairline)',
                            }}
                        />
                    </label>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 font-mono text-xs sm:text-sm">
                        <span className="uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>status:</span>
                        {uniqueStatuses.map((status) => {
                            const active = selectedStatus === status;
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => handleFilterChange(setSelectedStatus)(status)}
                                    className="cursor-pointer whitespace-nowrap underline-offset-4 hover:underline"
                                    style={chipStyle(active)}
                                    aria-pressed={active}
                                >
                                    <span style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>[</span>
                                    {status.toLowerCase()}
                                    <span style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>]</span>
                                </button>
                            );
                        })}
                    </div>

                    {uniqueTypes.length > 2 && (
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 font-mono text-xs sm:text-sm">
                            <span className="uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>type:</span>
                            {uniqueTypes.map((type) => {
                                const active = selectedType === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleFilterChange(setSelectedType)(type)}
                                        className="cursor-pointer whitespace-nowrap underline-offset-4 hover:underline"
                                        style={chipStyle(active, 'var(--accent-purple)')}
                                        aria-pressed={active}
                                    >
                                        <span style={{ color: active ? 'var(--accent-purple)' : 'var(--text-muted)' }}>[</span>
                                        {String(type).toLowerCase()}
                                        <span style={{ color: active ? 'var(--accent-purple)' : 'var(--text-muted)' }}>]</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <p className="mb-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
                    → {filteredProjects.length} of {projects.length} entries
                </p>

                {/* Year-grouped ledger. */}
                {filteredProjects.length > 0 ? (
                    years.map((year) => (
                        <div key={year} className="relative">
                            <div className="relative mt-16 flex items-baseline gap-4 pb-3 first:mt-6" style={{ borderBottom: '1px solid var(--hairline)' }}>
                                <span
                                    data-v2-depth="-0.25"
                                    aria-hidden="true"
                                    className="pointer-events-none absolute -top-8 right-0 select-none text-[4.5rem] font-black leading-none tracking-tighter sm:text-[7rem]"
                                    style={{
                                        color: 'transparent',
                                        WebkitTextStroke: '1px color-mix(in srgb, var(--text-bright) 14%, transparent)',
                                        opacity: 0.7,
                                    }}
                                >
                                    {year}
                                </span>
                                <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--text-bright)' }}>
                                    /{year}
                                </h2>
                                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {projectsByYear[year].length} {projectsByYear[year].length === 1 ? 'entry' : 'entries'}
                                </span>
                            </div>

                            <div style={{ perspective: '1600px' }}>
                                {projectsByYear[year].map((project) => {
                                    const rowIndex = globalRowIndex;
                                    globalRowIndex += 1;
                                    const accent = ROW_ACCENTS[rowIndex % ROW_ACCENTS.length];
                                    const stack = Array.isArray(project?.techStack) ? project.techStack.slice(0, 4) : [];

                                    return (
                                        <button
                                            type="button"
                                            key={project?._id || `${project?.name}-${rowIndex}`}
                                            data-v2={rowIndex % 2 === 0 ? 'door-left' : 'door-right'}
                                            onClick={() => setSelectedProject(project)}
                                            className="group grid w-full cursor-pointer grid-cols-12 items-center gap-4 py-8 text-left transition-colors duration-300 sm:py-10"
                                            style={{ borderBottom: '1px solid var(--hairline)' }}
                                        >
                                            <span className="col-span-2 font-mono text-sm sm:col-span-1" style={{ color: accent }}>
                                                {String(rowIndex + 1).padStart(2, '0')}
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
                        </div>
                    ))
                ) : (
                    <div className="py-20 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        <p>$ grep &quot;{searchQuery.trim() || selectedStatus}&quot; --archive</p>
                        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>→ 0 matches. Loosen the filters to see more.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedStatus('All');
                                setSelectedType('All');
                                refreshScrollTriggersSoon();
                            }}
                            className="mt-6 cursor-pointer underline-offset-4 hover:underline"
                            style={{ color: 'var(--accent-orange)' }}
                        >
                            [reset --filters]
                        </button>
                    </div>
                )}
            </div>

            <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} />
        </div>
    );
};

export default ProjectsV2;
