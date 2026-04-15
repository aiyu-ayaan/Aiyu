import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GitHub from '@/models/GitHub';
import Config from '@/models/Config';
import { decrypt } from '@/lib/encryption';
import cache, { CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

const GITHUB_API_HEADERS = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Portfolio-App'
};

const GITHUB_CONTRIBUTIONS_QUERY = `
    query($userName:String!) {
        user(login: $userName) {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            contributionCount
                            date
                        }
                    }
                }
            }
        }
    }
`;

function createGitHubHeaders(token) {
    if (!token) {
        return { ...GITHUB_API_HEADERS };
    }

    return {
        ...GITHUB_API_HEADERS,
        'Authorization': `token ${token}`
    };
}

async function fetchGitHub(url, headers, options = {}) {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && headers.Authorization) {
        console.warn('[WARN] GITHUB_TOKEN is invalid. Retrying without token...');
        const fallbackHeaders = { ...headers };
        delete fallbackHeaders.Authorization;

        return fetch(url, { ...options, headers: fallbackHeaders });
    }

    return response;
}

async function fetchGitHubJson(url, headers, options = {}) {
    const response = await fetchGitHub(url, headers, options);

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`GitHub request failed (${response.status})`);
        error.status = response.status;
        error.body = errorText;
        throw error;
    }

    return response.json();
}

function buildContributionSeriesFromEvents(events) {
    const contributionMap = {};
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        contributionMap[dateStr] = 0;
    }

    events.forEach(event => {
        const eventDate = new Date(event.created_at).toISOString().split('T')[0];
        if (contributionMap[eventDate] !== undefined) {
            contributionMap[eventDate]++;
        }
    });

    const contributions = Object.entries(contributionMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
        contributions,
        totalContributions: contributions.reduce((sum, contribution) => sum + contribution.count, 0)
    };
}

function buildActivityDistribution(events) {
    const distributionCounts = {
        commits: 0,
        issues: 0,
        pullRequests: 0,
        codeReview: 0
    };

    events.forEach(event => {
        if (event.type === 'PushEvent') {
            distributionCounts.commits += event.payload.commits?.length || 1;
        } else if (event.type === 'IssuesEvent' || event.type === 'IssueCommentEvent') {
            distributionCounts.issues += 1;
        } else if (event.type === 'PullRequestEvent') {
            distributionCounts.pullRequests += 1;
        } else if (event.type === 'PullRequestReviewEvent' || event.type === 'PullRequestReviewCommentEvent') {
            distributionCounts.codeReview += 1;
        }
    });

    const totalDist = Object.values(distributionCounts).reduce((a, b) => a + b, 0);
    if (totalDist === 0) {
        return { commits: 0, issues: 0, pullRequests: 0, codeReview: 0 };
    }

    return {
        commits: Math.round((distributionCounts.commits / totalDist) * 100),
        issues: Math.round((distributionCounts.issues / totalDist) * 100),
        pullRequests: Math.round((distributionCounts.pullRequests / totalDist) * 100),
        codeReview: Math.round((distributionCounts.codeReview / totalDist) * 100)
    };
}

function buildRecentActivity(events, hiddenRepos) {
    return events
        .filter(event => {
            const repoName = event.repo.name.split('/').pop();
            return !hiddenRepos.includes(repoName);
        })
        .slice(0, 10)
        .map(event => ({
            type: event.type,
            repo: event.repo.name,
            created_at: event.created_at,
            payload: {
                action: event.payload.action,
                ref: event.payload.ref,
                commits: event.payload.commits?.length || 0
            }
        }));
}

async function fetchContributions(username, headers, fallbackEvents) {
    try {
        const graphqlRes = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: GITHUB_CONTRIBUTIONS_QUERY,
                variables: { userName: username }
            })
        });

        if (graphqlRes.ok) {
            const graphqlData = await graphqlRes.json();
            const calendar = graphqlData.data?.user?.contributionsCollection?.contributionCalendar;

            if (calendar) {
                return {
                    contributions: calendar.weeks
                        .flatMap(week => week.contributionDays)
                        .map(day => ({
                            date: day.date,
                            count: day.contributionCount
                        })),
                    totalContributions: calendar.totalContributions
                };
            }
        }
    } catch (error) {
        console.error('[WARN] GraphQL fetch failed, falling back to events API:', error);
    }

    return buildContributionSeriesFromEvents(fallbackEvents);
}

export async function GET() {
    const startedAt = Date.now();
    try {
        await dbConnect();

        // Get GitHub config
        const config = await GitHub.findOne().lean();

        if (!config || !config.username) {
            return NextResponse.json({
                success: false,
                error: 'GitHub username not configured'
            }, { status: 404 });
        }

        const username = config.username;

        const cacheKey = `github:stats:${username}:${config.includePrivate ? 'priv' : 'pub'}`;

        const { value: data, meta } = await cache.getOrSetWithMeta(
            cacheKey,
            async () => {
                const configDoc = await Config.findOne().select('+encryptedGithubToken').lean();
                const dbToken = configDoc?.encryptedGithubToken ? decrypt(configDoc.encryptedGithubToken) : null;
                const envToken = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.trim() : null;
                const token = dbToken || envToken;
                const headers = createGitHubHeaders(token);

                let userData;
                try {
                    userData = await fetchGitHubJson(`https://api.github.com/users/${username}`, headers);
                } catch (error) {
                    console.error(`[GitHub API Error] Status: ${error.status ?? 'unknown'}, Body: ${error.body ?? 'n/a'}`);

                    if (error.status === 403) {
                        if (error.body?.includes('API rate limit exceeded')) {
                            throw new Error('GitHub API rate limit exceeded. Please add a valid GITHUB_TOKEN.');
                        }
                        throw new Error('GitHub API access forbidden.');
                    }
                    if (error.status === 404) {
                        throw new Error(`GitHub user '${username}' not found.`);
                    }

                    throw new Error(`Failed to fetch user data (${error.status ?? 'unknown'})`);
                }

                let repos = [];
                let fetchedWithPrivate = false;

                if (config.includePrivate && token) {
                    try {
                        const identity = await fetchGitHubJson('https://api.github.com/user', headers);

                        if (identity.login.toLowerCase() === username.toLowerCase()) {
                            repos = await fetchGitHubJson('https://api.github.com/user/repos?sort=updated&per_page=100&type=all', headers);
                            fetchedWithPrivate = true;
                        }
                    } catch (e) {
                        console.error('[WARN] Failed to verify token identity for private repos:', e);
                    }
                }

                if (!fetchedWithPrivate) {
                    try {
                        repos = await fetchGitHubJson(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=public`, headers);
                    } catch {
                        throw new Error('Failed to fetch repositories');
                    }
                }

                const hiddenRepos = config.hiddenRepos || [];
                const filteredRepos = repos.filter(repo => {
                    if (!config.includePrivate && repo.private) return false;
                    return !hiddenRepos.includes(repo.name);
                });

                let events = [];
                try {
                    events = await fetchGitHubJson(`https://api.github.com/users/${username}/events/public?per_page=100`, headers);
                } catch (error) {
                    console.error('[WARN] Failed to fetch GitHub public events:', error);
                }

                const {
                    contributions,
                    totalContributions
                } = await fetchContributions(username, headers, events);
                const activityDistribution = buildActivityDistribution(events);

                const totalStars = filteredRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
                const totalForks = filteredRepos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
                const sourceRepos = filteredRepos.filter(repo => !repo.fork && !repo.private).length;
                const forkedRepos = filteredRepos.filter(repo => repo.fork).length;
                const privateRepos = filteredRepos.filter(repo => repo.private).length;

                const topRepos = filteredRepos
                    .slice(0, 6)
                    .map(repo => ({
                        name: repo.name,
                        description: repo.description,
                        stars: repo.stargazers_count || 0,
                        forks: repo.forks_count || 0,
                        language: repo.language,
                        url: repo.html_url,
                        topics: repo.topics || [],
                        updated_at: repo.updated_at,
                        isPrivate: repo.private
                    }));

                const languageStats = {};
                filteredRepos.forEach(repo => {
                    if (repo.language) {
                        languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
                    }
                });

                const totalReposWithLanguage = Object.values(languageStats).reduce((a, b) => a + b, 0);
                const languages = Object.entries(languageStats)
                    .map(([name, count]) => ({
                        name,
                        count,
                        percentage: Math.round((count / totalReposWithLanguage) * 100)
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                let currentStreak = 0;
                let longestStreak = 0;
                let tempStreak = 0;

                const contributionMapForStreak = {};
                contributions.forEach(c => {
                    contributionMapForStreak[c.date] = c.count;
                });

                const sortedDates = Object.keys(contributionMapForStreak).sort().reverse();
                let streakBroken = false;

                for (const date of sortedDates) {
                    const count = contributionMapForStreak[date];
                    const daysDiff = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));

                    if (count > 0) {
                        if (!streakBroken && daysDiff <= 1) {
                            currentStreak++;
                        }
                        tempStreak++;
                        longestStreak = Math.max(longestStreak, tempStreak);
                    } else {
                        if (daysDiff <= 1) {
                            streakBroken = true;
                        }
                        tempStreak = 0;
                    }
                }

                const recentActivity = buildRecentActivity(events, hiddenRepos);

                return {
                    profile: {
                        username: userData.login,
                        name: userData.name,
                        avatar: userData.avatar_url,
                        bio: userData.bio,
                        location: userData.location,
                        blog: userData.blog,
                        twitter: userData.twitter_username,
                        followers: userData.followers,
                        following: userData.following,
                        publicRepos: userData.public_repos,
                        createdAt: userData.created_at
                    },
                    stats: {
                        totalRepos: filteredRepos.length,
                        totalStars,
                        totalForks,
                        followers: userData.followers,
                        totalContributions,
                        sourceRepos,
                        forkedRepos,
                        privateRepos
                    },
                    streaks: {
                        current: currentStreak,
                        longest: longestStreak
                    },
                    contributions,
                    recentActivity,
                    topRepos,
                    languages,
                    sections: config.sections || {
                        showProfile: true,
                        showStats: true,
                        showContributions: true,
                        showActivity: true,
                        showRepositories: true,
                        showRepoDistribution: true,
                        showLanguages: true,
                        showLiveCommit: true,
                        showRadarChart: true
                    },
                    activityDistribution
                };
            },
            CACHE_TTL.VERY_LONG
        );

        return NextResponse.json(
            { success: true, data },
            {
                headers: {
                    ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                    ...createCacheDebugHeaders(meta),
                    'x-response-time-ms': String(Date.now() - startedAt),
                },
            }
        );

    } catch (error) {
        console.error('[ERROR] Failed to fetch GitHub stats:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch GitHub stats'
        }, {
            status: 500,
            headers: {
                'x-response-time-ms': String(Date.now() - startedAt),
            },
        });
    }
}

export const dynamic = 'force-dynamic';
