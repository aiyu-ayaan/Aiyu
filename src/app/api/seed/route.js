import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { fromClient, upsertSingleton } from '@/lib/serialize';
import cache from '@/lib/cache';

import projects from '@/app/data/projectsData';
import deployments from '@/app/data/deploymentsData';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from '@/app/data/aboutData';
import { name as homeName, homeRoles, githubLink, codeSnippets } from '@/app/data/homeScreenData';
import { navLinks, contactLink } from '@/app/data/headerData';

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

/**
 * Authorize the seed call. Migrations are handled at the container level;
 * this endpoint only (re)seeds data, so it is destructive and must be gated.
 *
 * Allowed if EITHER:
 *  - a valid admin session cookie is present (browser / admin panel), OR
 *  - SEED_SECRET is configured and supplied via `Authorization: Bearer <secret>`
 *    or `?secret=<secret>` (headless / CI / container entrypoint).
 */
async function authorize(request) {
    const session = await getSession();
    if (session) return true;

    const secret = process.env.SEED_SECRET;
    if (secret) {
        const auth = request.headers.get('authorization') || '';
        const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const query = new URL(request.url).searchParams.get('secret');
        if (bearer === secret || query === secret) return true;
    }

    return false;
}

async function runSeed() {
    // Clear existing data (singletons are replaced via upsert below).
    await prisma.project.deleteMany();
    await prisma.deployment.deleteMany();
    await prisma.about.deleteMany();
    await prisma.home.deleteMany();
    await prisma.header.deleteMany();
    await prisma.social.deleteMany();

    if (projects.length > 0) {
        await prisma.project.createMany({
            data: projects.map((project) => fromClient('project', project, { keepId: false })),
        });
    }

    if (deployments.length > 0) {
        await prisma.deployment.createMany({
            data: deployments.map((deployment) => fromClient('deployment', deployment, { keepId: false })),
        });
    }

    await upsertSingleton(prisma, 'about', {
        name,
        roles,
        professionalSummary,
        skills,
        experiences,
        education,
        certifications,
    });

    await upsertSingleton(prisma, 'home', {
        name: homeName,
        homeRoles,
        githubLink,
        codeSnippets,
    });

    await upsertSingleton(prisma, 'header', { navLinks, contactLink });

    await prisma.social.createMany({
        data: SOCIAL_DATA.map((social) => fromClient('social', social, { keepId: false })),
    });

    // Seed default Config only if none exists, preserving admin settings.
    const existingConfig = await prisma.config.findFirst();
    if (!existingConfig) {
        await upsertSingleton(prisma, 'config', DEFAULT_CONFIG);
    }

    // Drop cached (mostly fallback) values so fresh data is served immediately.
    cache.invalidateAll();
}

async function handle(request) {
    if (!(await authorize(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await runSeed();
        return NextResponse.json({ success: true, message: 'Database seeded successfully' });
    } catch (error) {
        console.error('[Seed] error:', error);
        return NextResponse.json(
            { error: 'Error seeding database', details: error.message },
            { status: 500 },
        );
    }
}

export async function POST(request) {
    return handle(request);
}

export async function GET(request) {
    return handle(request);
}
