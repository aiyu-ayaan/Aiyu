import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Import Models (using relative paths)
import Project from '../src/models/Project.js';
import About from '../src/models/About.js';
import Home from '../src/models/Home.js';
import Header from '../src/models/Header.js';
import Social from '../src/models/Social.js';
// Config model might be needed if we want to seed defaults, but usually not strictly required for basic boot. 
// Adding it just in case we want to clean it or set defaults.
import Config from '../src/models/Config.js';

// Import Data
import projects from '../src/app/data/projectsData.js';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from '../src/app/data/aboutData.js';
import { name as homeName, homeRoles, githubLink, codeSnippets } from '../src/app/data/homeScreenData.js';
import { navLinks, contactLink } from '../src/app/data/headerData.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // Clear existing data
        console.log('Clearing old data...');
        await Project.deleteMany({});
        await About.deleteMany({});
        await Home.deleteMany({});
        await Header.deleteMany({});
        await Social.deleteMany({});
        // We usually don't delete Config on every seed to preserve admin settings, 
        // but for a fresh "migration" we might want to ensure defaults exist if missing.
        // For now, let's leave Config alone or only insert if missing.

        // Seed Projects
        console.log('Seeding Projects...');
        await Project.insertMany(projects);

        // Seed About
        console.log('Seeding About...');
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
        console.log('Seeding Home...');
        await Home.create({
            name: homeName,
            homeRoles,
            githubLink,
            codeSnippets,
        });

        // Seed Header
        console.log('Seeding Header...');
        await Header.create({
            navLinks,
            contactLink,
        });

        // Seed Socials
        console.log('Seeding Socials...');
        const socialDataFixed = [
            { name: 'GitHub', url: 'https://github.com/aiyu-ayaan', iconName: 'FaGithub' },
            { name: 'LinkedIn', url: 'https://www.linkedin.com/in/aiyu/', iconName: 'FaLinkedin' },
            { name: 'Instagram', url: 'https://www.instagram.com/aiyu.dev_/', iconName: 'FaInstagram' },
            { name: 'Email', url: 'mailto:aiyu.ayaan@gmail.com', iconName: 'FaEnvelope' },
        ];
        await Social.insertMany(socialDataFixed);

        // Ensure Config defaults
        const existingConfig = await Config.findOne();
        if (!existingConfig) {
            console.log('Seeding default Config...');
            await Config.create({
                logoText: '< aiyu />',
                siteTitle: 'Aiyu',
                n8nWebhookUrl: '',
                resume: { type: 'url', value: '' }
            });
        }

        console.log('Database seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seed();
