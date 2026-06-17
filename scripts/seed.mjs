// Standalone database seeder (PostgreSQL/Prisma).
//
// Run with Node's built-in env loader so DATABASE_URL is available:
//   node --env-file=.env scripts/seed.mjs
// (the `npm run db:seed` script already passes --env-file).

import { PrismaClient } from '@prisma/client';

import projects from '../src/app/data/projectsData.js';
import deployments from '../src/app/data/deploymentsData.js';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from '../src/app/data/aboutData.js';
import { name as homeName, homeRoles, githubLink, codeSnippets } from '../src/app/data/homeScreenData.js';
import { navLinks, contactLink } from '../src/app/data/headerData.js';

const prisma = new PrismaClient();

const PROJECT_COLUMNS = ['name', 'slug', 'techStack', 'year', 'status', 'projectType', 'description', 'codeLink', 'blogLink', 'image', 'displayOrder'];
const DEPLOYMENT_COLUMNS = ['name', 'slug', 'techStack', 'status', 'appType', 'environment', 'hostingProvider', 'description', 'hostedUrl', 'blogLink', 'image', 'displayOrder'];
const SOCIAL_COLUMNS = ['name', 'url', 'iconName', 'isHidden'];

function pick(obj, columns) {
    const out = {};
    for (const key of columns) {
        if (obj[key] !== undefined) {
            out[key] = key === 'displayOrder' ? Number(obj[key]) || 0 : obj[key];
        }
    }
    return out;
}

async function seed() {
    try {
        console.log('Clearing old data...');
        await prisma.project.deleteMany();
        await prisma.deployment.deleteMany();
        await prisma.about.deleteMany();
        await prisma.home.deleteMany();
        await prisma.header.deleteMany();
        await prisma.social.deleteMany();

        console.log('Seeding Projects...');
        if (projects.length > 0) {
            await prisma.project.createMany({ data: projects.map((p) => pick(p, PROJECT_COLUMNS)) });
        }

        if (deployments.length > 0) {
            console.log('Seeding Deployments...');
            await prisma.deployment.createMany({ data: deployments.map((d) => pick(d, DEPLOYMENT_COLUMNS)) });
        }

        console.log('Seeding About...');
        await prisma.about.create({
            data: { data: { name, roles, professionalSummary, skills, experiences, education, certifications } },
        });

        console.log('Seeding Home...');
        const defaultShowcase = {
            eyebrow: 'How I Work',
            headline: 'Focus areas, side to side.',
            description: 'Keep scrolling — this rail moves sideways with you, then hands you back to the page.',
            panels: [
                {
                    title: 'Product Engineering',
                    description: 'Turning fuzzy ideas into shipped features, with a bias for the user’s real friction.',
                    icon: 'Laptop',
                    accent: 'var(--accent-cyan)',
                    tags: ['Next.js', 'React', 'TypeScript']
                },
                {
                    title: 'Backend & APIs',
                    description: 'Pragmatic services and data models that stay readable as the surface area grows.',
                    icon: 'Server',
                    accent: 'var(--accent-purple)',
                    tags: ['Node', 'REST', 'Mongo']
                },
                {
                    title: 'Interface Craft',
                    description: 'Responsive, accessible UI that feels calm on desktop and quick on mobile.',
                    icon: 'Mobile',
                    accent: 'var(--accent-orange)',
                    tags: ['Tailwind', 'Motion', 'A11y']
                },
                {
                    title: 'Design Systems',
                    description: 'Tokens, glass surfaces, and reusable primitives that keep a product coherent.',
                    icon: 'PaintBrush',
                    accent: 'var(--accent-pink)',
                    tags: ['Theming', 'Tokens', 'GSAP']
                },
                {
                    title: 'Performance',
                    description: 'Measuring before tuning — lazy boundaries, device tiers, and smooth 60fps scroll.',
                    icon: 'Rocket',
                    accent: 'var(--accent-cyan)',
                    tags: ['Lighthouse', 'k6', 'LOD']
                },
                {
                    title: 'AI & Automation',
                    description: 'Wiring models and tooling into workflows so the boring parts run themselves.',
                    icon: 'Brain',
                    accent: 'var(--accent-purple)',
                    tags: ['LLMs', 'Agents', 'Tooling']
                }
            ]
        };
        await prisma.home.create({
            data: { data: { name: homeName, homeRoles, githubLink, codeSnippets, showcaseSection: defaultShowcase } },
        });

        console.log('Seeding Header...');
        await prisma.header.create({
            data: { data: { navLinks, contactLink } },
        });

        console.log('Seeding Socials...');
        const socialDataFixed = [
            { name: 'GitHub', url: 'https://github.com/aiyu-ayaan', iconName: 'FaGithub' },
            { name: 'LinkedIn', url: 'https://www.linkedin.com/in/aiyu/', iconName: 'FaLinkedin' },
            { name: 'Instagram', url: 'https://www.instagram.com/aiyu.dev_/', iconName: 'FaInstagram' },
            { name: 'Email', url: 'mailto:aiyu.ayaan@gmail.com', iconName: 'FaEnvelope' },
        ];
        await prisma.social.createMany({ data: socialDataFixed.map((s) => pick(s, SOCIAL_COLUMNS)) });

        // Ensure Config defaults exist (preserve existing admin settings otherwise).
        const existingConfig = await prisma.config.findFirst();
        if (!existingConfig) {
            console.log('Seeding default Config...');
            await prisma.config.create({
                data: {
                    data: {
                        logoText: '< aiyu />',
                        siteTitle: 'Aiyu',
                        n8nWebhookUrl: '',
                        resume: { type: 'url', value: '' },
                    },
                },
            });
        }

        // Ensure SeoConfig defaults exist (robots rules mirror the original
        // hardcoded robots.js so generated output is unchanged on first run).
        const existingSeo = await prisma.seoConfig.findFirst();
        if (!existingSeo) {
            console.log('Seeding default SeoConfig...');
            const DEFAULT_DISALLOW = [
                '/admin', '/api/admin', '/api/auth/login', '/api/auth/logout',
                '/api/config', '/*.json$', '/*?', '/blog/', '/deployments/',
            ];
            await prisma.seoConfig.create({
                data: {
                    data: {
                        robots: {
                            rules: [
                                { userAgent: '*', allow: ['/'], disallow: DEFAULT_DISALLOW, crawlDelay: 1 },
                                { userAgent: 'Googlebot', allow: ['/'], disallow: DEFAULT_DISALLOW, crawlDelay: 0 },
                            ],
                            extraSitemaps: [],
                            customAppend: '',
                        },
                        sitemap: { extraUrls: [], excludePaths: [], defaultPriorities: {} },
                        indexing: { enabled: false },
                    },
                },
            });
        }

        console.log('Database seeded successfully.');
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

seed();
