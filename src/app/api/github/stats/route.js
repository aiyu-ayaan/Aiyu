import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GitHub from '@/models/GitHub';
import Config from '@/models/Config';
import { decrypt } from '@/lib/encryption';
import cache, { CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { createTrafficHeaders, getClientIdentifier, reserveRequestSlot } from '@/lib/trafficControl';
import { fetchWithTimeout, getCircuitBreakerSnapshot, runWithCircuitBreaker } from '@/lib/upstreamControl';

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
    const {
        timeoutMs = GITHUB_UPSTREAM_TIMEOUT_MS,
        breakerName = GITHUB_UPSTREAM_BREAKER_NAME,
        trace = null,
        traceLabel = 'github',
        ...fetchOptions
    } = options;

    const startedAt = Date.now();
    const executeRequest = async (requestHeaders) => fetchWithTimeout(
        url,
        { ...fetchOptions, headers: requestHeaders },
        timeoutMs
    );

    let response = await runWithCircuitBreaker(
        breakerName,
        () => executeRequest(headers),
        GITHUB_UPSTREAM_BREAKER_OPTIONS
    );

    if (trace) {
        trace[traceLabel] = Date.now() - startedAt;
    }

    if (response.status === 401 && headers.Authorization) {
        console.warn('[WARN] GITHUB_TOKEN is invalid. Retrying without token...');
        const fallbackHeaders = { ...headers };
        delete fallbackHeaders.Authorization;

        response = await runWithCircuitBreaker(
            breakerName,
            () => executeRequest(fallbackHeaders),
            GITHUB_UPSTREAM_BREAKER_OPTIONS
        );
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
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
    }

    return response.json();
}

async function fetchUserData(username, headers, trace) {
    try {
        return await fetchGitHubJson(
            `https://api.github.com/users/${username}`,
            headers,
            { trace, traceLabel: 'github-user' }
        );
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
}

async function fetchRepositories(username, includePrivate, headers, token, trace) {
    if (includePrivate && token) {
        try {
            const identity = await fetchGitHubJson(
                'https://api.github.com/user',
                headers,
                { trace, traceLabel: 'github-identity' }
            );

            if (identity.login.toLowerCase() === username.toLowerCase()) {
                return await fetchGitHubJson(
                    'https://api.github.com/user/repos?sort=updated&per_page=100&type=all',
                    headers,
                    { trace, traceLabel: 'github-repos-private' }
                );
            }
        } catch (error) {
            console.error('[WARN] Failed to verify token identity for private repos:', error);
        }
    }

    try {
        return await fetchGitHubJson(
            `https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=public`,
            headers,
            { trace, traceLabel: 'github-repos-public' }
        );
    } catch {
        throw new Error('Failed to fetch repositories');
    }
}

async function fetchPublicEvents(username, headers, trace) {
    try {
        return await fetchGitHubJson(
            `https://api.github.com/users/${username}/events/public?per_page=100`,
            headers,
            { trace, traceLabel: 'github-events' }
        );
    } catch (error) {
        console.error('[WARN] Failed to fetch GitHub public events:', error);
        return [];
    }
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

function getPushCommitCount(payload = {}) {
    if (Array.isArray(payload.commits)) {
        return payload.commits.length;
    }

    const numericCommitCount = Number(payload.commits ?? payload.size ?? payload.distinct_size);
    return Number.isFinite(numericCommitCount) && numericCommitCount >= 0
        ? numericCommitCount
        : null;
}

async function fetchPushCommitCount(repoName, payload = {}, headers, trace, index) {
    const knownCommitCount = getPushCommitCount(payload);
    if (knownCommitCount !== null) {
        return knownCommitCount;
    }

    const before = typeof payload.before === 'string' ? payload.before.trim() : '';
    const head = typeof payload.head === 'string' ? payload.head.trim() : '';
    if (!repoName || !before || !head || before === head) {
        return null;
    }

    try {
        const comparison = await fetchGitHubJson(
            `https://api.github.com/repos/${repoName}/compare/${before}...${head}`,
            headers,
            { trace, traceLabel: `github-compare-${index}` }
        );
        const totalCommits = Number(comparison?.total_commits);
        return Number.isFinite(totalCommits) && totalCommits >= 0 ? totalCommits : null;
    } catch (error) {
        console.error(`[WARN] Failed to compare push range for ${repoName}:`, error);
        return null;
    }
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
            distributionCounts.commits += getPushCommitCount(event.payload) || 1;
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

async function buildRecentActivity(events, hiddenRepos, headers, trace) {
    const visibleEvents = events
        .filter(event => {
            const repoName = event.repo.name.split('/').pop();
            return !hiddenRepos.includes(repoName);
        })
        .slice(0, 10);

    return Promise.all(visibleEvents.map(async (event, index) => {
        const commitCount = event.type === 'PushEvent'
            ? await fetchPushCommitCount(event.repo.name, event.payload, headers, trace, index)
            : null;

        return {
            type: event.type,
            repo: event.repo.name,
            created_at: event.created_at,
            payload: {
                action: event.payload.action,
                ref: event.payload.ref,
                commits: commitCount,
                commitsKnown: commitCount !== null,
                distinctCommits: Number(event.payload.distinct_size) || 0,
            }
        };
    }));
}

async function fetchContributions(username, headers, fallbackEventsPromise, trace) {
    try {
        const startedAt = Date.now();
        const graphqlRes = await runWithCircuitBreaker(
            GITHUB_UPSTREAM_BREAKER_NAME,
            () => fetchWithTimeout(
                'https://api.github.com/graphql',
                {
                    method: 'POST',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: GITHUB_CONTRIBUTIONS_QUERY,
                        variables: { userName: username }
                    })
                },
                GITHUB_UPSTREAM_TIMEOUT_MS
            ),
            GITHUB_UPSTREAM_BREAKER_OPTIONS
        );

        if (trace) {
            trace['github-graphql'] = Date.now() - startedAt;
        }

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

    const fallbackEvents = await fallbackEventsPromise;
    return buildContributionSeriesFromEvents(fallbackEvents);
}

const GITHUB_STATS_ROUTE_WINDOW_MS = Number.parseInt(process.env.GITHUB_STATS_WINDOW_MS || '60000', 10);
const GITHUB_STATS_ROUTE_MAX_REQUESTS = Number.parseInt(process.env.GITHUB_STATS_RATE_LIMIT || '240', 10);
const GITHUB_STATS_ROUTE_MAX_CONCURRENT = Number.parseInt(process.env.GITHUB_STATS_MAX_CONCURRENT || '100', 10);
const GITHUB_STATS_CACHE_TTL = Number.parseInt(process.env.GITHUB_STATS_CACHE_TTL_MS || '60000', 10);
const GITHUB_STATS_STALE_TTL = Number.parseInt(process.env.GITHUB_STATS_STALE_TTL_MS || String(CACHE_TTL.VERY_LONG), 10);
const GITHUB_UPSTREAM_TIMEOUT_MS = Number.parseInt(process.env.GITHUB_UPSTREAM_TIMEOUT_MS || '2500', 10);
const GITHUB_UPSTREAM_BREAKER_NAME = 'github-upstream';
const GITHUB_UPSTREAM_BREAKER_OPTIONS = {
    failureThreshold: Number.parseInt(process.env.GITHUB_UPSTREAM_BREAKER_THRESHOLD || '5', 10),
    resetTimeoutMs: Number.parseInt(process.env.GITHUB_UPSTREAM_BREAKER_RESET_MS || '30000', 10),
};

function createServerTimingHeader(trace = {}) {
    return Object.entries(trace)
        .filter(([, duration]) => Number.isFinite(duration))
        .map(([label, duration]) => `${label};dur=${duration}`)
        .join(', ');
}

export async function GET(request) {
    const startedAt = Date.now();
    let trafficReservation = null;

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
        const staleCacheKey = `${cacheKey}:stale`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return NextResponse.json(
                { success: true, data: cachedData },
                {
                    headers: {
                        ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                        ...createCacheDebugHeaders({ key: cacheKey, source: 'memory-precheck' }),
                        'x-github-cache-mode': 'hot',
                        'x-response-time-ms': String(Date.now() - startedAt),
                    },
                }
            );
        }

        trafficReservation = reserveRequestSlot(
            'public:github-stats',
            getClientIdentifier(request),
            {
                maxRequests: GITHUB_STATS_ROUTE_MAX_REQUESTS,
                windowMs: GITHUB_STATS_ROUTE_WINDOW_MS,
                maxConcurrent: GITHUB_STATS_ROUTE_MAX_CONCURRENT,
            }
        );

        if (!trafficReservation.ok) {
            const staleData = cache.get(staleCacheKey);
            if (staleData) {
                return NextResponse.json(
                    { success: true, data: staleData },
                    {
                        headers: {
                            ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_SHORT),
                            ...createCacheDebugHeaders({ key: staleCacheKey, source: 'stale-overload' }),
                            ...createTrafficHeaders(trafficReservation, { windowMs: GITHUB_STATS_ROUTE_WINDOW_MS }),
                            'x-github-cache-mode': 'stale-overload',
                            'x-response-time-ms': String(Date.now() - startedAt),
                        },
                    }
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    error: trafficReservation.status === 429
                        ? 'Rate limit exceeded for GitHub stats. Please retry shortly.'
                        : 'GitHub stats is temporarily overloaded. Please retry shortly.',
                },
                {
                    status: trafficReservation.status,
                    headers: {
                        ...createTrafficHeaders(trafficReservation, { windowMs: GITHUB_STATS_ROUTE_WINDOW_MS }),
                        'Cache-Control': RESPONSE_CACHE.NO_STORE,
                        'x-response-time-ms': String(Date.now() - startedAt),
                    },
                }
            );
        }

        let data;
        let meta;
        const requestTrace = {};

        try {
            const result = await cache.getOrSetWithMeta(
                cacheKey,
                async () => {
                const configDoc = await Config.findOne().select('+encryptedGithubToken').lean();
                const dbToken = configDoc?.encryptedGithubToken ? decrypt(configDoc.encryptedGithubToken) : null;
                const envToken = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.trim() : null;
                const token = dbToken || envToken;
                const headers = createGitHubHeaders(token);

                const eventsPromise = fetchPublicEvents(username, headers, requestTrace);
                const contributionsPromise = fetchContributions(username, headers, eventsPromise, requestTrace);
                const userPromise = fetchUserData(username, headers, requestTrace);
                const reposPromise = fetchRepositories(username, config.includePrivate, headers, token, requestTrace);

                const [
                    events,
                    { contributions, totalContributions },
                    userData,
                    repos
                ] = await Promise.all([
                    eventsPromise,
                    contributionsPromise,
                    userPromise,
                    reposPromise
                ]);

                const hiddenRepos = config.hiddenRepos || [];
                const filteredRepos = repos.filter(repo => {
                    if (!config.includePrivate && repo.private) return false;
                    return !hiddenRepos.includes(repo.name);
                });
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

                const recentActivity = await buildRecentActivity(events, hiddenRepos, headers, requestTrace);

                const payload = {
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
                cache.set(staleCacheKey, payload, GITHUB_STATS_STALE_TTL);
                return payload;
            },
                GITHUB_STATS_CACHE_TTL
            );
            data = result.value;
            meta = result.meta;
        } catch (error) {
            const staleData = cache.get(staleCacheKey);
            if (!staleData) {
                throw error;
            }

            data = staleData;
            meta = { key: staleCacheKey, source: 'stale-error' };
        }

        const breakerState = getCircuitBreakerSnapshot(GITHUB_UPSTREAM_BREAKER_NAME);

        return NextResponse.json(
            { success: true, data },
            {
                headers: {
                    ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                    ...createCacheDebugHeaders(meta),
                    ...(trafficReservation ? {
                        'x-rate-limit-remaining': String(trafficReservation.remaining),
                        'x-route-active-requests': String(trafficReservation.activeRequests),
                    } : {}),
                    'x-github-cache-mode': meta?.source || 'unknown',
                    'x-github-breaker-state': breakerState.state,
                    'Server-Timing': createServerTimingHeader(requestTrace),
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
                ...(trafficReservation ? createTrafficHeaders(trafficReservation, { windowMs: GITHUB_STATS_ROUTE_WINDOW_MS }) : {}),
                'x-response-time-ms': String(Date.now() - startedAt),
            },
        });
    } finally {
        trafficReservation?.release?.();
    }
}

export const dynamic = 'force-dynamic';
