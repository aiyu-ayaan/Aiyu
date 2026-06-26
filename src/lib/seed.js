/**
 * Auto-seed module — populates default data on first app startup.
 *
 * Unlike the old /api/seed endpoint (which was destructive — it deleted all
 * existing data), `autoSeed()` is **non-destructive**: it only runs when the
 * database is completely empty (no Config row exists yet).
 *
 * Called from `src/instrumentation.js` during the Next.js `register()` hook,
 * so it executes once when the server process starts.
 */

import { prisma } from '@/lib/prisma';
import { fromClient, upsertSingleton } from '@/lib/serialize';
import cache from '@/lib/cache';

import projects from '@/app/data/projectsData';
import deployments from '@/app/data/deploymentsData';
import {
    name, roles, professionalSummary, skills,
    experiences, education, certifications,
} from '@/app/data/aboutData';
import {
    name as homeName, homeRoles, githubLink, codeSnippets,
} from '@/app/data/homeScreenData';
import { navLinks, contactLink } from '@/app/data/headerData';

// ─── Static seed data ───────────────────────────────────────────────

const SOCIAL_DATA = [
    { name: 'GitHub', url: 'https://github.com/aiyu-ayaan', iconName: 'FaGithub' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/aiyu/', iconName: 'FaLinkedin' },
    { name: 'Instagram', url: 'https://www.instagram.com/aiyu.dev_/', iconName: 'FaInstagram' },
    { name: 'Email', url: 'mailto:aiyu.ayaan@gmail.com', iconName: 'FaEnvelope' },
];

const DEFAULT_CONFIG = {
    logoText: '< aiyu />',
    siteTitle: 'Aiyu',
    n8nWebhookUrl: '',
    resume: { type: 'url', value: '' },
};

const DEFAULT_SHOWCASE = {
    eyebrow: 'How I Work',
    headline: 'Focus areas, side to side.',
    description: 'Keep scrolling — this rail moves sideways with you, then hands you back to the page.',
    panels: [
        {
            title: 'Product Engineering',
            description: 'Turning fuzzy ideas into shipped features, with a bias for the user\u2019s real friction.',
            icon: 'Laptop',
            accent: 'var(--accent-cyan)',
            tags: ['Next.js', 'React', 'TypeScript'],
        },
        {
            title: 'Backend & APIs',
            description: 'Pragmatic services and data models that stay readable as the surface area grows.',
            icon: 'Server',
            accent: 'var(--accent-purple)',
            tags: ['Node', 'REST', 'Mongo'],
        },
        {
            title: 'Interface Craft',
            description: 'Responsive, accessible UI that feels calm on desktop and quick on mobile.',
            icon: 'Mobile',
            accent: 'var(--accent-orange)',
            tags: ['Tailwind', 'Motion', 'A11y'],
        },
        {
            title: 'Design Systems',
            description: 'Tokens, glass surfaces, and reusable primitives that keep a product coherent.',
            icon: 'PaintBrush',
            accent: 'var(--accent-pink)',
            tags: ['Theming', 'Tokens', 'GSAP'],
        },
        {
            title: 'Performance',
            description: 'Measuring before tuning — lazy boundaries, device tiers, and smooth 60fps scroll.',
            icon: 'Rocket',
            accent: 'var(--accent-cyan)',
            tags: ['Lighthouse', 'k6', 'LOD'],
        },
        {
            title: 'AI & Automation',
            description: 'Wiring models and tooling into workflows so the boring parts run themselves.',
            icon: 'Brain',
            accent: 'var(--accent-purple)',
            tags: ['LLMs', 'Agents', 'Tooling'],
        },
    ],
};

const DEFAULT_SEO_DISALLOW = [
    '/admin', '/api/admin', '/api/auth/login', '/api/auth/logout',
    '/api/config', '/*.json$', '/*?', '/blog/', '/deployments/',
];

// ─── Auto-seed ──────────────────────────────────────────────────────

/**
 * Populate the database with default data **only if it is empty**.
 *
 * The check is simple: if a Config row already exists, the database has been
 * initialised (either via this function, the standalone `npm run db:seed`
 * script, or manually through the admin panel) and we skip entirely.
 *
 * @returns {boolean} `true` if data was seeded, `false` if skipped.
 */
export async function autoSeed() {
    const existingConfig = await prisma.config.findFirst();
    if (existingConfig) {
        return false; // Already initialised — nothing to do.
    }

    console.log('[auto-seed] Empty database detected — seeding default data…');

    // ── Projects ──
    if (projects.length > 0) {
        await prisma.project.createMany({
            data: projects.map((p) => fromClient('project', p, { keepId: false })),
        });
        console.log(`[auto-seed]   → ${projects.length} project(s)`);
    }

    // ── Deployments ──
    if (deployments.length > 0) {
        await prisma.deployment.createMany({
            data: deployments.map((d) => fromClient('deployment', d, { keepId: false })),
        });
        console.log(`[auto-seed]   → ${deployments.length} deployment(s)`);
    }

    // ── About (singleton) ──
    await upsertSingleton(prisma, 'about', {
        name, roles, professionalSummary, skills,
        experiences, education, certifications,
    });
    console.log('[auto-seed]   → About');

    // ── Home (singleton) ──
    await upsertSingleton(prisma, 'home', {
        name: homeName,
        homeRoles,
        githubLink,
        codeSnippets,
        showcaseSection: DEFAULT_SHOWCASE,
    });
    console.log('[auto-seed]   → Home');

    // ── Header (singleton) ──
    await upsertSingleton(prisma, 'header', { navLinks, contactLink });
    console.log('[auto-seed]   → Header');

    // ── Socials ──
    await prisma.social.createMany({
        data: SOCIAL_DATA.map((s) => fromClient('social', s, { keepId: false })),
    });
    console.log('[auto-seed]   → Socials');

    // ── Config (singleton) ──
    await upsertSingleton(prisma, 'config', DEFAULT_CONFIG);
    console.log('[auto-seed]   → Config');

    // ── SeoConfig (singleton, only if missing) ──
    const existingSeo = await prisma.seoConfig.findFirst();
    if (!existingSeo) {
        await prisma.seoConfig.create({
            data: {
                data: {
                    robots: {
                        rules: [
                            { userAgent: '*', allow: ['/'], disallow: DEFAULT_SEO_DISALLOW, crawlDelay: 1 },
                            { userAgent: 'Googlebot', allow: ['/'], disallow: DEFAULT_SEO_DISALLOW, crawlDelay: 0 },
                        ],
                        extraSitemaps: [],
                        customAppend: '',
                    },
                    sitemap: { extraUrls: [], excludePaths: [], defaultPriorities: {} },
                    indexing: { enabled: false },
                },
            },
        });
        console.log('[auto-seed]   → SeoConfig');
    }

    // Drop any cached fallback values so fresh data is served immediately.
    cache.invalidateAll();

    console.log('[auto-seed] ✓ Database seeded successfully.');
    return true;
}
