import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Blog from '@/models/Blog';
import Project from '@/models/Project';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ results: [] });
        }

        await dbConnect();

        // Create a case-insensitive regex
        const regex = new RegExp(query, 'i');

        const [blogs, projects, homeData, aboutData] = await Promise.all([
            Blog.find({
                $or: [
                    { title: regex },
                    { content: regex },
                    { tags: regex }
                ],
                published: true
            }).select('title content date _id').lean(),

            Project.find({
                $or: [
                    { name: regex },
                    { description: regex },
                    { techStack: regex }
                ]
            }).select('name description year _id').lean(),

            // Search Home (usually singleton, but using find in case of multiple or just 1)
            import('@/models/Home').then(mod => mod.default.find({
                $or: [
                    { name: regex },
                    { homeRoles: regex },
                    { codeSnippets: regex }
                ]
            }).lean()),

            // Search About (usually singleton)
            import('@/models/About').then(mod => mod.default.find({
                $or: [
                    { name: regex },
                    { professionalSummary: regex },
                    { "experiences.company": regex },
                    { "experiences.role": regex },
                    { "skills.name": regex }
                ]
            }).lean())
        ]);

        const formattedBlogs = blogs.map(blog => ({
            type: 'blog',
            title: blog.title,
            description: blog.content ? blog.content.substring(0, 100) + '...' : '',
            path: `/blogs/${blog._id}`,
            date: blog.date
        }));

        const formattedProjects = projects.map(project => ({
            type: 'project',
            title: project.name,
            description: project.description ? project.description.substring(0, 100) + '...' : '',
            path: `/projects#project-${project._id}`,
            // path: project.codeLink || '/projects', // User wanted deep linking to dashboard/details likely, but since no details page, we scroll to it.
            date: project.year // Rough approximation for date sorting
        }));

        const formattedHome = (homeData || []).map(h => ({
            type: 'page',
            title: 'Home',
            description: `Home content: ${h.name} - ${h.homeRoles?.[0] || ''}...`,
            path: '/',
            date: new Date().toISOString()
        }));

        const formattedAbout = (aboutData || []).flatMap(a => {
            const matches = [];

            // Add separate entries for different sections if they match, or just one generic if name matches?
            // Better approach: Check what matched and return distinct items if multiple matches found?
            // For now, let's try to find the "best" match or just return multiple if distinct fields matched.

            // Helper to check regex
            const isMatch = (text) => text && regex.test(text);

            if (isMatch(a.name) || isMatch(a.professionalSummary)) {
                matches.push({
                    type: 'page',
                    title: 'About - Summary',
                    description: a.professionalSummary ? a.professionalSummary.substring(0, 100) + '...' : `About ${a.name}`,
                    path: '/about-me#summary',
                    date: new Date().toISOString()
                });
            }

            const matchedExperience = a.experiences.some(exp => isMatch(exp.company) || isMatch(exp.role));
            if (matchedExperience) {
                matches.push({
                    type: 'page',
                    title: 'About - Experience',
                    description: 'Professional experience and roles.',
                    path: '/about-me#experience',
                    date: new Date().toISOString()
                });
            }

            const matchedSkills = a.skills.some(skill => isMatch(skill.name));
            if (matchedSkills) {
                matches.push({
                    type: 'page',
                    title: 'About - Skills',
                    description: 'Technical skills and proficiencies.',
                    path: '/about-me#skills',
                    date: new Date().toISOString()
                });
            }

            // Fallback if nothing specific matched but still returned by query (e.g. edge cases)
            if (matches.length === 0) {
                matches.push({
                    type: 'page',
                    title: 'About',
                    description: a.professionalSummary ? a.professionalSummary.substring(0, 100) + '...' : `About ${a.name}`,
                    path: '/about-me',
                    date: new Date().toISOString()
                });
            }

            return matches;
        });

        const results = [...formattedBlogs, ...formattedProjects, ...formattedHome, ...formattedAbout].sort((a, b) => {
            // Simple string comparison for now as formats might differ
            return (b.date || '').localeCompare(a.date || '');
        });

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', results: [] }, { status: 500 });
    }
}
