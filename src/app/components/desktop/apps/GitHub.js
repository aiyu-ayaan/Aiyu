"use client";
import React, { useEffect, useState } from 'react';
import {
    Star,
    GitFork,
    Users,
    BookMarked,
    Flame,
    GitCommit,
    ExternalLink,
    Loader2,
    AlertCircle,
    MapPin,
    Link as LinkIcon,
} from 'lucide-react';
import { useDeviceMode } from '../../../context/DeviceModeContext';

// A desktop "GitHub Desktop"-style client backed by the site's own
// /api/github/stats endpoint (profile, repos, languages, streaks, activity).
export default function GitHub() {
    const { isMobile, isTablet } = useDeviceMode();
    const [data, setData] = useState(null);
    const [state, setState] = useState('loading'); // loading | ok | error | unconfigured
    const [message, setMessage] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch('/api/github/stats');
                const json = await res.json().catch(() => null);
                if (!alive) return;
                if (res.status === 404) {
                    setState('unconfigured');
                    return;
                }
                if (!res.ok || !json?.success) {
                    setState('error');
                    setMessage(json?.error || 'Failed to load GitHub data');
                    return;
                }
                setData(json.data);
                setState('ok');
            } catch {
                if (alive) {
                    setState('error');
                    setMessage('Network error');
                }
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    if (state === 'loading') {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[#0d1117] text-white/60">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (state !== 'ok') {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0d1117] p-6 text-center text-white/60">
                <AlertCircle className="h-8 w-8 text-amber-400" />
                <p className="text-sm">
                    {state === 'unconfigured'
                        ? 'GitHub is not configured yet. Add a username in the admin GitHub panel.'
                        : message}
                </p>
            </div>
        );
    }

    const { profile, stats, streaks, topRepos = [], languages = [], recentActivity = [] } = data;

    return (
        <div className="h-full w-full overflow-y-auto bg-[#0d1117] text-[#e6edf3]">
            {/* Profile header */}
            <div className="border-b border-white/10 bg-gradient-to-b from-[#161b22] to-[#0d1117] p-5">
                <div className="flex items-center gap-4">
                    {profile.avatar && (
                        <img src={profile.avatar} alt={profile.username} className="h-16 w-16 rounded-full ring-2 ring-white/10" />
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-lg font-semibold">{profile.name || profile.username}</h2>
                            <a
                                href={`https://github.com/${profile.username}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-white/40 hover:text-white"
                                title="Open on GitHub"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                        <div className="text-sm text-white/50">@{profile.username}</div>
                        {profile.bio && <p className="mt-1 line-clamp-2 text-sm text-white/70">{profile.bio}</p>}
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                            {profile.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {profile.location}
                                </span>
                            )}
                            {profile.blog && (
                                <a
                                    href={/^https?:\/\//.test(profile.blog) ? profile.blog : `https://${profile.blog}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-blue-400 hover:underline truncate"
                                >
                                    <LinkIcon className="h-3 w-3 shrink-0" /> {profile.blog}
                                </a>
                            )}
                            <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> {profile.followers} <span className={isMobile ? 'hidden' : ''}>followers</span> · {profile.following} <span className={isMobile ? 'hidden' : ''}>following</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-6">
                <Stat icon={BookMarked} label="Repos" value={stats.totalRepos} />
                <Stat icon={Star} label="Stars" value={stats.totalStars} />
                <Stat icon={GitFork} label="Forks" value={stats.totalForks} />
                <Stat icon={GitCommit} label="Contributions" value={stats.totalContributions} />
                <Stat icon={Flame} label="Current streak" value={`${streaks?.current ?? 0}d`} />
                <Stat icon={Flame} label="Longest streak" value={`${streaks?.longest ?? 0}d`} />
            </div>

            <div className="grid gap-4 p-4 pt-0 lg:grid-cols-2">
                {/* Top repos */}
                <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Top repositories</h3>
                    <div className="space-y-2">
                        {topRepos.map((r) => (
                            <a
                                key={r.name}
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-lg border border-white/10 bg-[#161b22] p-3 transition hover:border-blue-500/40"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-medium text-blue-400">{r.name}</span>
                                    <span className="flex shrink-0 items-center gap-3 text-xs text-white/50">
                                        <span className="flex items-center gap-1">
                                            <Star className="h-3 w-3" /> {r.stars}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <GitFork className="h-3 w-3" /> {r.forks}
                                        </span>
                                    </span>
                                </div>
                                {r.description && <p className="mt-1 line-clamp-2 text-xs text-white/60">{r.description}</p>}
                                {r.language && (
                                    <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/50">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: langColor(r.language) }} />
                                        {r.language}
                                    </span>
                                )}
                            </a>
                        ))}
                        {topRepos.length === 0 && <Empty label="No repositories" />}
                    </div>
                </section>

                {/* Languages + activity */}
                <section className="space-y-4">
                    <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Languages</h3>
                        <div className="rounded-lg border border-white/10 bg-[#161b22] p-3">
                            {languages.length > 0 && (
                                <div className="mb-3 flex h-2.5 w-full overflow-hidden rounded-full">
                                    {languages.map((l) => (
                                        <div key={l.name} style={{ width: `${l.percentage}%`, background: langColor(l.name) }} title={`${l.name} ${l.percentage}%`} />
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                {languages.map((l) => (
                                    <span key={l.name} className="flex items-center gap-1.5 text-white/60">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: langColor(l.name) }} />
                                        {l.name} <span className="text-white/40">{l.percentage}%</span>
                                    </span>
                                ))}
                                {languages.length === 0 && <Empty label="No language data" />}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Recent activity</h3>
                        <div className="space-y-1.5">
                            {recentActivity.slice(0, 6).map((a, i) => (
                                <div key={i} className="flex items-center gap-2 rounded-md border border-white/10 bg-[#161b22] px-3 py-1.5 text-xs">
                                    <GitCommit className="h-3.5 w-3.5 shrink-0 text-green-400" />
                                    <span className="truncate">
                                        <span className="text-white/50">{prettyEvent(a.type)}</span>{' '}
                                        <span className="text-blue-400">{a.repo}</span>
                                    </span>
                                    <span className="ml-auto shrink-0 text-white/30">{timeAgo(a.created_at)}</span>
                                </div>
                            ))}
                            {recentActivity.length === 0 && <Empty label="No recent activity" />}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

function Stat({ icon: Icon, label, value }) {
    return (
        <div className="rounded-lg border border-white/10 bg-[#161b22] p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/40">
                <Icon className="h-3.5 w-3.5" /> {label}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{value ?? 0}</div>
        </div>
    );
}

function Empty({ label }) {
    return <div className="py-4 text-center text-xs text-white/30">{label}</div>;
}

function prettyEvent(type = '') {
    return (
        {
            PushEvent: 'Pushed to',
            PullRequestEvent: 'PR on',
            IssuesEvent: 'Issue on',
            IssueCommentEvent: 'Commented on',
            CreateEvent: 'Created',
            WatchEvent: 'Starred',
            ForkEvent: 'Forked',
            PullRequestReviewEvent: 'Reviewed',
        }[type] || type.replace('Event', '')
    );
}

function timeAgo(iso) {
    if (!iso) return '';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

// A small subset of GitHub's language colors; falls back to a neutral gray.
const LANG_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Vue: '#41b883',
    Svelte: '#ff3e00',
};
function langColor(name) {
    return LANG_COLORS[name] || '#8b949e';
}
