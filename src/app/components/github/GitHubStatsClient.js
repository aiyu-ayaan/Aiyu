'use client';

import { Github, Star, GitFork, Users, BookOpen, MapPin, Link as LinkIcon, Calendar, Flame, TrendingUp, GitCommit, GitPullRequest, GitMerge } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

import { useTheme } from '../../context/ThemeContext';

export default function GitHubStatsClient({ data }) {
    const { theme } = useTheme();
    const [selectedRepo, setSelectedRepo] = useState(null);

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

    const { profile, stats, topRepos, languages, contributions, streaks, recentActivity, sections } = data.data;

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

                {/* Recent Activity */}
                {sections?.showActivity && recentActivity?.length > 0 && (
                    <motion.div className="mb-8" variants={itemVariants}>
                        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
                        <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)]">
                            <div className="space-y-4">
                                {recentActivity.map((activity, idx) => (
                                    <div key={idx} className="flex items-start gap-3 pb-4 border-b border-gray-700 last:border-0 last:pb-0">
                                        <div className="text-[var(--text-secondary)] mt-1">
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm">{getActivityText(activity)}</p>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                                                {new Date(activity.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {topRepos.map((repo, index) => (
                                <a
                                    key={index}
                                    href={repo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)] hover:border-[var(--primary)] transition-colors group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-lg group-hover:text-[var(--primary)] transition-colors truncate">
                                            {repo.name}
                                        </h3>
                                        <Github className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0 ml-2" />
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
                                </a>
                            ))}
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
