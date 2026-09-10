"use client";

/**
 * /v2/projects/[id] — one open-source entry.
 *
 * Rebuilt around the README. The reading order is deliberate: the hand-written
 * description is the lede (it says why the thing exists, which a README rarely
 * does), the live repo rail proves it is real and maintained, and the README
 * itself is the body. Specs sit last as reference.
 *
 * Motion is the shared useV2Fx engine (data-v2 attributes), which already
 * handles prefers-reduced-motion and the lite device tier — no per-page GSAP.
 */
import { useRef } from 'react';
import Link from 'next/link';
import { FaArrowLeftLong, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';
import RepoMeta from './RepoMeta';
import RepoReadme from './RepoReadme';
import { formatCount, hasReadme, isSynced, normalizeStatus, statusAccent } from './repoDisplay';

function isExternalHttpUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

const ProjectDetailV2 = ({ project, backHref = '/projects' }) => {
    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

    const repo = project?.repoData;
    const synced = isSynced(project);
    const status = normalizeStatus(project?.status);
    const accent = statusAccent(project?.status);
    const stack = Array.isArray(project?.techStack) ? project.techStack : [];
    const topics = Array.isArray(repo?.topics) ? repo.topics : [];

    const specs = [
        ['status', status],
        ['type', project?.projectType || 'Project'],
        ['year', project?.year || '—'],
        ...(repo?.language ? [['language', repo.language]] : []),
        ...(repo?.license ? [['license', repo.license]] : []),
        ...(repo?.stars ? [['stars', formatCount(repo.stars)]] : []),
        ...(repo?.forks ? [['forks', formatCount(repo.forks)]] : []),
        ...(repo?.defaultBranch ? [['branch', repo.defaultBranch]] : []),
    ];

    return (
        <div ref={sectionRef} className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-4xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                <Link
                    href={backHref}
                    data-v2="rise"
                    className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] underline-offset-4 hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <FaArrowLeftLong className="h-3 w-3" aria-hidden="true" /> cd ../open-source
                </Link>

                <header className="relative mb-12 mt-10">
                    <span
                        data-v2-depth="-0.4"
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none text-[6rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[11rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: `1.5px color-mix(in srgb, ${accent} 20%, transparent)`,
                            opacity: 0.8,
                        }}
                    >
                        {'{ }'}
                    </span>

                    <p
                        data-v2="line"
                        className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]"
                        style={{ color: accent }}
                    >
                        {synced ? repo.fullName : `~/projects — ${project?.year || 'entry'}`}
                    </p>

                    <h1
                        data-v2="line"
                        className="text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        {project?.name}
                    </h1>

                    {/* The hand-written lede: why this exists, in the site's voice. */}
                    <p
                        data-v2="rise"
                        className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        {project?.description || 'No description provided.'}
                    </p>

                    {synced && <RepoMeta project={project} className="mt-6" />}

                    <div data-v2="rise" className="mt-8 flex flex-wrap gap-3">
                        {isExternalHttpUrl(project?.codeLink) && (
                            <a
                                href={project.codeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-sm font-semibold transition-transform hover:-translate-y-0.5"
                                style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-primary, #05070d)' }}
                            >
                                view --source
                                <FaArrowUpRightFromSquare className="h-3 w-3" aria-hidden="true" />
                            </a>
                        )}

                        {isExternalHttpUrl(repo?.homepage) && (
                            <a
                                href={repo.homepage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-sm font-semibold underline-offset-4 transition-colors hover:underline"
                                style={{ border: '1px solid var(--hairline)', color: 'var(--accent-orange)' }}
                            >
                                open --live
                                <FaArrowUpRightFromSquare className="h-3 w-3" aria-hidden="true" />
                            </a>
                        )}

                        {isExternalHttpUrl(project?.blogLink) && (
                            <a
                                href={project.blogLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-sm font-semibold underline-offset-4 transition-colors hover:underline"
                                style={{ border: '1px solid var(--hairline)', color: 'var(--accent-purple)' }}
                            >
                                read --writeup
                                <FaArrowUpRightFromSquare className="h-3 w-3" aria-hidden="true" />
                            </a>
                        )}
                    </div>
                </header>

                {project?.image && (
                    <div
                        data-v2="float"
                        className="mb-14 overflow-hidden rounded-2xl border"
                        style={{ borderColor: 'var(--hairline)' }}
                    >
                        {/* Admin-uploaded or remote repo art; plain img keeps arbitrary
                            hosts working without next.config remotePatterns entries. */}
                        <img
                            src={project.image}
                            alt={`${project?.name || 'Project'} preview`}
                            className="block h-auto w-full"
                            loading="eager"
                            decoding="async"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                )}

                {hasReadme(project) && (
                    <div data-v2="rise" className="mb-16">
                        <RepoReadme markdown={project.readme} repoName={repo?.fullName} />
                    </div>
                )}

                {(stack.length > 0 || topics.length > 0) && (
                    <div data-v2="rise" className="mb-14">
                        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                            {'// stack'}
                        </h2>
                        <ul className="flex list-none flex-wrap gap-2 p-0">
                            {[...new Set([...stack, ...topics])].map((tech) => (
                                <li
                                    key={tech}
                                    className="rounded-full px-3 py-1 font-mono text-xs"
                                    style={{
                                        border: '1px solid var(--hairline)',
                                        color: 'var(--text-secondary)',
                                        backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 5%, transparent)',
                                    }}
                                >
                                    {tech}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div data-v2="rise">
                    <h2 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                        {'// specs'}
                    </h2>
                    <dl>
                        {specs.map(([label, value]) => (
                            <div
                                key={label}
                                className="flex items-baseline justify-between gap-4 py-3.5 font-mono text-sm"
                                style={{ borderBottom: '1px solid var(--hairline)' }}
                            >
                                <dt className="uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                                <dd className="text-right" style={{ color: 'var(--text-secondary)' }}>{value}</dd>
                            </div>
                        ))}
                    </dl>

                    {project?.syncedAt && (
                        <p className="mt-4 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Repository data last synced{' '}
                            <time dateTime={new Date(project.syncedAt).toISOString()}>
                                {new Date(project.syncedAt).toLocaleDateString()}
                            </time>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailV2;
