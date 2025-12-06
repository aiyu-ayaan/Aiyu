import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import About from '../src/models/About.js';
import Project from '../src/models/Project.js';
import Header from '../src/models/Header.js';
import Site from '../src/models/Site.js';
import HomeScreen from '../src/models/HomeScreen.js';
import ProjectsPage from '../src/models/ProjectsPage.js';

// Import data
import * as aboutData from '../src/app/data/aboutData.js';
import * as headerData from '../src/app/data/headerData.js';
import * as homeScreenData from '../src/app/data/homeScreenData.js';
import projectsDataModule from '../src/app/data/projectsData.js';
import * as siteData from '../src/app/data/siteData.js';

const projectsData = projectsDataModule.default || projectsDataModule;

async function seedDatabase() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Clear existing data
    console.log('Clearing existing data...');
    await About.deleteMany({});
    await Project.deleteMany({});
    await Header.deleteMany({});
    await Site.deleteMany({});
    await HomeScreen.deleteMany({});
    await ProjectsPage.deleteMany({});
    console.log('Existing data cleared');

    // Seed About data
    console.log('Seeding About data...');
    const aboutDoc = new About({
      name: aboutData.name,
      roles: aboutData.roles,
      professionalSummary: aboutData.professionalSummary,
      skills: aboutData.skills,
      experiences: aboutData.experiences,
      education: aboutData.education,
      certifications: aboutData.certifications,
    });
    await aboutDoc.save();
    console.log('About data seeded successfully');

    // Seed Projects data
    console.log('Seeding Projects data...');
    const projects = Array.isArray(projectsData) ? projectsData : [projectsData];
    await Project.insertMany(projects);
    console.log(`${projects.length} projects seeded successfully`);

    // Seed ProjectsPage data
    console.log('Seeding ProjectsPage data...');
    const projectsPageModule = await import('../src/app/data/projectsData.js');
    const projectsPageDoc = new ProjectsPage({
      roles: projectsPageModule.roles || ['A collection of my work', 'Click on a project to learn more'],
    });
    await projectsPageDoc.save();
    console.log('ProjectsPage data seeded successfully');

    // Seed Header data
    console.log('Seeding Header data...');
    const headerDoc = new Header({
      navLinks: headerData.navLinks,
      contactLink: headerData.contactLink,
    });
    await headerDoc.save();
    console.log('Header data seeded successfully');

    // Seed Site data (socials)
    console.log('Seeding Site data...');
    // Map icon components to icon names for database storage
    const iconNameMap = {
      'FaGithub': 'GitHub',
      'FaLinkedin': 'LinkedIn',
      'FaInstagram': 'Instagram',
      'FaEnvelope': 'Email',
    };
    const socialsWithIconNames = siteData.socials.map(social => ({
      name: social.name,
      url: social.url,
      // Use the icon name from the map, fallback to social.name
      icon: iconNameMap[social.icon?.name] || social.name,
    }));
    const siteDoc = new Site({
      socials: socialsWithIconNames,
    });
    await siteDoc.save();
    console.log('Site data seeded successfully');

    // Seed HomeScreen data
    console.log('Seeding HomeScreen data...');
    const homeScreenDoc = new HomeScreen({
      name: homeScreenData.name,
      homeRoles: homeScreenData.homeRoles,
      githubLink: homeScreenData.githubLink,
      codeSnippets: homeScreenData.codeSnippets,
    });
    await homeScreenDoc.save();
    console.log('HomeScreen data seeded successfully');

    console.log('\n✅ All data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
