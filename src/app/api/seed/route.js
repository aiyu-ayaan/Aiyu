import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Deployment from '@/models/Deployment';
import About from '@/models/About';
import Home from '@/models/Home';
import Header from '@/models/Header';
import Social from '@/models/Social';

import projects from '@/app/data/projectsData';
import deployments from '@/app/data/deploymentsData';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from '@/app/data/aboutData';
import { name as homeName, homeRoles, githubLink, codeSnippets } from '@/app/data/homeScreenData';
import { navLinks, contactLink } from '@/app/data/headerData';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();

    try {
        // Clear existing data
        await Project.deleteMany({});
        await Deployment.deleteMany({});
        await About.deleteMany({});
        await Home.deleteMany({});
        await Header.deleteMany({});
        await Social.deleteMany({});

        // Seed Projects
        await Project.insertMany(projects);

        // Seed Deployments
        if (deployments.length > 0) {
            await Deployment.insertMany(deployments);
        }

        // Seed About
        await About.create({
            name,
            roles,
            professionalSummary,
            skills,
            experiences,
            education,
            certifications,
        });

        // Seed Home
        await Home.create({
            name: homeName,
            homeRoles,
            githubLink,
            codeSnippets,
        });

        // Seed Header
        await Header.create({
            navLinks,
            contactLink,
        });

        const socialDataFixed = [
            { name: 'GitHub', url: 'https://github.com/aiyu-ayaan', iconName: 'FaGithub' },
            { name: 'LinkedIn', url: 'https://www.linkedin.com/in/aiyu/', iconName: 'FaLinkedin' },
            { name: 'Instagram', url: 'https://www.instagram.com/aiyu.dev_/', iconName: 'FaInstagram' },
            { name: 'Email', url: 'mailto:aiyu.ayaan@gmail.com', iconName: 'FaEnvelope' },
        ];

        await Social.insertMany(socialDataFixed);

        return NextResponse.json({ message: 'Database seeded successfully' });
    } catch (error) {
        console.error('Seeding error:', error);
        return NextResponse.json({ error: 'Error seeding database', details: error.message }, { status: 500 });
    }
}
