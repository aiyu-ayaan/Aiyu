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
        const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=100`, { headers });
        if (!reposRes.ok) {
            throw new Error('Failed to fetch repositories');
        }
        const repos = await reposRes.json();

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
                followers: userData.followers
            },
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
