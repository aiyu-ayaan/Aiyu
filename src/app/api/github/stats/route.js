import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GitHub from '@/models/GitHub';

// Cache for 5 minutes
let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    try {
        await dbConnect();

        // Get GitHub config
        const config = await GitHub.findOne().lean();

        if (!config || !config.enabled || !config.username) {
            return NextResponse.json({
                success: false,
                error: 'GitHub stats not configured'
            }, { status: 404 });
        }

        const username = config.username;

        // Check cache (invalidate if config updated after cache was set)
        const now = Date.now();
        const configUpdated = new Date(config.updatedAt).getTime();
        const isCacheValid = cache && cacheTime && (now - cacheTime) < CACHE_DURATION;
        const isConfigNewer = configUpdated > cacheTime;

        if (isCacheValid && !isConfigNewer) {
            return NextResponse.json({
                success: true,
                data: cache,
                cached: true
            });
        }

        // Prepare headers
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Portfolio-App'
        };

        // Add token if available
        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN.trim()}`;
        }

        // Fetch user data
        // Fetch user data
        let userRes = await fetch(`https://api.github.com/users/${username}`, { headers });

        // Retry without token if 401 (Bad Credentials)
        if (userRes.status === 401 && headers['Authorization']) {
            console.warn('[WARN] GITHUB_TOKEN is invalid. Retrying without token...');
            delete headers['Authorization']; // Remove invalid token for this and subsequent requests
            userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
        }

        if (!userRes.ok) {
            const errorText = await userRes.text();
            console.error(`[GitHub API Error] Status: ${userRes.status} ${userRes.statusText}, Body: ${errorText}`);

            if (userRes.status === 403) {
                if (userRes.headers.get('x-ratelimit-remaining') === '0') {
                    throw new Error('GitHub API rate limit exceeded. Please add a valid GITHUB_TOKEN.');
                }
                throw new Error('GitHub API access forbidden.');
            }
            if (userRes.status === 404) {
                throw new Error(`GitHub user '${username}' not found.`);
            }

            throw new Error(`Failed to fetch user data (${userRes.status})`);
        }
        const userData = await userRes.json();

        // Fetch repos
        // Logic: To get private repos, we must use the '/user/repos' endpoint authenticated with the token.
        // The '/users/:username/repos' endpoint ONLY returns public repos, regardless of the token.

        let repos = [];
        let fetchedWithPrivate = false;

        if (config.includePrivate && process.env.GITHUB_TOKEN) {
            // 1. Check if the token belongs to the configured user
            try {
                const identityRes = await fetch('https://api.github.com/user', { headers });
                if (identityRes.ok) {
                    const identity = await identityRes.json();

                    if (identity.login.toLowerCase() === username.toLowerCase()) {
                        // Token matches user! We can fetch private repos.
                        const privateRes = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=100&type=all`, { headers });
                        if (privateRes.ok) {
                            repos = await privateRes.json();
                            fetchedWithPrivate = true;
                        }
                    }
                }
            } catch (e) {
                console.error('[WARN] Failed to verify token identity for private repos:', e);
            }
        }

        // Fallback: If we couldn't fetch private repos (token mismatch or config disabled), fetch public only
        if (!fetchedWithPrivate) {
            let reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=public`, { headers });

            // Retry without token if 401
            if (reposRes.status === 401 && headers['Authorization']) {
                const noTokenHeaders = { ...headers };
                delete noTokenHeaders['Authorization'];
                reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=public`, { headers: noTokenHeaders });
            }

            if (!reposRes.ok) {
                throw new Error('Failed to fetch repositories');
            }
            repos = await reposRes.json();
        }

        // Filter hidden repos and correctly handle visibility
        const hiddenRepos = config.hiddenRepos || [];
        const filteredRepos = repos.filter(repo => {
            // If strictly public mode, enforce !private (API 'type=all' returns private too if token has scope)
            if (!config.includePrivate && repo.private) return false;
            return !hiddenRepos.includes(repo.name);
        });

        // Fetch contribution data using GraphQL API
        const graphqlQuery = `
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

        let contributions = [];
        let totalContributions = 0;

        try {
            const graphqlRes = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: graphqlQuery,
                    variables: { userName: username }
                })
            });

            if (graphqlRes.ok) {
                const graphqlData = await graphqlRes.json();
                const calendar = graphqlData.data?.user?.contributionsCollection?.contributionCalendar;

                if (calendar) {
                    totalContributions = calendar.totalContributions;
                    contributions = calendar.weeks
                        .flatMap(week => week.contributionDays)
                        .map(day => ({
                            date: day.date,
                            count: day.contributionCount
                        }));
                }
            }
        } catch (error) {
            console.error('[WARN] GraphQL fetch failed, falling back to events API:', error);
        }

        // Fallback to events API if GraphQL failed
        if (contributions.length === 0) {
            const eventsRes = await fetch(`https://api.github.com/users/${username}/events/public?per_page=90`, { headers });
            const events = eventsRes.ok ? await eventsRes.json() : [];

            // Process contribution data from events (limited to last 90 events)
            const contributionMap = {};
            const today = new Date();
            const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

            // Initialize contribution map for last 365 days
            for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                contributionMap[dateStr] = 0;
            }

            // Count contributions from events
            events.forEach(event => {
                const eventDate = new Date(event.created_at).toISOString().split('T')[0];
                if (contributionMap[eventDate] !== undefined) {
                    contributionMap[eventDate]++;
                }
            });

            contributions = Object.entries(contributionMap)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            totalContributions = contributions.reduce((sum, c) => sum + c.count, 0);
        }

        // Fetch recent events for activity feed
        const eventsRes = await fetch(`https://api.github.com/users/${username}/events/public?per_page=30`, { headers });
        const events = eventsRes.ok ? await eventsRes.json() : [];

        // Calculate stats
        const totalStars = filteredRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
        const totalForks = filteredRepos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);

        // Get top 6 recently updated repos
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

        // Calculate language stats
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

        // Calculate streak
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        // Build contribution map for streak calculation
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

        // Process recent activity
        const recentActivity = events
            .filter(event => {
                const repoName = event.repo.name.split('/').pop(); // Extract short name from 'user/repo'
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

        // Prepare response
        const data = {
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
                totalContributions
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
                showLanguages: true
            }
        };

        // Cache the result
        cache = data;
        cacheTime = now;

        return NextResponse.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('[ERROR] Failed to fetch GitHub stats:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch GitHub stats'
        }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
