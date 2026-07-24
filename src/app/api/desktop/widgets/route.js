import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClientList } from '@/lib/serialize';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function GET() {
    try {
        const [blogsRaw, galleryRaw, projectsRaw, deploymentsRaw] = await Promise.all([
            prisma.blog.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, take: 8 }).catch(() => []),
            prisma.gallery.findMany({ orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }], take: 8 }).catch(() => []),
            prisma.project.findMany({ orderBy: { displayOrder: 'asc' }, take: 8 }).catch(() => []),
            prisma.deployment.findMany({ orderBy: { displayOrder: 'asc' }, take: 8 }).catch(() => []),
        ]);

        const blogs = toClientList('blog', blogsRaw);
        const gallery = toClientList('gallery', galleryRaw);
        const projects = toClientList('project', projectsRaw);
        const deployments = toClientList('deployment', deploymentsRaw);

        const items = [];

        // 1. Format Blogs from DB
        blogs.forEach((b) => {
            items.push({
                id: `blog-${b._id || b.id}`,
                type: 'blog',
                category: 'Blogs',
                title: b.title,
                excerpt: b.excerpt || b.seoDescription || 'Read full article on portfolio.',
                date: b.date || (b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '2026'),
                readTime: '4 min read',
                url: `/blogs/${b.slug || b._id || b.id}`,
            });
        });

        // 2. Format Images from DB
        gallery.forEach((g, idx) => {
            items.push({
                id: `img-${g._id || g.id}`,
                type: 'image',
                category: 'Images',
                title: g.description || `Portfolio Shot ${idx + 1}`,
                src: g.src,
                description: g.description || 'Portfolio gallery artwork.',
                url: g.src,
                badge: g.isPinned ? 'Pinned' : 'Photo',
            });
        });

        // 3. Format Projects from DB
        projects.forEach((p) => {
            items.push({
                id: `proj-${p._id || p.id}`,
                type: 'project',
                category: 'Projects',
                title: p.name,
                description: p.description,
                techStack: Array.isArray(p.techStack) ? p.techStack : ['React', 'Next.js'],
                status: p.status || 'Active',
                url: p.codeLink || p.blogLink || `/projects/${p.slug || p._id}`,
            });
        });

        // 4. Format Apps / Deployments from DB
        deployments.forEach((d) => {
            items.push({
                id: `app-${d._id || d.id}`,
                type: 'app',
                category: 'Apps',
                title: d.name,
                description: d.description,
                icon: 'Code',
                appKey: 'browser',
                url: d.hostedUrl || d.blogLink || `/apps/${d.slug || d._id}`,
            });
        });

        // 5. Default Desktop Apps shortcuts if deployments are few
        if (deployments.length < 3) {
            items.push(
                {
                    id: 'app-vscode',
                    type: 'app',
                    category: 'Apps',
                    title: 'Visual Studio Code',
                    description: 'Web-based source editor with multi-file tabs & syntax highlighting.',
                    icon: 'Code',
                    appKey: 'code',
                    url: '/desktop',
                },
                {
                    id: 'app-terminal',
                    type: 'app',
                    category: 'Apps',
                    title: 'Terminal & Powershell',
                    description: 'Interactive CLI terminal supporting system commands.',
                    icon: 'Terminal',
                    appKey: 'terminal',
                    url: '/desktop',
                },
                {
                    id: 'app-explorer',
                    type: 'app',
                    category: 'Apps',
                    title: 'File Explorer',
                    description: 'Browse virtual system files, images & documents.',
                    icon: 'Folder',
                    appKey: 'explorer',
                    url: '/desktop',
                }
            );
        }

        // 6. Resume AI Skills
        items.push(
            {
                id: 'skill-agentic',
                type: 'skill',
                category: 'AI Skills',
                title: 'AI Pair Programming & Multi-Agent Workflows',
                description: 'Multi-agent orchestration, CodeGraph indexing, tool calling & autonomous execution.',
                level: 'Expert',
                icon: 'Bot',
                tags: ['Agents', 'LLM', 'CodeGraph', 'MCP'],
                url: '/about',
            },
            {
                id: 'skill-next16',
                type: 'skill',
                category: 'AI Skills',
                title: 'Fullstack Next.js 16 & React 19',
                description: 'App Router architecture, React Server Components, streaming SSR & PostgreSQL Prisma.',
                level: 'Advanced',
                icon: 'Cpu',
                tags: ['Next.js 16', 'React 19', 'Prisma', 'Tailwind 4'],
                url: '/about',
            },
            {
                id: 'skill-motion',
                type: 'skill',
                category: 'AI Skills',
                title: 'GSAP Motion & Physical UI Polish',
                description: 'GPU-accelerated layout transitions, spring physics, glassmorphism & fluid responsiveness.',
                level: 'Expert',
                icon: 'Zap',
                tags: ['GSAP', 'Framer Motion', 'Tailwind 4'],
                url: '/about',
            }
        );

        return NextResponse.json(
            { success: true, items },
            { headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM) }
        );
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
