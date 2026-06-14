import { prisma } from '@/lib/prisma';
import { fromClient, upsertSingleton } from '@/lib/serialize';

import projects from '@/app/data/projectsData';
import deployments from '@/app/data/deploymentsData';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from '@/app/data/aboutData';
import { name as homeName, homeRoles, githubLink, codeSnippets } from '@/app/data/homeScreenData';
import { navLinks, contactLink } from '@/app/data/headerData';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Clear existing data
        await prisma.project.deleteMany();
        await prisma.deployment.deleteMany();
        await prisma.about.deleteMany();
        await prisma.home.deleteMany();
        await prisma.header.deleteMany();
        await prisma.social.deleteMany();

        // Seed Projects
        if (projects.length > 0) {
            await prisma.project.createMany({
                data: projects.map((project) => fromClient('project', project, { keepId: false })),
            });
        }

        // Seed Deployments
        if (deployments.length > 0) {
            await prisma.deployment.createMany({
                data: deployments.map((deployment) => fromClient('deployment', deployment, { keepId: false })),
            });
        }

        // Seed About (singleton)
        await upsertSingleton(prisma, 'about', {
            name,
            roles,
            professionalSummary,
            skills,
            experiences,
            education,
            certifications,
        });

        // Seed Home (singleton)
        await upsertSingleton(prisma, 'home', {
            name: homeName,
            homeRoles,
            githubLink,
            codeSnippets,
        });

        // Seed Header (singleton)
        await upsertSingleton(prisma, 'header', {
            navLinks,
            contactLink,
        });

        const socialDataFixed = [
            { name: 'GitHub', url: 'https://github.com/aiyu-ayaan', iconName: 'FaGithub' },
            { name: 'LinkedIn', url: 'https://www.linkedin.com/in/aiyu/', iconName: 'FaLinkedin' },
            { name: 'Instagram', url: 'https://www.instagram.com/aiyu.dev_/', iconName: 'FaInstagram' },
            { name: 'Email', url: 'mailto:aiyu.ayaan@gmail.com', iconName: 'FaEnvelope' },
        ];

        await prisma.social.createMany({
            data: socialDataFixed.map((social) => fromClient('social', social, { keepId: false })),
        });

        return NextResponse.json({ message: 'Database seeded successfully' });
    } catch (error) {
        console.error('Seeding error:', error);
        return NextResponse.json({ error: 'Error seeding database', details: error.message }, { status: 500 });
    }
}
