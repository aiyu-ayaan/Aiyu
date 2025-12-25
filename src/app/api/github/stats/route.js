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

        // Check cache
        const now = Date.now();
        if (cache && cacheTime && (now - cacheTime) < CACHE_DURATION) {
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
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        // Fetch user data
        const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
        if (!userRes.ok) {
            throw new Error('Failed to fetch user data');
        }
        const userData = await userRes.json();

        // Fetch repos
        const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, { headers });
        if (!reposRes.ok) {
            throw new Error('Failed to fetch repositories');
        }
        const repos = await reposRes.json();

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
        const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
        const totalForks = repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);

        // Get top 6 repos
        const topRepos = repos
            .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
            .slice(0, 6)
            .map(repo => ({
                name: repo.name,
                description: repo.description,
                stars: repo.stargazers_count || 0,
                forks: repo.forks_count || 0,
                language: repo.language,
                url: repo.html_url,
                topics: repo.topics || []
            }));

        // Calculate language stats
        const languageStats = {};
        repos.forEach(repo => {
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
        const recentActivity = events.slice(0, 10).map(event => ({
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
                totalRepos: repos.length,
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
            languages
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
