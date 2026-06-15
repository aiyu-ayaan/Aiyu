import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, toClientList } from '@/lib/serialize';
import cache, { CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { getBlogSlug } from '@/lib/blogSlugs';
import { getDeploymentSlug, getProjectSlug } from '@/lib/contentSlugs';

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Escape LIKE/ILIKE wildcards so the user query is matched literally.
function likePattern(value) {
    const escaped = String(value).replace(/[\\%_]/g, (ch) => `\\${ch}`);
    return `%${escaped}%`;
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
                const regex = new RegExp(escapeRegex(query), 'i');
                const nowIso = new Date().toISOString();
                const pattern = likePattern(query);

                const [blogRows, projectRows, deploymentRows, home, about] = await Promise.all([
                    // Blogs: PostgreSQL full-text search over the weighted tsvector.
                    prisma.$queryRaw`
                        SELECT id, title, content, date, slug
                        FROM "Blog"
                        WHERE published = true
                          AND "searchVector" @@ websearch_to_tsquery('english', ${query})
                        ORDER BY ts_rank("searchVector", websearch_to_tsquery('english', ${query})) DESC,
                                 "createdAt" DESC
                        LIMIT ${SEARCH_LIMITS.BLOGS}
                    `,

                    // Projects: case-insensitive match across name/description/techStack.
                    prisma.$queryRaw`
                        SELECT id, name, slug, description, year
                        FROM "Project"
                        WHERE name ILIKE ${pattern}
                           OR description ILIKE ${pattern}
                           OR array_to_string("techStack", ' ') ILIKE ${pattern}
                        ORDER BY "displayOrder" ASC, year DESC
                        LIMIT ${SEARCH_LIMITS.PROJECTS}
                    `,

                    // Deployments: case-insensitive match across the searchable text columns.
                    prisma.$queryRaw`
                        SELECT id, name, slug, description, "hostingProvider", environment
                        FROM "Deployment"
                        WHERE name ILIKE ${pattern}
                           OR description ILIKE ${pattern}
                           OR array_to_string("techStack", ' ') ILIKE ${pattern}
                           OR "hostingProvider" ILIKE ${pattern}
                           OR "appType" ILIKE ${pattern}
                           OR environment ILIKE ${pattern}
                        ORDER BY "displayOrder" ASC, "updatedAt" DESC
                        LIMIT ${SEARCH_LIMITS.DEPLOYMENTS}
                    `,

                    // Home / About are singletons — fetch and filter in JS.
                    getSingleton(prisma, 'home'),
                    getSingleton(prisma, 'about'),
                ]);

                const blogs = toClientList('blog', blogRows);
                const projects = toClientList('project', projectRows);
                const deployments = toClientList('deployment', deploymentRows);

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

                const homeMatches = home && (
                    regex.test(home.name || '')
                    || (Array.isArray(home.homeRoles) && home.homeRoles.some((role) => regex.test(role)))
                    || (Array.isArray(home.codeSnippets) && home.codeSnippets.some((snippet) => regex.test(snippet)))
                );
                const homeData = homeMatches ? [home] : [];

                const aboutMatches = about && (
                    regex.test(about.name || '')
                    || regex.test(about.professionalSummary || '')
                    || (Array.isArray(about.experiences) && about.experiences.some((exp) => regex.test(exp?.company || '') || regex.test(exp?.role || '')))
                    || (Array.isArray(about.skills) && about.skills.some((skill) => regex.test(skill?.name || '')))
                );
                const aboutData = aboutMatches ? [about] : [];

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
