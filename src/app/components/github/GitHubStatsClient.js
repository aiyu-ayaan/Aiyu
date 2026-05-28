'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { FaGithub } from 'react-icons/fa';
import {
  Activity,
  BarChart2,
  BookOpen,
  Calendar,
  ExternalLink,
  Flame,
  GitCommit,
  GitFork,
  GitPullRequest,
  Lock,
  MapPin,
  Star,
  TrendingUp,
  Unlock,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import RouteBetaBadge from '../shared/RouteBetaBadge';

const languageColors = {
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

const defaultSections = {
  showProfile: true,
  showStats: true,
  showContributions: true,
  showActivity: true,
  showRepositories: true,
  showRepoDistribution: true,
  showLanguages: true,
  showRadarChart: true,
};

const toDateLabel = (value) => {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getContributionColor = (count) => {
  if (count === 0) return '#1f2937';
  if (count < 3) return '#14532d';
  if (count < 6) return '#166534';
  if (count < 10) return '#22c55e';
  return '#4ade80';
};

const getActivityLabel = (activity) => {
  if (!activity) return 'Recent activity';

  switch (activity.type) {
    case 'PushEvent': {
      const commitCount = Array.isArray(activity.payload?.commits)
        ? activity.payload.commits.length
        : Number(activity.payload?.commits ?? activity.payload?.size ?? activity.payload?.distinctCommits);
      const hasCommitCount = activity.payload?.commitsKnown !== false
        && Number.isFinite(commitCount)
        && commitCount >= 0;
      if (!hasCommitCount) {
        return 'Pushed commits';
      }
      const safeCommitCount = Math.max(0, commitCount);
      return `Pushed ${safeCommitCount} commit${safeCommitCount === 1 ? '' : 's'}`;
    }
    case 'PullRequestEvent':
      return `${activity.payload?.action || 'updated'} a pull request`;
    case 'CreateEvent':
      return `Created ${activity.payload?.ref || 'repository'} `;
    case 'IssuesEvent':
      return `${activity.payload?.action || 'updated'} an issue`;
    default:
      return 'Recent activity';
  }
};

const getActivityIcon = (type) => {
  if (type === 'PushEvent') return GitCommit;
  if (type === 'PullRequestEvent') return GitPullRequest;
  return Activity;
};

const getRepoType = (repo) => {
  if (repo?.isPrivate) return 'private';
  if (repo?.fork) return 'fork';
  return 'public';
};

const isOptimizableImage = (src) =>
  typeof src === 'string' && (src.startsWith('/') || src.startsWith('https://'));

const getAvatarFallback = (profile) => {
  const seed = profile?.name || profile?.username || 'GH';
  return seed.slice(0, 2).toUpperCase();
};

export default function GitHubStatsClient({ data }) {
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoType, setRepoType] = useState('all');
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
  const sections = { ...defaultSections, ...(payload?.sections || {}) };

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

      const currentType = getRepoType(repo);
      const matchesType = repoType === 'all' || repoType === currentType;

      return matchesSearch && matchesType;
    });
  }, [topRepos, repoSearch, repoType]);

  const visibleActivities = showAllActivities ? recentActivity : recentActivity.slice(0, 5);

  const statCards = [
    {
      label: 'Repositories',
      value: stats.totalRepos || 0,
      icon: BookOpen,
      accent: 'var(--accent-cyan)',
    },
    {
      label: 'Total Stars',
      value: stats.totalStars || 0,
      icon: Star,
      accent: 'var(--accent-orange)',
    },
    {
      label: 'Total Forks',
      value: stats.totalForks || 0,
      icon: GitFork,
      accent: 'var(--accent-purple)',
    },
    {
      label: 'Contributions',
      value: stats.totalContributions || 0,
      icon: TrendingUp,
      accent: 'var(--accent-pink)',
    },
    {
      label: 'Current Streak',
      value: streaks.current || 0,
      icon: Flame,
      accent: 'var(--status-success)',
    },
  ];

  const totalRepos = Math.max(0, Number(stats.totalRepos) || 0);
  const privateReposRaw = Math.max(0, Number(stats.privateRepos) || 0);
  const effectiveTotalRepos = Math.max(totalRepos, privateReposRaw);
  const privateRepos = Math.min(privateReposRaw, effectiveTotalRepos);
  const publicRepos = Math.max(0, effectiveTotalRepos - privateRepos);
  const publicPercent = effectiveTotalRepos > 0 ? Math.round((publicRepos / effectiveTotalRepos) * 100) : 0;
  const privatePercent = effectiveTotalRepos > 0 ? Math.max(0, 100 - publicPercent) : 0;

  if (!hasValidData) {
    return (
      <div className="min-h-screen p-4 lg:p-8">
        <div
          className="mx-auto max-w-2xl rounded-2xl border p-8 text-center"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
          }}
        >
          <FaGithub className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--text-tertiary)' }} />
          <h2 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            GitHub Stats Not Available
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {data?.error || 'This page has not been configured yet.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative min-h-screen overflow-hidden p-4 lg:p-8"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 30%, transparent), transparent 70%)' }} />
      <div className="pointer-events-none absolute -right-20 top-1/4 h-64 w-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 24%, transparent), transparent 70%)' }} />

      <div className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%]">
        <section
          className="rounded-3xl border p-6 sm:p-8"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 93%, transparent), color-mix(in srgb, var(--bg-secondary) 93%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
            boxShadow: '0 16px 36px var(--shadow-sm)',
          }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]" style={{ borderColor: 'color-mix(in srgb, var(--accent-cyan) 42%, var(--border-secondary))', color: 'var(--accent-cyan)' }}>
              Open Source Dashboard
            </p>
            <RouteBetaBadge />
          </div>
          <h1 className="mb-3 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent sm:text-5xl lg:text-6xl" style={{ backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))' }}>
            GitHub Statistics
          </h1>
          <p className="max-w-2xl text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            A live view of repositories, contribution patterns, and recent development activity.
          </p>

          {sections.showProfile && (
            <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)' }}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {isOptimizableImage(profile.avatar) ? (
                  <Image
                    src={profile.avatar}
                    alt={profile.name || profile.username || 'GitHub avatar'}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full border-2 object-cover"
                    style={{ borderColor: 'var(--accent-cyan)' }}
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full border-2 text-lg font-semibold"
                    style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                  >
                    {getAvatarFallback(profile)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {profile.name || profile.username}
                  </h2>
                  <p className="mb-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    @{profile.username}
                  </p>
                  {profile.bio && (
                    <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                      {profile.bio}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {profile.location && (
                      <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {profile.location}</span>
                    )}
                    {profile.createdAt && (
                      <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> Joined {new Date(profile.createdAt).getFullYear()}</span>
                    )}
                    {profile.blog && (
                      <a href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline" style={{ color: 'var(--accent-cyan)' }}>
                        <ExternalLink size={14} /> Website
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 text-center">
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)' }}>
                    <p className="text-lg font-bold">{profile.followers || 0}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Followers</p>
                  </div>
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)' }}>
                    <p className="text-lg font-bold">{profile.following || 0}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Following</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {sections.showStats && (
          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
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
                  <div className="mb-2 inline-flex rounded-lg p-2" style={{ backgroundColor: `color-mix(in srgb, ${item.accent} 14%, transparent)` }}>
                    <Icon size={14} style={{ color: item.accent }} />
                  </div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                </div>
              );
            })}
          </section>
        )}

        {sections.showRepositories && (
          <section
            className="mt-8 rounded-2xl border p-5"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
              borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
            }}
          >
            <h2 className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Top Repositories
            </h2>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="text"
                value={repoSearch}
                onChange={(event) => setRepoSearch(event.target.value)}
                placeholder="Search repositories"
                className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'public', label: 'Public' },
                  { key: 'private', label: 'Private' },
                  { key: 'fork', label: 'Forks' },
                ].map((option) => {
                  const active = repoType === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setRepoType(option.key)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                      style={{
                        borderColor: active
                          ? 'color-mix(in srgb, var(--accent-cyan) 55%, var(--border-secondary))'
                          : 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                        color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        backgroundColor: active
                          ? 'color-mix(in srgb, var(--accent-cyan) 11%, transparent)'
                          : 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredRepos.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredRepos.map((repo) => {
                  const Wrapper = repo?.isPrivate ? 'div' : 'a';
                  const wrapperProps = repo?.isPrivate
                    ? {}
                    : {
                      href: repo?.url,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    };

                  return (
                    <Wrapper
                      key={`${repo?.name}-${repo?.updated_at}`}
                      {...wrapperProps}
                      className="rounded-xl border p-4 transition-colors"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                      }}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="truncate text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                          {repo?.name}
                        </h3>
                        {repo?.isPrivate ? (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ borderColor: 'color-mix(in srgb, #f59e0b 40%, transparent)', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
                            <Lock size={10} /> Private
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ borderColor: 'color-mix(in srgb, #10b981 40%, transparent)', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
                            <Unlock size={10} /> Public
                          </span>
                        )}
                      </div>

                      <p className="mb-3 min-h-[40px] text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {repo?.description || 'No description provided.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {repo?.language && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColors[repo.language] || '#64748b' }} />
                            {repo.language}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5"><Star size={13} /> {repo?.stars || 0}</span>
                        <span className="inline-flex items-center gap-1.5"><GitFork size={13} /> {repo?.forks || 0}</span>
                      </div>
                    </Wrapper>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No repositories match this filter.</p>
              </div>
            )}
          </section>
        )}

        {sections.showContributions && contributionWeeks.length > 0 && (
          <section
            className="mt-8 rounded-2xl border p-5"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
              borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
            }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Contribution Activity
              </h2>
              <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'color-mix(in srgb, var(--accent-orange) 45%, var(--border-secondary))', color: 'var(--accent-orange)', backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)' }}>
                Longest Streak: {streaks.longest || 0} days
              </span>
            </div>

            <div className="w-full overflow-x-auto pb-4">
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
                          className="aspect-square w-full rounded-sm"
                          style={{
                            backgroundColor: day ? getContributionColor(count) : 'transparent',
                            opacity: day ? 1 : 0.35,
                          }}
                          title={
                            day
                              ? `${day?.date || ''}: ${count} contribution${count === 1 ? '' : 's'}`
                              : 'No data'
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {sections.showActivity && recentActivity.length > 0 && (
          <section
            className="mt-8 rounded-2xl border p-5"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
              borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
            }}
          >
            <h2 className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Activity Timeline
            </h2>
            <div className="space-y-3">
              {visibleActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity?.type);
                return (
                  <div
                    key={`${activity?.repo}-${activity?.created_at}-${index}`}
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                    }}
                  >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        <Icon size={14} style={{ color: 'var(--accent-cyan)' }} />
                        {getActivityLabel(activity)}
                      </p>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {toDateLabel(activity?.created_at)}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{activity?.repo}</p>
                  </div>
                );
              })}
            </div>
            {recentActivity.length > 5 && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllActivities((prev) => !prev)}
                  className="rounded-full border px-4 py-2 text-sm font-semibold"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-cyan) 50%, var(--border-secondary))',
                    color: 'var(--accent-cyan)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
                  }}
                >
                  {showAllActivities ? 'Show Less Activity' : `Show More (${recentActivity.length - 5})`}
                </button>
              </div>
            )}
          </section>
        )}

        {sections.showRepoDistribution && (
          <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-5" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)' }}>
              <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                <BarChart2 size={18} style={{ color: 'var(--accent-cyan)' }} /> Repository Visibility
              </h3>

              <div className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 65%, transparent)' }}>
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>Total Repositories</p>
                <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{effectiveTotalRepos}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {publicPercent}% public and {privatePercent}% private
                </p>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full border" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)' }}>
                <div className="flex h-full w-full">
                  <div style={{ width: `${publicPercent}%`, backgroundColor: 'var(--accent-cyan)' }} />
                  <div style={{ width: `${privatePercent}%`, backgroundColor: 'var(--accent-orange)' }} />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-lg border p-3" style={{ borderColor: 'color-mix(in srgb, var(--accent-cyan) 40%, var(--border-secondary))', backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)' }}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                      <Unlock size={14} style={{ color: 'var(--accent-cyan)' }} /> Public Repos
                    </span>
                    <span style={{ color: 'var(--accent-cyan)' }}>{publicRepos}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{publicPercent}% of repository portfolio</p>
                </div>

                <div className="rounded-lg border p-3" style={{ borderColor: 'color-mix(in srgb, var(--accent-orange) 40%, var(--border-secondary))', backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)' }}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                      <Lock size={14} style={{ color: 'var(--accent-orange)' }} /> Private Repos
                    </span>
                    <span style={{ color: 'var(--accent-orange)' }}>{privateRepos}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{privatePercent}% of repository portfolio</p>
                </div>
              </div>
            </div>

            {sections.showRadarChart && (
              <div className="rounded-2xl border p-5" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)' }}>
                <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  <Activity size={18} style={{ color: 'var(--accent-purple)' }} /> Activity Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Commits', value: activityDistribution.commits || 0, color: 'var(--accent-cyan)', icon: GitCommit },
                    { label: 'Pull Requests', value: activityDistribution.pullRequests || 0, color: 'var(--accent-purple)', icon: GitPullRequest },
                    { label: 'Issues', value: activityDistribution.issues || 0, color: 'var(--accent-orange)', icon: Users },
                    { label: 'Code Review', value: activityDistribution.codeReview || 0, color: 'var(--accent-pink)', icon: TrendingUp },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                            <Icon size={14} style={{ color: item.color }} /> {item.label}
                          </span>
                          <span style={{ color: item.color }}>{item.value}%</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 85%, transparent)' }}>
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.max(0, Math.min(100, item.value))}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {sections.showLanguages && languages.length > 0 && (
          <section
            className="mt-8 rounded-2xl border p-5"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
              borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
            }}
          >
            <h2 className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Most Used Languages
            </h2>
            <div className="space-y-3">
              {languages.map((lang) => (
                <div key={lang.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColors[lang.name] || '#64748b' }} />
                      {lang.name}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)' }}>{lang.percentage}% ({lang.count} repos)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 85%, transparent)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, lang.percentage || 0))}%`, backgroundColor: languageColors[lang.name] || '#64748b' }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
