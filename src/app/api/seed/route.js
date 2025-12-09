import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import About from '@/models/About';
import Home from '@/models/Home';
import Header from '@/models/Header';
import Social from '@/models/Social';

import projects from '@/app/data/projectsData';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from '@/app/data/aboutData';
import { name as homeName, homeRoles, githubLink, codeSnippets } from '@/app/data/homeScreenData';
import { navLinks, contactLink } from '@/app/data/headerData';
import { socials } from '@/app/data/siteData';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();

    try {
        // Clear existing data
        await Project.deleteMany({});
        await About.deleteMany({});
        await Home.deleteMany({});
        await Header.deleteMany({});
        await Social.deleteMany({});

        // Seed Projects
        await Project.insertMany(projects);

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

        // Seed Socials
        // Transform icon component to string name
        const socialData = socials.map(s => ({
            name: s.name,
            url: s.url,
            iconName: s.icon.name || s.icon.displayName || s.name, // Fallback to name if icon name not found, but usually icon.name works for imported icons
        }));

        // Note: react-icons components might not have a simple 'name' property when imported.
        // Let's check how they are exported in siteData.js.
        // They are imported as { FaGithub, ... } from 'react-icons/fa'.
        // We need to store the string "FaGithub" etc.
        // But in siteData.js they are assigned to the 'icon' property as the component itself.
        // We can't easily get the name back from the component function in all cases.
        // However, for this migration, we know the mapping.
        // Let's manually map them for safety or assume the user will check.
        // Better approach: In siteData.js, we can see the mapping.
        // Let's hardcode the mapping here based on the known data to be safe.

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
