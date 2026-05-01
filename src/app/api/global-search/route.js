import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Blog from '@/models/Blog';
import Project from '@/models/Project';
import Deployment from '@/models/Deployment';
import cache, { CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { getBlogSlug } from '@/lib/blogSlugs';
import { getDeploymentSlug, getProjectSlug } from '@/lib/contentSlugs';

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSearchCacheKey(query) {
    return `db:search:${String(query).trim().toLowerCase()}`;
}

const SEARCH_LIMITS = {
    BLOGS: 12,
    PROJECTS: 12,
    DEPLOYMENTS: 10,
    ABOUT: 1,
    HOME: 1,
};

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim();

        if (!query) {
            return NextResponse.json(
                { results: [] },
                { headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_SHORT) }
            );
        }

        const { value: results, meta } = await cache.getOrSetWithMeta(
            getSearchCacheKey(query),
            async () => {
                await dbConnect();
                const regex = new RegExp(escapeRegex(query), 'i');
                const nowIso = new Date().toISOString();

                const [blogs, projects, deployments, homeData, aboutData] = await Promise.all([
                    Blog.find({
                        $or: [
                            { title: regex },
                            { content: regex },
                            { tags: regex }
                        ],
                        published: { $ne: false }
                    }).sort({ createdAt: -1 }).limit(SEARCH_LIMITS.BLOGS).select('title content date slug _id').lean(),

                    Project.find({
                        $or: [
                            { name: regex },
                            { description: regex },
                            { techStack: regex }
                        ]
                    }).sort({ displayOrder: 1, year: -1 }).limit(SEARCH_LIMITS.PROJECTS).select('name slug description year _id').lean(),

                    Deployment.find({
                        $or: [
                            { name: regex },
                            { description: regex },
                            { techStack: regex },
                            { hostingProvider: regex },
                            { appType: regex },
                            { environment: regex },
                        ]
                    }).sort({ displayOrder: 1, updatedAt: -1 }).limit(SEARCH_LIMITS.DEPLOYMENTS).select('name slug description hostingProvider environment _id').lean(),

                    // Search Home (usually singleton, but using find in case of multiple or just 1)
                    import('@/models/Home').then(mod => mod.default.find({
                        $or: [
                            { name: regex },
                            { homeRoles: regex },
                            { codeSnippets: regex }
                        ]
                    }).limit(SEARCH_LIMITS.HOME).lean()),

                    // Search About (usually singleton)
                    import('@/models/About').then(mod => mod.default.find({
                        $or: [
                            { name: regex },
                            { professionalSummary: regex },
                            { "experiences.company": regex },
                            { "experiences.role": regex },
                            { "skills.name": regex }
                        ]
                    }).limit(SEARCH_LIMITS.ABOUT).lean())
                ]);

                const formattedBlogs = blogs.map(blog => ({
                    type: 'blog',
                    title: blog.title,
                    description: blog.content ? blog.content.substring(0, 100) + '...' : '',
                    path: `/blogs/${getBlogSlug(blog)}`,
                    date: blog.date
                }));

                const formattedProjects = projects.map(project => ({
                    type: 'project',
                    title: project.name,
                    description: project.description ? project.description.substring(0, 100) + '...' : '',
                    path: `/projects/${getProjectSlug(project)}`,
                    date: project.year // Rough approximation for date sorting
                }));

                const formattedDeployments = deployments.map(deployment => ({
                    type: 'page',
                    title: deployment.name,
                    description: `${deployment.hostingProvider || 'Hosted'} ${deployment.environment ? `• ${deployment.environment}` : ''}`.trim(),
                    path: `/apps/${getDeploymentSlug(deployment)}`,
                    date: nowIso
                }));

                const formattedHome = (homeData || []).map(h => ({
                    type: 'page',
                    title: 'Home',
                    description: `Home content: ${h.name} - ${h.homeRoles?.[0] || ''}...`,
                    path: '/',
                    date: nowIso
                }));

                const formattedAbout = (aboutData || []).flatMap(a => {
                    const matches = [];

                    // Helper to check regex
                    const isMatch = (text) => text && regex.test(text);

                    if (isMatch(a.name) || isMatch(a.professionalSummary)) {
                        matches.push({
                            type: 'page',
                            title: 'About - Summary',
                            description: a.professionalSummary ? a.professionalSummary.substring(0, 100) + '...' : `About ${a.name}`,
                            path: '/about-me#summary',
                            date: nowIso
                        });
                    }

                    const matchedExperience = Array.isArray(a.experiences)
                        ? a.experiences.some((exp) => isMatch(exp?.company) || isMatch(exp?.role))
                        : false;
                    if (matchedExperience) {
                        matches.push({
                            type: 'page',
                            title: 'About - Experience',
                            description: 'Professional experience and roles.',
                            path: '/about-me#experience',
                            date: nowIso
                        });
                    }

                    const matchedSkills = Array.isArray(a.skills)
                        ? a.skills.some((skill) => isMatch(skill?.name))
                        : false;
                    if (matchedSkills) {
                        matches.push({
                            type: 'page',
                            title: 'About - Skills',
                            description: 'Technical skills and proficiencies.',
                            path: '/about-me#skills',
                            date: nowIso
                        });
                    }

                    // Fallback if nothing specific matched but still returned by query (e.g. edge cases)
                    if (matches.length === 0) {
                        matches.push({
                            type: 'page',
                            title: 'About',
                            description: a.professionalSummary ? a.professionalSummary.substring(0, 100) + '...' : `About ${a.name}`,
                            path: '/about-me',
                            date: nowIso
                        });
                    }

                    return matches;
                });

                return [...formattedBlogs, ...formattedProjects, ...formattedDeployments, ...formattedHome, ...formattedAbout].sort((a, b) => {
                    // Simple string comparison for now as formats might differ
                    return (b.date || '').localeCompare(a.date || '');
                });
            },
            CACHE_TTL.SHORT
        );

        return NextResponse.json(
            { results },
            {
                headers: {
                    ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_SHORT),
                    ...createCacheDebugHeaders(meta),
                },
            }
        );
    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', results: [] }, { status: 500 });
    }
}
