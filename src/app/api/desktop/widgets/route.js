import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClientList } from '@/lib/serialize';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

/** Convert empty-string or whitespace-only URLs to null */
function cleanUrl(val) {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    return val;
}

export async function GET() {
    try {
        const [blogsRaw, galleryRaw, projectsRaw, deploymentsRaw] = await Promise.all([
            prisma.blog.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, take: 10 }).catch(() => []),
            prisma.gallery.findMany({ orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }], take: 10 }).catch(() => []),
            prisma.project.findMany({ orderBy: { displayOrder: 'asc' }, take: 10 }).catch(() => []),
            prisma.deployment.findMany({ orderBy: { displayOrder: 'asc' }, take: 10 }).catch(() => []),
        ]);

        const blogs = toClientList('blog', blogsRaw);
        const gallery = toClientList('gallery', galleryRaw);
        const projects = toClientList('project', projectsRaw);
        const deployments = toClientList('deployment', deploymentsRaw);

        // Collect items by type, then interleave for variety in staggered grid
        const blogItems = [];
        const imageItems = [];
        const projectItems = [];
        const appItems = [];

        // 1. Format Blogs from DB (with social image / cover image)
        blogs.forEach((b) => {
            blogItems.push({
                id: `blog-${b._id || b.id}`,
                type: 'blog',
                category: 'Blogs',
                title: b.title,
                image: cleanUrl(b.socialImage) || cleanUrl(b.image),
                excerpt: b.excerpt || b.seoDescription || 'Read full article on portfolio.',
                date: b.date || (b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '2026'),
                readTime: '4 min read',
                tags: Array.isArray(b.tags) ? b.tags : [],
                url: `/blogs/${b.slug || b._id || b.id}`,
            });
        });

        // 2. Format Images from DB
        gallery.forEach((g, idx) => {
            const src = cleanUrl(g.src);
            if (!src) return; // skip gallery items with no image
            imageItems.push({
                id: `img-${g._id || g.id}`,
                type: 'image',
                category: 'Images',
                title: g.description || `Portfolio Shot ${idx + 1}`,
                src,
                description: g.description || 'Portfolio gallery artwork.',
                url: src,
                badge: g.isPinned ? 'Pinned' : 'Photo',
            });
        });

        // 3. Format Projects from DB
        projects.forEach((p) => {
            projectItems.push({
                id: `proj-${p._id || p.id}`,
                type: 'project',
                category: 'Projects',
                title: p.name,
                image: cleanUrl(p.image),
                description: p.description,
                techStack: Array.isArray(p.techStack) ? p.techStack : ['React', 'Next.js'],
                status: p.status || 'Active',
                url: p.codeLink || p.blogLink || `/projects/${p.slug || p._id}`,
            });
        });

        // 4. Format Apps / Deployments from DB
        deployments.forEach((d) => {
            appItems.push({
                id: `app-${d._id || d.id}`,
                type: 'app',
                category: 'Apps',
                title: d.name,
                image: cleanUrl(d.image),
                description: d.description,
                icon: 'Code',
                appKey: 'browser',
                url: d.hostedUrl || d.blogLink || `/apps/${d.slug || d._id}`,
            });
        });

        // Interleave items from different categories for a mixed staggered feed
        const buckets = [imageItems, blogItems, projectItems, appItems];
        const items = [];
        const maxLen = Math.max(...buckets.map((b) => b.length));
        for (let i = 0; i < maxLen; i++) {
            for (const bucket of buckets) {
                if (i < bucket.length) items.push(bucket[i]);
            }
        }

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
