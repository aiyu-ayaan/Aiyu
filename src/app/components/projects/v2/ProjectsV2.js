"use client";

/**
 * /v2/projects — "Open Source & Community", the full index.
 *
 * Rebuilt around repo signals rather than a plain year ledger. Three ideas
 * drive the layout:
 *
 *  1. Maintained work leads. Entries pushed to recently are surfaced as a
 *     "currently maintained" band at the top, because ongoing stewardship is
 *     the thing an open-source section is supposed to evidence — a stale repo
 *     and a live one look identical in a date-sorted list.
 *  2. Live data is annotation, not decoration. Stars/forks/license/last-push
 *     sit in a mono rail (RepoMeta) under the title, in the same voice as the
 *     rest of the editorial layout.
 *  3. Rows link, they do not trap. Each row is an <a> to the detail page where
 *     the README lives, so entries are shareable, crawlable, and keyboard
 *     reachable — the previous dialog-only interaction was neither.
 *
 * Motion comes from useV2Fx (data-v2 attributes), the site's existing GSAP
 * engine, which already honours prefers-reduced-motion and the lite device
 * tier and caps stagger spread. No second animation system is introduced.
 */
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRight, FaMagnifyingGlass } from 'react-icons/fa6';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx, refreshScrollTriggersSoon } from '../../landing/v2/gsap3d';
import RepoMeta from './RepoMeta';
import {
    compareProjects,
    formatCount,
    hasReadme,
    isActive,
    isSynced,
    normalizeStatus,
    statusAccent,
    sumRepoStat,
} from './repoDisplay';

const FILTERS = [
    { id: 'all', label: 'all' },
    { id: 'maintained', label: 'maintained' },
    { id: 'source', label: 'open source' },
    { id: 'archive', label: 'archive' },
];

const matchesFilter = (project, filter) => {
    switch (filter) {
        case 'maintained': return isActive(project);
        case 'source': return isSynced(project);
        case 'archive': return !isActive(project);
        default: return true;
    }
};

const searchText = (project) => [
    project?.name,
    project?.description,
    project?.projectType,
    project?.year,
    project?.repoData?.language,
    project?.repoData?.license,
    normalizeStatus(project?.status),
    ...(project?.techStack || []),
    ...(project?.repoData?.topics || []),
].filter(Boolean).join(' ').toLowerCase();

function EntryRow({ project, href, index }) {
    const accent = statusAccent(project?.status);
    const stack = (project?.techStack || []).slice(0, 4);

    return (
        <Link
            href={href}
            data-v2={index % 2 === 0 ? 'door-left' : 'door-right'}
            className="group grid grid-cols-12 items-start gap-x-4 gap-y-3 py-8 sm:py-10"
            style={{ borderBottom: '1px solid var(--hairline)' }}
        >
            <span
                className="col-span-2 font-mono text-sm sm:col-span-1"
                style={{ color: accent }}
                aria-hidden="true"
            >
                {String(index + 1).padStart(2, '0')}
            </span>

            <div className="col-span-10 sm:col-span-7">
                <h3
                    className="text-2xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-4xl"
                    style={{ color: 'var(--text-bright)' }}
                >
                    {project?.name}
                </h3>

                <p
                    className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed sm:text-base"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    {project?.description || 'No description provided.'}
                </p>

                {isSynced(project) ? (
                    <RepoMeta project={project} className="mt-3" />
                ) : (
                    <p className="mt-3 font-mono text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
                        {normalizeStatus(project?.status)}
                        {project?.year ? ` · ${project.year}` : ''}
                    </p>
                )}

                {stack.length > 0 && (
                    <p className="mt-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {stack.join(' / ')}
                    </p>
                )}

                {hasReadme(project) && (
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--accent-purple)' }}>
                        readme →
                    </p>
                )}
            </div>

            <div className="col-span-10 col-start-3 sm:col-span-3 sm:col-start-9">
                {project?.image ? (
                    <span
                        className="relative block h-28 overflow-hidden rounded-xl border sm:h-32"
                        style={{ borderColor: 'var(--hairline)' }}
                    >
                        <Image
                            src={project.image}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 90vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                    </span>
                ) : (
                    <span
                        aria-hidden="true"
                        className="hidden h-28 items-center justify-center rounded-xl border font-mono text-xs uppercase tracking-[0.25em] sm:flex sm:h-32"
                        style={{
                            borderColor: 'var(--hairline)',
                            color: 'var(--text-muted)',
                            backgroundColor: `color-mix(in srgb, ${accent} 5%, transparent)`,
                        }}
                    >
                        {project?.repoData?.language || '</>'}
                    </span>
                )}
            </div>

            <span className="col-span-1 hidden justify-self-end self-center sm:block" aria-hidden="true">
                <FaArrowRight
                    className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5"
                    style={{ color: accent }}
                />
            </span>
        </Link>
    );
}

const ProjectsV2 = ({ data, config, basePath = '/projects' }) => {
    const projects = useMemo(
        () => (Array.isArray(data) ? [...data].sort(compareProjects) : []),
        [data]
    );

    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return projects.filter((project) => (
            matchesFilter(project, filter)
            && (!needle || searchText(project).includes(needle))
        ));
    }, [projects, filter, query]);

    // Maintained work leads; everything else keeps admin order below it.
    const [maintained, rest] = useMemo(() => [
        filtered.filter((project) => isActive(project)),
        filtered.filter((project) => !isActive(project)),
    ], [filtered]);

    const totalStars = useMemo(() => sumRepoStat(projects, 'stars'), [projects]);
    const syncedCount = useMemo(() => projects.filter(isSynced).length, [projects]);
    const stackCount = useMemo(
        () => new Set(projects.flatMap((project) => project?.techStack || [])).size,
        [projects]
    );

    useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion, dependencies: [filtered] });

    const applyFilter = (next) => {
        setFilter(next);
        refreshScrollTriggersSoon();
    };

    let rowIndex = 0;

    return (
        <div ref={sectionRef} className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                <header className="relative mb-14 sm:mb-20">
                    <span
                        data-v2-depth="-0.4"
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none text-[6rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[11rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-cyan) 20%, transparent)',
                            opacity: 0.8,
                        }}
                    >
                        {'{ }'}
                    </span>

                    <p
                        data-v2="line"
                        className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]"
                        style={{ color: 'var(--accent-cyan)' }}
                    >
                        ~/open-source — the record
                    </p>
                    <h1
                        data-v2="line"
                        className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        {config?.projectsTitle || 'Open Source & Community'}
                    </h1>
                    <p
                        data-v2="rise"
                        className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        {config?.projectsSubtitle
                            || 'Libraries, apps and experiments I build and maintain in the open — synced from GitHub, annotated by hand.'}
                    </p>

                    <p data-v2="rise" className="mt-8 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span data-counter={projects.length}>{projects.length}</span> projects
                        {syncedCount > 0 && <> · <span data-counter={syncedCount}>{syncedCount}</span> live from GitHub</>}
                        {totalStars > 0 && <> · {formatCount(totalStars)} stars</>}
                        {' '}· <span data-counter={stackCount}>{stackCount}</span> technologies
                    </p>
                </header>

                <div data-v2="rise" className="mb-4 space-y-4 pb-6" style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <label className="flex items-center gap-3 font-mono text-sm" htmlFor="v2-project-search">
                        <FaMagnifyingGlass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" style={{ color: 'var(--accent-cyan)' }} />
                        <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>$ grep</span>
                        <span className="sr-only">Search projects</span>
                        <input
                            id="v2-project-search"
                            type="search"
                            value={query}
                            onChange={(event) => { setQuery(event.target.value); refreshScrollTriggersSoon(); }}
                            placeholder="name, language, topic…"
                            className="w-full min-w-0 bg-transparent pb-1 focus:outline-none focus-visible:ring-1"
                            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--hairline)' }}
                        />
                    </label>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 font-mono text-xs sm:text-sm">
                        <span className="uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>view:</span>
                        {FILTERS.map(({ id, label }) => {
                            const active = filter === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => applyFilter(id)}
                                    aria-pressed={active}
                                    className="cursor-pointer whitespace-nowrap py-1 underline-offset-4 hover:underline"
                                    style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}
                                >
                                    <span style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>[</span>
                                    {label}
                                    <span style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>]</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <p className="mb-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
                    → {filtered.length} of {projects.length} entries
                </p>

                {filtered.length === 0 ? (
                    <div className="py-20 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        <p>$ grep &quot;{query.trim() || filter}&quot; --open-source</p>
                        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>→ 0 matches.</p>
                        <button
                            type="button"
                            onClick={() => { setQuery(''); applyFilter('all'); }}
                            className="mt-6 cursor-pointer underline-offset-4 hover:underline"
                            style={{ color: 'var(--accent-orange)' }}
                        >
                            [reset --filters]
                        </button>
                    </div>
                ) : (
                    <>
                        {maintained.length > 0 && (
                            <section aria-labelledby="maintained-heading">
                                <div
                                    className="mt-10 flex items-baseline gap-4 pb-3"
                                    style={{ borderBottom: '1px solid var(--hairline)' }}
                                >
                                    <h2
                                        id="maintained-heading"
                                        className="font-mono text-sm font-semibold uppercase tracking-[0.3em]"
                                        style={{ color: 'var(--accent-cyan)' }}
                                    >
                                        /currently maintained
                                    </h2>
                                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {maintained.length} {maintained.length === 1 ? 'entry' : 'entries'}
                                    </span>
                                </div>

                                {maintained.map((project) => (
                                    <EntryRow
                                        key={project._id}
                                        project={project}
                                        index={rowIndex++}
                                        href={`${basePath}/${project.slug || project._id}`}
                                    />
                                ))}
                            </section>
                        )}

                        {rest.length > 0 && (
                            <section aria-labelledby="archive-heading">
                                <div
                                    className="mt-16 flex items-baseline gap-4 pb-3"
                                    style={{ borderBottom: '1px solid var(--hairline)' }}
                                >
                                    <h2
                                        id="archive-heading"
                                        className="font-mono text-sm font-semibold uppercase tracking-[0.3em]"
                                        style={{ color: 'var(--text-bright)' }}
                                    >
                                        /the archive
                                    </h2>
                                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {rest.length} {rest.length === 1 ? 'entry' : 'entries'}
                                    </span>
                                </div>

                                {rest.map((project) => (
                                    <EntryRow
                                        key={project._id}
                                        project={project}
                                        index={rowIndex++}
                                        href={`${basePath}/${project.slug || project._id}`}
                                    />
                                ))}
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ProjectsV2;
