"use client";

import React, { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { FaGithub } from 'react-icons/fa';
import { FaArrowUpRightFromSquare, FaMagnifyingGlass } from 'react-icons/fa6';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx, refreshScrollTriggersSoon } from '../../landing/v2/gsap3d';

const LANGUAGE_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Vue: '#41b883',
    Shell: '#89e051',
};

const DEFAULT_SECTIONS = {
    showProfile: true,
    showStats: true,
    showMetrics: true,
    showContributions: true,
    showActivity: true,
    showRepositories: true,
    showTopics: true,
    showRepoDistribution: true,
    showLanguages: true,
    showRadarChart: true,
    showConnect: true,
};

const REPO_FILTERS = [
    { key: 'all', label: 'all' },
    { key: 'public', label: 'public' },
    { key: 'private', label: 'private' },
    { key: 'fork', label: 'forks' },
];

const toDateLabel = (value) => {
    if (!value) return 'unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'unknown';
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getContributionColor = (count) => {
    if (count === 0) return 'color-mix(in srgb, var(--text-muted) 16%, transparent)';
    if (count < 3) return 'color-mix(in srgb, var(--status-success) 30%, transparent)';
    if (count < 6) return 'color-mix(in srgb, var(--status-success) 55%, transparent)';
    if (count < 10) return 'color-mix(in srgb, var(--status-success) 80%, transparent)';
    return 'var(--status-success)';
};

const getActivityLabel = (activity) => {
    if (!activity) return 'recent activity';

    switch (activity.type) {
        case 'PushEvent': {
            const commitCount = Array.isArray(activity.payload?.commits)
                ? activity.payload.commits.length
                : Number(activity.payload?.commits ?? activity.payload?.size ?? activity.payload?.distinctCommits);
            const hasCommitCount = activity.payload?.commitsKnown !== false
                && Number.isFinite(commitCount)
                && commitCount >= 0;
            if (!hasCommitCount) return 'git push';
            const safeCommitCount = Math.max(0, commitCount);
            return `git push · ${safeCommitCount} commit${safeCommitCount === 1 ? '' : 's'}`;
        }
        case 'PullRequestEvent':
            return `pull request ${activity.payload?.action || 'updated'}`;
        case 'CreateEvent':
            return `created ${activity.payload?.ref || 'repository'}`;
        case 'IssuesEvent':
            return `issue ${activity.payload?.action || 'updated'}`;
        default:
            return 'recent activity';
    }
};

const getRepoType = (repo) => {
    if (repo?.isPrivate) return 'private';
    if (repo?.fork) return 'fork';
    return 'public';
};

const isOptimizableImage = (src) =>
    typeof src === 'string' && (src.startsWith('/') || src.startsWith('https://'));

/** Hairline meter row shared by the distribution and language sections. */
const MeterRow = ({ label, value, suffix, color }) => (
    <div className="py-3" style={{ borderBottom: '1px solid var(--hairline)' }}>
        <div className="mb-2 flex items-baseline justify-between gap-3 font-mono text-xs sm:text-sm">
            <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                {label}
            </span>
            <span style={{ color }}>{value}%{suffix ? ` · ${suffix}` : ''}</span>
        </div>
        <div className="h-px w-full" style={{ backgroundColor: 'var(--hairline)' }}>
            <div
                className="h-px"
                style={{
                    width: `${Math.max(0, Math.min(100, value || 0))}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}`,
                }}
            />
        </div>
    </div>
);

/**
 * /v2/github — the open-source dashboard as an editorial dossier. Same
 * /api/github/stats payload and admin section toggles as the classic page,
 * re-set in the v2 voice: mono telemetry line, profile as a dossier row,
 * repositories as hairline ledger rows with a $ grep command strip, the
 * contribution heatmap flat on the page, and meters as hairline fills.
 */
const GitHubV2 = ({ data }) => {
    const [showAllActivities, setShowAllActivities] = useState(false);
    const [repoSearch, setRepoSearch] = useState('');
    const [repoType, setRepoType] = useState('all');

    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    const hasValidData = Boolean(data?.success);
    const payload = data?.data || {};
    const profile = payload?.profile || {};
    const stats = payload?.stats || {};
    const topRepos = Array.isArray(payload?.topRepos) ? payload.topRepos : [];
    const languages = Array.isArray(payload?.languages) ? payload.languages : [];
    const contributions = Array.isArray(payload?.contributions) ? payload.contributions : [];
    const streaks = payload?.streaks || {};
    const recentActivity = Array.isArray(payload?.recentActivity) ? payload.recentActivity : [];
    const activityDistribution = payload?.activityDistribution || {};
    const sections = { ...DEFAULT_SECTIONS, ...(payload?.sections || {}) };

    const contributionWeeks = useMemo(() => {
        if (contributions.length === 0) return [];
        const weeks = [];
        for (let index = 0; index < contributions.length; index += 7) {
            weeks.push(contributions.slice(index, index + 7));
        }
        return weeks;
    }, [contributions]);

    const filteredRepos = useMemo(() => {
        const normalizedSearch = repoSearch.trim().toLowerCase();

        return topRepos.filter((repo) => {
            const matchesSearch = !normalizedSearch || [repo?.name, repo?.description, repo?.language]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearch);
            const matchesType = repoType === 'all' || repoType === getRepoType(repo);
            return matchesSearch && matchesType;
        });
    }, [topRepos, repoSearch, repoType]);

    useV2Fx(sectionRef, {
        reducedMotion: prefersReducedMotion,
        dependencies: [filteredRepos, showAllActivities],
    });

    const visibleActivities = showAllActivities ? recentActivity : recentActivity.slice(0, 5);

    const totalRepos = Math.max(0, Number(stats.totalRepos) || 0);
    const privateReposRaw = Math.max(0, Number(stats.privateRepos) || 0);
    const effectiveTotalRepos = Math.max(totalRepos, privateReposRaw);
    const privateRepos = Math.min(privateReposRaw, effectiveTotalRepos);
    const publicRepos = Math.max(0, effectiveTotalRepos - privateRepos);
    const publicPercent = effectiveTotalRepos > 0 ? Math.round((publicRepos / effectiveTotalRepos) * 100) : 0;
    const privatePercent = effectiveTotalRepos > 0 ? Math.max(0, 100 - publicPercent) : 0;

    // Headline metrics — a stat board drawn from the same payload as the
    // one-line telemetry, surfaced as a hairline grid of big numbers.
    const metrics = useMemo(() => ([
        { label: 'stars earned', value: Math.max(0, Number(stats.totalStars) || 0), color: 'var(--accent-cyan)' },
        { label: 'forks', value: Math.max(0, Number(stats.totalForks) || 0), color: 'var(--accent-purple)' },
        { label: 'followers', value: Math.max(0, Number(profile.followers ?? stats.followers) || 0), color: 'var(--accent-pink)' },
        { label: 'contributions', value: Math.max(0, Number(stats.totalContributions) || 0), color: 'var(--status-success)' },
        { label: 'source repos', value: Math.max(0, Number(stats.sourceRepos) || 0), color: 'var(--accent-cyan)' },
        { label: 'forked repos', value: Math.max(0, Number(stats.forkedRepos) || 0), color: 'var(--accent-orange)' },
        { label: 'longest streak', value: Math.max(0, Number(streaks.longest) || 0), color: 'var(--status-success)' },
        { label: 'following', value: Math.max(0, Number(profile.following) || 0), color: 'var(--accent-purple)' },
    ]), [stats, profile, streaks]);

    // Distinct repo topics, aggregated across the visible top repositories.
    const topics = useMemo(() => {
        const seen = new Set();
        topRepos.forEach((repo) => {
            (Array.isArray(repo?.topics) ? repo.topics : []).forEach((topic) => {
                if (typeof topic === 'string' && topic.trim()) seen.add(topic.trim());
            });
        });
        return Array.from(seen);
    }, [topRepos]);

    // External profile links, in the order they read best in the ledger.
    const connectLinks = useMemo(() => {
        const links = [];
        if (profile.username) {
            links.push({ label: 'github', value: `@${profile.username}`, href: `https://github.com/${profile.username}` });
        }
        if (profile.twitter) {
            links.push({ label: 'x / twitter', value: `@${profile.twitter}`, href: `https://x.com/${profile.twitter}` });
        }
        if (profile.blog) {
            const blogHref = /^https?:\/\//i.test(profile.blog) ? profile.blog : `https://${profile.blog}`;
            links.push({ label: 'website', value: profile.blog.replace(/^https?:\/\//i, ''), href: blogHref });
        }
        return links;
    }, [profile]);

    if (!hasValidData) {
        return (
            <div className="relative overflow-hidden">
                <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                    <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-purple)' }}>
                        ~/github — open source telemetry
                    </p>
                    <div className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        <p>$ gh stats --fetch</p>
                        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                            → {data?.error || 'this page has not been configured yet.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={sectionRef} className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                {/* Page head */}
                <div className="relative mb-14 sm:mb-20">
                    <span
                        data-v2-depth="-0.4"
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none font-mono text-[6rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[11rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-purple) 20%, transparent)',
                            opacity: 0.8,
                        }}
                    >
                        git
                    </span>

                    <p data-v2="line" className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-purple)' }}>
                        ~/github — open source telemetry
                    </p>
                    <h1
                        data-v2="line"
                        className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        Open source, on the record.
                    </h1>
                    <p data-v2="rise" className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        A live view of repositories, contribution patterns, and recent development activity.
                    </p>

                    {sections.showStats && (
                        <p data-v2="rise" className="mt-8 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                            <span data-counter={stats.totalRepos || 0}>{stats.totalRepos || 0}</span> repos ·{' '}
                            <span data-counter={stats.totalStars || 0}>{stats.totalStars || 0}</span> stars ·{' '}
                            <span data-counter={stats.totalForks || 0}>{stats.totalForks || 0}</span> forks ·{' '}
                            <span data-counter={stats.totalContributions || 0}>{stats.totalContributions || 0}</span> contributions ·{' '}
                            <span style={{ color: 'var(--status-success)' }}>
                                <span data-counter={streaks.current || 0}>{streaks.current || 0}</span>-day streak
                            </span>
                        </p>
                    )}
                </div>

                {/* Profile dossier */}
                {sections.showProfile && (
                    <div
                        data-v2="rise"
                        className="mb-16 flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:gap-8"
                        style={{ borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}
                    >
                        {isOptimizableImage(profile.avatar) ? (
                            <Image
                                src={profile.avatar}
                                alt={profile.name || profile.username || 'GitHub avatar'}
                                width={88}
                                height={88}
                                className="h-22 w-22 shrink-0 rounded-full border object-cover"
                                style={{ borderColor: 'var(--hairline)' }}
                            />
                        ) : (
                            <div
                                className="flex h-22 w-22 shrink-0 items-center justify-center rounded-full border font-mono text-lg font-semibold"
                                style={{ borderColor: 'var(--hairline)', color: 'var(--accent-purple)' }}
                            >
                                {(profile?.name || profile?.username || 'GH').slice(0, 2).toUpperCase()}
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-bright)' }}>
                                {profile.name || profile.username}
                            </h2>
                            {profile.bio && (
                                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
                                    {profile.bio}
                                </p>
                            )}
                            <p className="mt-3 font-mono text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
                                @{profile.username}
                                {profile.location ? ` · ${profile.location}` : ''}
                                {profile.createdAt ? ` · since ${new Date(profile.createdAt).getFullYear()}` : ''}
                                {' · '}
                                <span style={{ color: 'var(--accent-purple)' }}>{profile.followers || 0} followers</span>
                                {' / '}{profile.following || 0} following
                            </p>
                        </div>

                        {profile.username && (
                            <a
                                href={`https://github.com/${profile.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex shrink-0 items-center gap-2 font-mono text-sm underline-offset-4 hover:underline"
                                style={{ color: 'var(--accent-purple)' }}
                            >
                                <FaGithub aria-hidden="true" /> open --profile <FaArrowUpRightFromSquare className="h-3 w-3" aria-hidden="true" />
                            </a>
                        )}
                    </div>
                )}

                {/* Headline metrics */}
                {sections.showMetrics && (
                    <section className="mb-20">
                        <p data-v2="line" className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-cyan)' }}>
                            $ gh stats --summary
                        </p>
                        <div
                            data-v2="rise"
                            className="grid grid-cols-2 sm:grid-cols-4"
                            style={{ borderTop: '1px solid var(--hairline)', borderLeft: '1px solid var(--hairline)' }}
                        >
                            {metrics.map((metric) => (
                                <div
                                    key={metric.label}
                                    className="px-4 py-6 sm:px-6 sm:py-8"
                                    style={{ borderRight: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}
                                >
                                    <div
                                        data-counter={metric.value}
                                        className="text-3xl font-bold leading-none tracking-tight sm:text-5xl"
                                        style={{ color: metric.color }}
                                    >
                                        {metric.value}
                                    </div>
                                    <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {metric.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Repositories ledger */}
                {sections.showRepositories && (
                    <section className="mb-20">
                        <p data-v2="line" className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-cyan)' }}>
                            $ gh repo list --top
                        </p>

                        <div data-v2="rise" className="mb-2 space-y-4 pb-6" style={{ borderBottom: '1px solid var(--hairline)' }}>
                            <label className="flex items-center gap-3 font-mono text-sm" htmlFor="v2-repo-search">
                                <FaMagnifyingGlass aria-hidden="true" className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-cyan)' }} />
                                <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>$ grep</span>
                                <input
                                    id="v2-repo-search"
                                    type="text"
                                    value={repoSearch}
                                    onChange={(event) => {
                                        setRepoSearch(event.target.value);
                                        refreshScrollTriggersSoon();
                                    }}
                                    placeholder="name, language…"
                                    className="w-full min-w-0 bg-transparent pb-1 focus:outline-none"
                                    style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--hairline)' }}
                                />
                            </label>

                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 font-mono text-xs sm:text-sm">
                                <span className="uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>type:</span>
                                {REPO_FILTERS.map((option) => {
                                    const active = repoType === option.key;
                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => {
                                                setRepoType(option.key);
                                                refreshScrollTriggersSoon();
                                            }}
                                            className="cursor-pointer whitespace-nowrap underline-offset-4 hover:underline"
                                            style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}
                                            aria-pressed={active}
                                        >
                                            <span style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>[</span>
                                            {option.label}
                                            <span style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>]</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <p data-v2="line" className="mb-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
                            → {filteredRepos.length} of {topRepos.length} repositories
                        </p>

                        {filteredRepos.length > 0 ? (
                            <div style={{ perspective: '1600px' }}>
                                {filteredRepos.map((repo, index) => {
                                    const languageColor = LANGUAGE_COLORS[repo?.language] || 'var(--text-muted)';
                                    const isLink = !repo?.isPrivate && repo?.url;
                                    const Row = isLink ? 'a' : 'div';
                                    const rowProps = isLink
                                        ? { href: repo.url, target: '_blank', rel: 'noopener noreferrer' }
                                        : {};

                                    return (
                                        <Row
                                            key={`${repo?.name}-${repo?.updated_at || index}`}
                                            {...rowProps}
                                            data-v2={index % 2 === 0 ? 'door-left' : 'door-right'}
                                            className="group grid grid-cols-12 items-baseline gap-4 py-6 sm:py-8"
                                            style={{ borderBottom: '1px solid var(--hairline)' }}
                                        >
                                            <span className="col-span-2 font-mono text-sm sm:col-span-1" style={{ color: 'var(--accent-cyan)' }}>
                                                {String(index + 1).padStart(2, '0')}
                                            </span>

                                            <span className="col-span-10 sm:col-span-8">
                                                <span
                                                    className="block text-2xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-4xl"
                                                    style={{ color: 'var(--text-bright)' }}
                                                >
                                                    {repo?.name}
                                                </span>
                                                <span className="mt-2 block max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                                                    {repo?.description || 'No description provided.'}
                                                </span>
                                                <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
                                                    {repo?.language && (
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: languageColor }} aria-hidden="true" />
                                                            {repo.language}
                                                        </span>
                                                    )}
                                                    <span>★ {repo?.stars || 0}</span>
                                                    <span>⑂ {repo?.forks || 0}</span>
                                                    {repo?.updated_at && <span>updated {toDateLabel(repo.updated_at)}</span>}
                                                </span>
                                            </span>

                                            <span
                                                className="col-span-10 col-start-3 font-mono text-xs sm:col-span-3 sm:col-start-10 sm:justify-self-end"
                                                style={{ color: repo?.isPrivate ? 'var(--accent-orange)' : 'var(--accent-cyan)' }}
                                            >
                                                [{getRepoType(repo)}]
                                                {isLink && (
                                                    <FaArrowUpRightFromSquare
                                                        className="ml-2 inline h-3 w-3 transition-transform duration-300 group-hover:translate-x-1"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                        </Row>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="py-10 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                $ gh repo list | grep &quot;{repoSearch.trim() || repoType}&quot; → no matches.
                            </p>
                        )}
                    </section>
                )}

                {/* Topics / tech tags */}
                {sections.showTopics && topics.length > 0 && (
                    <section className="mb-20">
                        <p data-v2="line" className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-purple)' }}>
                            $ gh repo list --topics
                        </p>
                        <div data-v2="rise" className="flex flex-wrap gap-3 pt-6" style={{ borderTop: '1px solid var(--hairline)' }}>
                            {topics.map((topic) => (
                                <span
                                    key={topic}
                                    className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs sm:text-sm"
                                    style={{ border: '1px solid var(--hairline)', color: 'var(--text-secondary)' }}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-purple)' }} aria-hidden="true" />
                                    {topic}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Contribution heatmap */}
                {sections.showContributions && contributionWeeks.length > 0 && (
                    <section className="mb-20">
                        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
                            <p data-v2="line" className="font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--status-success)' }}>
                                $ git log --graph --all
                            </p>
                            <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                longest streak: <span style={{ color: 'var(--status-success)' }}>{streaks.longest || 0} days</span>
                            </p>
                        </div>

                        <div data-v2="rise" className="w-full overflow-x-auto pb-2 pt-6" style={{ borderTop: '1px solid var(--hairline)' }}>
                            <div
                                className="grid min-w-[750px] gap-1 xl:min-w-full"
                                style={{ gridTemplateColumns: `repeat(${Math.max(contributionWeeks.length, 1)}, minmax(0, 1fr))` }}
                            >
                                {contributionWeeks.map((week, weekIdx) => (
                                    <div key={`week-${weekIdx}`} className="grid gap-1" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
                                        {Array.from({ length: 7 }, (_, dayIdx) => {
                                            const day = week[dayIdx];
                                            const count = day?.count || 0;
                                            return (
                                                <div
                                                    key={`day-${weekIdx}-${dayIdx}`}
                                                    className="aspect-square w-full rounded-[2px]"
                                                    style={{
                                                        backgroundColor: day ? getContributionColor(count) : 'transparent',
                                                    }}
                                                    title={day ? `${day?.date || ''}: ${count} contribution${count === 1 ? '' : 's'}` : 'No data'}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Activity ledger */}
                {sections.showActivity && recentActivity.length > 0 && (
                    <section className="mb-20">
                        <p data-v2="line" className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-orange)' }}>
                            $ git reflog --recent
                        </p>

                        <div style={{ borderTop: '1px solid var(--hairline)' }}>
                            {visibleActivities.map((activity, index) => (
                                <div
                                    key={`${activity?.repo}-${activity?.created_at}-${index}`}
                                    className="grid grid-cols-12 items-baseline gap-4 py-4"
                                    style={{ borderBottom: '1px solid var(--hairline)' }}
                                >
                                    <span className="col-span-12 font-mono text-xs sm:col-span-2" style={{ color: 'var(--text-muted)' }}>
                                        {toDateLabel(activity?.created_at)}
                                    </span>
                                    <span className="col-span-12 font-mono text-sm sm:col-span-4" style={{ color: 'var(--accent-orange)' }}>
                                        {getActivityLabel(activity)}
                                    </span>
                                    <span className="col-span-12 truncate font-mono text-sm sm:col-span-6" style={{ color: 'var(--text-secondary)' }}>
                                        {activity?.repo}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {recentActivity.length > 5 && (
                            <button
                                type="button"
                                onClick={() => setShowAllActivities((prev) => !prev)}
                                className="mt-6 cursor-pointer font-mono text-sm underline-offset-4 hover:underline"
                                style={{ color: 'var(--accent-orange)' }}
                            >
                                [{showAllActivities ? 'show --less' : `show --all (${recentActivity.length - 5} more)`}]
                            </button>
                        )}
                    </section>
                )}

                {/* Distribution + languages meters */}
                <div className="grid grid-cols-1 gap-14 lg:grid-cols-2">
                    {sections.showRepoDistribution && (
                        <section>
                            <p data-v2="line" className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-cyan)' }}>
                                $ repos --visibility
                            </p>
                            <div data-v2="rise" style={{ borderTop: '1px solid var(--hairline)' }}>
                                <MeterRow label={`public (${publicRepos})`} value={publicPercent} color="var(--accent-cyan)" />
                                <MeterRow label={`private (${privateRepos})`} value={privatePercent} color="var(--accent-orange)" />
                            </div>
                        </section>
                    )}

                    {sections.showRadarChart && (
                        <section>
                            <p data-v2="line" className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-pink)' }}>
                                $ activity --distribution
                            </p>
                            <div data-v2="rise" style={{ borderTop: '1px solid var(--hairline)' }}>
                                <MeterRow label="commits" value={activityDistribution.commits || 0} color="var(--accent-cyan)" />
                                <MeterRow label="pull requests" value={activityDistribution.pullRequests || 0} color="var(--accent-purple)" />
                                <MeterRow label="issues" value={activityDistribution.issues || 0} color="var(--accent-orange)" />
                                <MeterRow label="code review" value={activityDistribution.codeReview || 0} color="var(--accent-pink)" />
                            </div>
                        </section>
                    )}

                    {sections.showLanguages && languages.length > 0 && (
                        <section>
                            <p data-v2="line" className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-purple)' }}>
                                $ languages --by-repo
                            </p>
                            <div data-v2="rise" style={{ borderTop: '1px solid var(--hairline)' }}>
                                {languages.map((lang) => (
                                    <MeterRow
                                        key={lang.name}
                                        label={lang.name}
                                        value={lang.percentage || 0}
                                        suffix={`${lang.count} repos`}
                                        color={LANGUAGE_COLORS[lang.name] || 'var(--text-muted)'}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Connect — external profile links */}
                {sections.showConnect && connectLinks.length > 0 && (
                    <section className="mt-20">
                        <p data-v2="line" className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--accent-orange)' }}>
                            $ gh profile --links
                        </p>
                        <div data-v2="rise" style={{ borderTop: '1px solid var(--hairline)' }}>
                            {connectLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group grid grid-cols-12 items-baseline gap-4 py-5"
                                    style={{ borderBottom: '1px solid var(--hairline)' }}
                                >
                                    <span className="col-span-4 font-mono text-xs uppercase tracking-[0.2em] sm:col-span-3" style={{ color: 'var(--text-muted)' }}>
                                        {link.label}
                                    </span>
                                    <span
                                        className="col-span-8 font-mono text-sm transition-transform duration-300 group-hover:translate-x-2 sm:col-span-9"
                                        style={{ color: 'var(--accent-orange)' }}
                                    >
                                        {link.value}
                                        <FaArrowUpRightFromSquare className="ml-2 inline h-3 w-3" aria-hidden="true" />
                                    </span>
                                </a>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default GitHubV2;
