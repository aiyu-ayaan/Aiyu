'use client';

import { Github, Star, GitFork, Users, BookOpen, MapPin, Link as LinkIcon, Calendar, Flame, TrendingUp, GitCommit, GitPullRequest, GitMerge, Lock, Unlock, BarChart2, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useTheme } from '../../context/ThemeContext';

export default function GitHubStatsClient({ data }) {
    const { theme } = useTheme();
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
    const [showAllActivities, setShowAllActivities] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (!data.success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <Github className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <h1 className="text-2xl font-bold mb-2">GitHub Stats Not Available</h1>
                    <p className="text-[var(--text-secondary)]">
                        {data.error || 'This page has not been configured yet.'}
                    </p>
                </div>
            </div>
        );
    }

    const { profile, stats, topRepos, languages, contributions, streaks, recentActivity, sections, activityDistribution } = data.data;

    // Language colors (GitHub standard colors)
    const languageColors = {
        'JavaScript': '#f1e05a',
        'TypeScript': '#3178c6',
        'Python': '#3572A5',
        'Java': '#b07219',
        'C++': '#f34b7d',
        'C': '#555555',
        'Go': '#00ADD8',
        'Rust': '#dea584',
        'Ruby': '#701516',
        'PHP': '#4F5D95',
        'Swift': '#F05138',
        'Kotlin': '#A97BFF',
        'Dart': '#00B4AB',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'Vue': '#41b883',
        'Shell': '#89e051'
    };

    // Helper to get contribution color
    const getContributionColor = (count) => {
        if (count === 0) return 'bg-gray-800';
        if (count < 3) return 'bg-green-900';
        if (count < 6) return 'bg-green-700';
        if (count < 9) return 'bg-green-500';
        return 'bg-green-400';
    };

    // Format activity type
    const getActivityIcon = (type) => {
        switch (type) {
            case 'PushEvent': return <GitCommit className="w-4 h-4" />;
            case 'PullRequestEvent': return <GitPullRequest className="w-4 h-4" />;
            case 'CreateEvent': return <GitMerge className="w-4 h-4" />;
            case 'IssuesEvent': return <BookOpen className="w-4 h-4" />;
            default: return <Github className="w-4 h-4" />;
        }
    };

    const getActivityText = (activity) => {
        switch (activity.type) {
            case 'PushEvent':
                return `Pushed ${activity.payload.commits} commit${activity.payload.commits !== 1 ? 's' : ''} to ${activity.repo}`;
            case 'PullRequestEvent':
                return `${activity.payload.action} a pull request in ${activity.repo}`;
            case 'CreateEvent':
                return `Created ${activity.payload.ref || 'repository'} in ${activity.repo}`;
            case 'IssuesEvent':
                return `${activity.payload.action} an issue in ${activity.repo}`;
            default:
                return `Activity in ${activity.repo}`;
        }
    };

    // Prepare contribution grid (52 weeks × 7 days)
    const weeks = [];
    if (contributions && contributions.length > 0) {
        for (let i = 0; i < contributions.length; i += 7) {
            weeks.push(contributions.slice(i, i + 7));
        }
    }

    return (
        <motion.div
            className="min-h-screen py-16 px-4 sm:px-6 lg:px-8"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <motion.div className="text-center mb-12" variants={itemVariants}>
                    <Github className="w-16 h-16 mx-auto mb-4 text-[var(--primary)]" />
                    <h1
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 pb-2 bg-gradient-to-r bg-clip-text text-transparent"
                        style={{
                            backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))'
                        }}
                    >
                        GitHub Statistics
                    </h1>
                    <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        My open source journey and contributions
                    </p>
                </motion.div>

                {/* Profile Card */}
                {sections?.showProfile && (
                    <motion.div className="bg-[var(--surface-card)] rounded-xl p-6 mb-8 border border-[var(--border-secondary)]" variants={itemVariants}>
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <img
                                src={profile.avatar}
                                alt={profile.name}
                                className="w-32 h-32 rounded-full border-4 border-[var(--primary)]"
                            />
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-bold mb-2">{profile.name || profile.username}</h2>
                                <p className="text-[var(--text-secondary)] mb-4">@{profile.username}</p>
                                {profile.bio && (
                                    <p className="text-[var(--text-secondary)] mb-4">{profile.bio}</p>
                                )}
                                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-[var(--text-secondary)]">
                                    {profile.location && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {profile.location}
                                        </div>
                                    )}
                                    {profile.blog && (
                                        <a href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[var(--primary)]">
                                            <LinkIcon className="w-4 h-4" />
                                            {profile.blog}
                                        </a>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Joined {new Date(profile.createdAt).getFullYear()}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{profile.followers}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Followers</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{profile.following}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Following</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Stats Grid */}
                {sections?.showStats && (
                    <motion.div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8" variants={itemVariants}>
                        <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)] text-center">
                            <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                            <div className="text-3xl font-bold mb-1">{stats.totalRepos}</div>
                            <div className="text-sm text-[var(--text-secondary)]">Repositories</div>
                        </div>
                        <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)] text-center">
                            <Star className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                            <div className="text-3xl font-bold mb-1">{stats.totalStars}</div>
                            <div className="text-sm text-[var(--text-secondary)]">Total Stars</div>
                        </div>
                        <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)] text-center">
                            <GitFork className="w-8 h-8 mx-auto mb-2 text-green-400" />
                            <div className="text-3xl font-bold mb-1">{stats.totalForks}</div>
                            <div className="text-sm text-[var(--text-secondary)]">Total Forks</div>
                        </div>
                        <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)] text-center">
                            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                            <div className="text-3xl font-bold mb-1">{stats.totalContributions}</div>
                            <div className="text-sm text-[var(--text-secondary)]">Contributions</div>
                        </div>
                        <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)] text-center">
                            <Flame className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                            <div className="text-3xl font-bold mb-1">{streaks.current}</div>
                            <div className="text-sm text-[var(--text-secondary)]">Day Streak</div>
                        </div>
                    </motion.div>
                )}

                {/* Contribution Graph */}
                {sections?.showContributions && weeks.length > 0 && (
                    <motion.div className="mb-8" variants={itemVariants}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <h2 className="text-2xl font-bold">Contribution Activity</h2>
                            <div className="text-sm text-[var(--text-secondary)]">
                                Longest Streak: <span className="text-orange-400 font-bold">{streaks.longest} days</span>
                            </div>
                        </div>
                        <div className="bg-[var(--surface-card)] rounded-xl p-4 sm:p-6 border border-[var(--border-secondary)] overflow-x-auto">
                            <div className="flex gap-1 w-fit mx-auto">
                                {weeks.map((week, weekIdx) => (
                                    <div key={weekIdx} className="flex flex-col gap-1">
                                        {week.map((day, dayIdx) => (
                                            <div
                                                key={dayIdx}
                                                className={`w-3 h-3 rounded-sm ${getContributionColor(day.count)} transition-opacity hover:opacity-75`}
                                                title={`${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-xs text-[var(--text-secondary)]">
                                <span>Less</span>
                                <div className="w-3 h-3 rounded-sm bg-gray-800"></div>
                                <div className="w-3 h-3 rounded-sm bg-green-900"></div>
                                <div className="w-3 h-3 rounded-sm bg-green-700"></div>
                                <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                                <div className="w-3 h-3 rounded-sm bg-green-400"></div>
                                <span>More</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Recent Activity Timeline */}
                {sections?.showActivity && recentActivity?.length > 0 && (
                    <motion.div className="mb-12" variants={itemVariants}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <GitCommit className="text-[var(--primary)]" />
                            Activity Timeline
                        </h2>
                        <div className="bg-[var(--surface-card)] rounded-xl p-6 md:p-8 border border-[var(--border-secondary)]">
                            <div className="relative border-l-2 border-slate-700/50 ml-4 md:ml-6 space-y-8 pb-4">
                                {recentActivity.slice(0, showAllActivities ? undefined : 2).map((activity, idx) => {
                                    // Determine styling based on activity type
                                    let iconColor = 'text-slate-400';
                                    let iconBg = 'bg-slate-800';
                                    let iconBorder = 'border-slate-600';

                                    if (activity.type === 'PushEvent') {
                                        iconColor = 'text-green-400';
                                        iconBg = 'bg-green-500/10';
                                        iconBorder = 'border-green-500/30';
                                    } else if (activity.type === 'PullRequestEvent') {
                                        iconColor = 'text-purple-400';
                                        iconBg = 'bg-purple-500/10';
                                        iconBorder = 'border-purple-500/30';
                                    } else if (activity.type === 'CreateEvent') {
                                        iconColor = 'text-blue-400';
                                        iconBg = 'bg-blue-500/10';
                                        iconBorder = 'border-blue-500/30';
                                    } else if (activity.type === 'IssuesEvent') {
                                        iconColor = 'text-amber-400';
                                        iconBg = 'bg-amber-500/10';
                                        iconBorder = 'border-amber-500/30';
                                    }

                                    return (
                                        <div key={idx} className="relative pl-10 md:pl-12 group">
                                            {/* Timeline Node */}
                                            <div
                                                className={`absolute top-1 w-8 h-8 rounded-full border-2 ${iconBg} ${iconBorder} flex items-center justify-center ${iconColor} z-10 shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}
                                                style={{ left: '-17px' }}
                                            >
                                                {getActivityIcon(activity.type)}
                                            </div>

                                            {/* Content Card */}
                                            <div className="bg-slate-800/20 hover:bg-slate-800/40 border border-white/5 hover:border-white/10 p-4 rounded-xl transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                                    <p className="font-medium text-slate-200">
                                                        {getActivityText(activity)}
                                                    </p>
                                                    <span className="shrink-0 text-xs font-mono text-[var(--text-secondary)] bg-black/20 px-2 py-1 rounded">
                                                        {new Date(activity.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-secondary)]">
                                                    <div className="flex items-center gap-1.5">
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        <span className="font-mono text-xs">{activity.repo}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                </div>
                                {recentActivity.length > 2 && (
                                    <div className="flex justify-center mt-6 border-t border-slate-700/30 pt-4">
                                        <button 
                                            onClick={() => setShowAllActivities(!showAllActivities)}
                                            className="text-sm font-mono text-[var(--accent-cyan)] hover:text-cyan-300 transition-colors flex items-center gap-2 bg-cyan-500/5 hover:bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20 shadow-lg shadow-cyan-500/10"
                                        >
                                            {showAllActivities ? 'Show Less' : `Show More (${recentActivity.length - 2} more)`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                )}

                {/* Recently Updated Repositories */}
                {sections?.showRepositories && topRepos?.length > 0 && (
                    <motion.div className="mb-8" variants={itemVariants}>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="text-[var(--primary)]" />
                            Recently Updated Repositories
                        </h2>
                        <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 md:pb-0 snap-x snap-mandatory scrollbar-hide">
                            {topRepos.map((repo, index) => {
                                const isPrivate = repo.isPrivate;
                                const Wrapper = isPrivate ? 'div' : 'a';
                                const wrapperProps = isPrivate ? {} : {
                                    href: repo.url,
                                    target: "_blank",
                                    rel: "noopener noreferrer"
                                };

                                return (
                                    <Wrapper
                                        key={index}
                                        {...wrapperProps}
                                        className={`snap-center shrink-0 w-[85%] sm:w-[320px] md:w-auto bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)] transition-colors ${isPrivate ? 'opacity-80 cursor-default' : 'hover:border-[var(--primary)] group cursor-pointer'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                <h3 className={`font-bold text-lg transition-colors truncate ${isPrivate ? '' : 'group-hover:text-[var(--primary)]'
                                                    }`}>
                                                    {repo.name}
                                                </h3>
                                                {repo.isPrivate && (
                                                    <span className="shrink-0 flex items-center gap-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wide">
                                                        <Lock className="w-2.5 h-2.5" />
                                                        Private
                                                    </span>
                                                )}
                                            </div>
                                            <Github className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2 min-h-[40px]">
                                            {repo.description || 'No description provided'}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                                            {repo.language && (
                                                <div className="flex items-center gap-1">
                                                    <span
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: languageColors[repo.language] || '#gray' }}
                                                    />
                                                    {repo.language}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4" />
                                                {repo.stars}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <GitFork className="w-4 h-4" />
                                                {repo.forks}
                                            </div>
                                        </div>
                                    </Wrapper>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Repository Distribution */}
                {sections?.showRepoDistribution && stats && (
                    <motion.div className="mb-12" variants={itemVariants}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <BarChart2 className="text-[var(--primary)]" />
                            Repository Landscape
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Privacy Distribution */}
                            <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)]">
                                <h3 className="text-sm font-mono text-slate-400 mb-4 uppercase tracking-wider">Visibility</h3>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Unlock className="w-4 h-4 text-green-400" />
                                            <span>Public</span>
                                        </div>
                                        <span className="font-mono bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-sm">
                                            {stats.totalRepos - (stats.privateRepos || 0)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-amber-500" />
                                            <span>Private</span>
                                        </div>
                                        <span className="font-mono bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-sm">
                                            {stats.privateRepos || 0}
                                        </span>
                                    </div>
                                    {/* Visual Bar */}
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2 flex">
                                        <div
                                            className="h-full bg-green-500"
                                            style={{ width: `${((stats.totalRepos - (stats.privateRepos || 0)) / stats.totalRepos) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-amber-500"
                                            style={{ width: `${((stats.privateRepos || 0) / stats.totalRepos) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Source vs Fork */}
                            <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)]">
                                <h3 className="text-sm font-mono text-slate-400 mb-4 uppercase tracking-wider">Type</h3>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-blue-400" />
                                            <span>Sources</span>
                                        </div>
                                        <span className="font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-sm">
                                            {stats.sourceRepos || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <GitFork className="w-4 h-4 text-purple-400" />
                                            <span>Forks</span>
                                        </div>
                                        <span className="font-mono bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-sm">
                                            {stats.forkedRepos || 0}
                                        </span>
                                    </div>
                                    {/* Visual Bar */}
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2 flex">
                                        <div
                                            className="h-full bg-blue-500"
                                            style={{ width: `${((stats.sourceRepos || 0) / ((stats.sourceRepos || 0) + (stats.forkedRepos || 0) || 1)) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-purple-500"
                                            style={{ width: `${((stats.forkedRepos || 0) / ((stats.sourceRepos || 0) + (stats.forkedRepos || 0) || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                 )}

                {/* Activity Radar Chart */}
                {sections?.showRadarChart && activityDistribution && (
                    <motion.div className="mb-12" variants={itemVariants}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Activity className="text-[var(--primary)]" />
                            Activity Distribution
                        </h2>
                        <div className="bg-[var(--surface-card)] rounded-xl p-6 md:p-8 border border-[var(--border-secondary)] min-h-[400px] flex items-center justify-center relative">
                            {/* Premium dynamic SVG Radar Implementation */}
                            <div className="w-full max-w-[320px] aspect-square flex items-center justify-center mx-auto">
                                <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                                    <defs>
                                        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0" />
                                        </radialGradient>
                                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="var(--accent-cyan)" />
                                            <stop offset="100%" stopColor="var(--accent-purple)" />
                                        </linearGradient>
                                    </defs>

                                    {/* Concentric grid diamonds */}
                                    {[0.25, 0.5, 0.75, 1].map((f, i) => (
                                        <polygon
                                            key={i}
                                            points={`200,${200 - f * 130} ${200 + f * 130},200 200,${200 + f * 130} ${200 - f * 130},200`}
                                            fill="none"
                                            stroke="rgba(255,255,255,0.06)"
                                            strokeWidth="1"
                                            strokeDasharray={i === 3 ? "0" : "3,3"}
                                        />
                                    ))}

                                    {/* Cross Axes background lines */}
                                    <line x1="200" y1="70" x2="200" y2="330" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                                    <line x1="70" y1="200" x2="330" y2="200" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />

                                    {/* Center ambient Glow */}
                                    <circle cx="200" cy="200" r="90" fill="url(#radarGlow)" className="opacity-40 animate-pulse" />

                                    {/* Data Polygon */}
                                    <motion.polygon
                                        points={`
                                            ${200 - (activityDistribution.commits / 100) * 130},200 
                                            200,${200 - (activityDistribution.codeReview / 100) * 130} 
                                            ${200 + (activityDistribution.issues / 100) * 130},200 
                                            200,${200 + (activityDistribution.pullRequests / 100) * 130}
                                        `}
                                        fill="var(--accent-cyan)"
                                        fillOpacity="0.1"
                                        stroke="url(#lineGrad)"
                                        strokeWidth="3.5"
                                        strokeLinejoin="round"
                                        initial={{ opacity: 0, scale: 0.1, transformOrigin: 'center' }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, ease: "easeOut", type: "spring", bounce: 0.3 }}
                                    />

                                    {/* Handle dots with glow */}
                                    {/* Commits (Left) */}
                                    <circle cx={200 - (activityDistribution.commits / 100) * 130} cy="200" r="5" fill="var(--surface-card)" stroke="var(--accent-cyan)" strokeWidth="2.5" />
                                    {/* Code Review (Top) */}
                                    <circle cx="200" cy={200 - (activityDistribution.codeReview / 100) * 130} r="5" fill="var(--surface-card)" stroke="var(--accent-purple)" strokeWidth="2.5" />
                                    {/* Issues (Right) */}
                                    <circle cx={200 + (activityDistribution.issues / 100) * 130} cy="200" r="5" fill="var(--surface-card)" stroke="var(--accent-cyan)" strokeWidth="2.5" />
                                    {/* Pull Requests (Bottom) */}
                                    <circle cx="200" cy={200 + (activityDistribution.pullRequests / 100) * 130} r="5" fill="var(--surface-card)" stroke="var(--accent-purple)" strokeWidth="2.5" />

                                    {/* SVG Labels */}
                                    {/* Top - Code Review */}
                                    <text x="200" y="25" textAnchor="middle" fill="var(--accent-cyan)" className="font-mono font-bold text-base">{activityDistribution.codeReview}%</text>
                                    <text x="200" y="42" textAnchor="middle" fill="var(--text-secondary)" className="text-[10px] sm:text-xs font-bold tracking-wider uppercase">Code Review</text>

                                    {/* Bottom - PRs */}
                                    <text x="200" y="372" textAnchor="middle" fill="var(--accent-cyan)" className="font-mono font-bold text-base">{activityDistribution.pullRequests}%</text>
                                    <text x="200" y="388" textAnchor="middle" fill="var(--text-secondary)" className="text-[10px] sm:text-xs font-bold tracking-wider uppercase">Pull Requests</text>

                                    {/* Left - Commits */}
                                    <text x="45" y="195" textAnchor="end" fill="var(--accent-cyan)" className="font-mono font-bold text-base">{activityDistribution.commits}%</text>
                                    <text x="45" y="211" textAnchor="end" fill="var(--text-secondary)" className="text-[10px] sm:text-xs font-bold tracking-wider uppercase">Commits</text>

                                    {/* Right - Issues */}
                                    <text x="355" y="195" textAnchor="start" fill="var(--accent-cyan)" className="font-mono font-bold text-base">{activityDistribution.issues}%</text>
                                    <text x="355" y="211" textAnchor="start" fill="var(--text-secondary)" className="text-[10px] sm:text-xs font-bold tracking-wider uppercase">Issues</text>
                                </svg>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Language Statistics */}
                {sections?.showLanguages && languages?.length > 0 && (
                    <motion.div variants={itemVariants}>
                        <h2 className="text-2xl font-bold mb-4">Most Used Languages</h2>
                        <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)]">
                            <div className="space-y-4">
                                {languages.map((lang, index) => (
                                    <div key={index}>
                                        <div className="flex justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: languageColors[lang.name] || '#gray' }}
                                                />
                                                <span className="font-medium">{lang.name}</span>
                                            </div>
                                            <span className="text-[var(--text-secondary)]">
                                                {lang.percentage}% ({lang.count} repos)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${lang.percentage}%`,
                                                    backgroundColor: languageColors[lang.name] || '#gray'
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div >
    );
}
