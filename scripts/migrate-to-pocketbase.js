/**
 * Migration script to set up PocketBase collections and populate data
 * Run this script after PocketBase is running: node scripts/migrate-to-pocketbase.js
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');

// Data imports (from existing data files)
const aboutData = {
  name: "Ayaan Ansari",
  roles: ['Android Developer', 'Learner'],
  professionalSummary: "Android Developer with 2+ years of experience building innovative mobile applications with Kotlin and Jetpack Compose. Proven track record of implementing responsive UIs, integrating APIs, and delivering user-focused solutions. Passionate about creating high-performance, scalable mobile experiences with modern architecture patterns.",
  skills: [
    { name: 'N8N', level: 40 },
    { name: 'Docker (Basic)', level: 40 },
    { name: 'Android Development (Advanced)', level: 90 },
    { name: 'Jetpack Compose (Advanced)', level: 90 },
    { name: 'Kotlin (Advanced)', level: 90 },
    { name: 'MVVM Architecture (Advanced)', level: 90 },
    { name: 'Dependency Injection (Intermediate)', level: 70 },
    { name: 'Firebase (Intermediate)', level: 70 },
    { name: 'Java (Intermediate)', level: 70 },
    { name: 'Kotlin Multiplatform (Intermediate)', level: 70 },
    { name: 'Git (Intermediate)', level: 60 },
    { name: 'HTML/CSS (Intermediate)', level: 60 },
    { name: 'JavaScript (Intermediate)', level: 60 },
    { name: 'Next.js (Intermediate)', level: 60 },
    { name: 'Python (Intermediate)', level: 60 },
    { name: 'React (Intermediate)', level: 60 },
    { name: 'REST APIs (Intermediate)', level: 60 },
    { name: 'SQL (Intermediate)', level: 60 },
    { name: 'C# (Basic)', level: 40 },
    { name: 'DotNet Framework (Basic)', level: 40 },
    { name: 'WordPress (Basic)', level: 40 },
  ],
  experiences: [
    {
      company: 'Adrosonic',
      role: 'Software Engineer',
      duration: 'Jun 2025 - Present',
      description: 'Developing enterprise-level applications using WordPress and .NET Framework. Building scalable web applications with modern backend technologies.',
    },
    {
      company: 'Adrosonic',
      role: 'Software Engineer (Trainee) - Internship',
      duration: 'Dec 2024 - Jun 2025',
      description: 'Developed a POC for Dynamics 365 and Instanda integration, reducing process automation time by 40%. Redesigned office website UI/UX, improving load times and user engagement.',
    },
    {
      company: 'BeyondSchool',
      role: 'Android Developer Intern',
      duration: 'Jul 2022 - Mar 2023',
      description: 'Implemented Text-to-Speech and Speech-to-Text functionality, increasing app accessibility. Designed and integrated gamification features, boosting user retention.',
    },
  ],
  education: [
    {
      institution: 'Birla Institute of Technology, Mesra',
      degree: 'Master of Computer Applications',
      duration: 'Aug 2023 - May 2025',
      cgpa: '8.1/10.0',
    },
    {
      institution: 'Birla Institute of Technology, Mesra',
      degree: 'Bachelor of Computer Applications',
      duration: 'Aug 2019 - May 2022',
      cgpa: '8.2/10.0',
    },
  ],
  certifications: [
    {
      name: 'The Ultimate React Course 2025: React, Next.js, Redux & More',
      issuer: 'Udemy',
      date: 'Aug 2025',
      url: 'https://www.udemy.com/certificate/UC-8abbf26d-c6b6-467e-8ee6-cf21e56b9b21/',
      skills: ['React', 'Next.js', 'Redux.js']
    },
    {
      name: 'C# Basics for Beginners: Learn C# Fundamentals by Coding',
      issuer: 'Udemy',
      date: 'Jun 2025',
      url: 'https://www.udemy.com/certificate/UC-c3981284-fc96-41d2-ab80-cc799a8e5da6/',
      skills: ['C#']
    },
    {
      name: 'C# Intermediate: Classes, Interfaces and OOP',
      issuer: 'Udemy',
      date: 'Jun 2025',
      url: 'https://udemy-certificate.s3.amazonaws.com/pdf/UC-c1beb4a9-0937-4546-b07c-278e1f760f1e.pdf',
      skills: ['C#']
    },
    {
      name: 'Android Basics in Kotlin',
      issuer: 'Google',
      date: 'Dec 2022',
    },
  ]
};

const headerData = {
  navLinks: [
    {
      name: '_hello',
      href: '/',
    },
    {
      name: '_about-me',
      href: '/about-me',
    },
    {
      name: '_projects',
      href: '/projects',
    },
    {
      name: '_resume',
      href: '/resume.pdf',
      target: '_blank',
    },
  ],
  contactLink: {
    name: 'contact-me',
    href: 'http://bento.me/aiyu',
  }
};

const homeScreenData = {
  name: 'Ayaan Ansari',
  homeRoles: ['Android Developer', 'Learner'],
  githubLink: "https://github.com/aiyu-ayaan",
  codeSnippets: [
    'Hi all.',
    'I am Ayaan Ansari,',
    'an Software Engineer',
    'and a Learner.',
    'complete the game to continue',
    'find my profile on Github:',
  ]
};

const projectsData = {
  roles: ['A collection of my work', 'Click on a project to learn more'],
  projects: [
    {
      name:'Neon Cyberpunk',
      techStack: ['JavaScript', 'VS Code Theme', 'JSON'],
      year: '2025',
      status: 'Done',
      projectType: 'theme',
      description: 'A dark, vibrant, and futuristic theme for Visual Studio Code, inspired by the neon-drenched streets and high-tech aesthetics of the cyberpunk genre.',
      codeLink: 'https://marketplace.visualstudio.com/items?itemName=AiyuAyaan.neon-cyberpunk',
    },
    {
      name: 'BetweenUs-Server',
      techStack: ['Kotlin', 'Ktor', 'Exposed', 'MySql', 'MongoDB', 'JWT', 'Docker'],
      year: '2025',
      status: 'Working',
      projectType: 'application',
      description: 'BetweenUsServer is the backend powering the chat application. It is built with a modern technology stack to ensure scalability, reliability, and maintainability. The server handles user authentication, real-time messaging, and data storage, providing a seamless experience for users across multiple platforms.',
      codeLink: 'https://github.com/Btw-Us/BetweenUsServer',
    },
    {
      name: 'Azure-Function-Start',
      techStack: ['C#', 'Azure Function', 'Gemini'],
      year: '2025',
      status: 'Done',
      projectType: 'application',
      description: 'A starter template for creating Azure Functions with C# and Gemini. This project provides a boilerplate code structure to quickly set up serverless functions on Microsoft Azure, enabling developers to focus on building features rather than configuration.',
      codeLink: 'https://github.com/aiyu-ayaan/Azure-Function-Start',
    },
    {
      name: 'ExpenseSync',
      techStack: ['Kotlin', 'Jetpack Compose', 'Firebase', 'Koin', 'MVVM'],
      year: '2025',
      status: 'Done',
      projectType: 'application',
      description: 'Engineered a scalable, testable application that cut data sync delays by 75% and boosted multi-device usage by 45% through real-time Firebase sync and QR-based desktop authentication.',
      codeLink: 'https://github.com/aiyu-ayaan/ExpenseSync',
    },
    {
      name: 'Research Hub',
      techStack: ['Kotlin Multiplatform', 'Compose', 'Koin', 'Retrofit'],
      year: '2024',
      status: 'Done',
      projectType: 'application',
      description: 'A cross-platform research collaboration tool that increased team productivity by 30%. Implemented Kotlin Multiplatform for shared business logic between Android and Desktop platforms. Utilized Kotlin Flow and Coroutines for reactive state management and asynchronous operations. Integrated push notifications with Firebase Cloud Messaging, improving user engagement by 40%.',
      codeLink: 'https://github.com/ResearchHub24/Research-Hub-KMP',
    },
    {
      name: 'Gemini CLI',
      techStack: ['Python', 'Google Gemini API', 'YouTube API', 'PDF Processing'],
      year: '2024',
      status: 'Done',
      projectType: 'application',
      description: 'A Python-based command-line interface for Google\'s Gemini AI featuring text generation, YouTube video summarization, and PDF content extraction. Supports customizable word limits, document export to DOCX format, and page-specific PDF processing with an intuitive argument-based interface.',
      codeLink: 'https://github.com/aiyu-ayaan/Gemini-CLI',
    },
    {
      name: 'Gemini-in-Alexa',
      techStack: ['JavaScript', 'Node.js', 'Alexa Skills Kit', 'AWS Lambda', 'Gemini API'],
      year: '2024',
      status: 'Done',
      projectType: 'skill',
      description: 'Custom Alexa skill that connects to the Gemini API. Features include automatic setup with modelconfig.json and API key management via config.js. Allows users to interact with Google\'s Gemini AI through voice commands on Alexa devices.',
      codeLink: 'https://github.com/aiyu-ayaan/Gemini-in-Alexa',
    },
    {
      name: 'BIT App',
      image: 'https://aiyu-ayaan.github.io/BIT-App/assets/poster.png',
      techStack: ['Android', 'Kotlin', 'Firebase', 'MVVM'],
      year: '2022 - 2025',
      status: 'Done',
      projectType: 'application',
      description: 'An app used by 1000+ university students with a 4.7/5 rating on the Google Play Store. Utilized WorkManager for background tasks and Room for local data storage. Implemented a custom analytics dashboard to monitor usage patterns and inform feature development.',
      codeLink: 'https://github.com/aiyu-ayaan/BIT-App',
    },
    {
      name: 'TTS-Engine',
      techStack: ['Android Library', 'Kotlin'],
      year: '2023',
      status: 'Done',
      projectType: 'library',
      description: 'An Android library for Text-to-Speech with real-time text highlighting and lifecycle-aware functionality. Published to JitPack with 500+ downloads and integration in 5+ production applications.',
      codeLink: 'https://github.com/aiyu-ayaan/tts-engine',
    },
    {
      name: 'Weather-App-Android',
      techStack: ['Kotlin', 'Android', 'Retrofit', 'MVVM', 'Weather API', 'Location Services'],
      year: '2023',
      status: 'Done',
      projectType: 'application',
      description: 'Modern Android weather application with real-time weather data, location-based forecasts, and beautiful Material Design UI. Features current weather conditions, 7-day forecast, and detailed weather metrics.',
      codeLink: 'https://github.com/aiyu-ayaan/Weather-App-Android',
    }
  ]
};

const siteData = {
  socials: [
    {
      name: 'GitHub',
      url: 'https://github.com/aiyu-ayaan',
      icon: 'FaGithub',
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/aiyu/',
      icon: 'FaLinkedin',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/aiyu.dev_/',
      icon: 'FaInstagram',
    },
    {
      name: 'Email',
      url: 'mailto:aiyu.ayaan@gmail.com',
      icon: 'FaEnvelope',
    },
  ]
};

async function authenticateAdmin() {
  try {
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    console.log('✅ Authenticated as admin');
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.message);
    throw error;
  }
}

async function createCollection(collectionName, schema) {
  try {
    // Check if collection exists
    try {
      await pb.collections.getOne(collectionName);
      console.log(`ℹ️  Collection '${collectionName}' already exists`);
      return;
    } catch (e) {
      // Collection doesn't exist, create it
    }

    await pb.collections.create({
      name: collectionName,
      type: 'base',
      schema: schema,
      listRule: '',  // Public read access
      viewRule: '',  // Public read access
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    console.log(`✅ Created collection: ${collectionName}`);
  } catch (error) {
    console.error(`❌ Failed to create collection ${collectionName}:`, error.message);
    throw error;
  }
}

async function upsertRecord(collectionName, data, identifier = 'key') {
  try {
    // Try to find existing record
    let existingRecord = null;
    try {
      const records = await pb.collection(collectionName).getFullList();
      existingRecord = records.find(r => r[identifier] === data[identifier]);
    } catch (e) {
      // No existing records
    }

    if (existingRecord) {
      await pb.collection(collectionName).update(existingRecord.id, data);
      console.log(`✅ Updated ${collectionName}: ${data[identifier]}`);
    } else {
      await pb.collection(collectionName).create(data);
      console.log(`✅ Created ${collectionName}: ${data[identifier]}`);
    }
  } catch (error) {
    console.error(`❌ Failed to upsert ${collectionName}:`, error.message);
    throw error;
  }
}

async function setupCollections() {
  console.log('\n📦 Setting up collections...');

  // Portfolio Settings collection (for single-record configurations)
  await createCollection('portfolio_settings', [
    { name: 'key', type: 'text', required: true, options: { max: 255 } },
    { name: 'data', type: 'json', required: true },
  ]);

  // Projects collection
  await createCollection('projects', [
    { name: 'name', type: 'text', required: true, options: { max: 255 } },
    { name: 'techStack', type: 'json', required: true },
    { name: 'year', type: 'text', required: true, options: { max: 50 } },
    { name: 'status', type: 'text', required: true, options: { max: 50 } },
    { name: 'projectType', type: 'text', required: true, options: { max: 50 } },
    { name: 'description', type: 'text', required: true, options: { max: 2000 } },
    { name: 'codeLink', type: 'url', required: true },
    { name: 'image', type: 'url', required: false },
  ]);
}

async function migrateData() {
  console.log('\n📊 Migrating data...');

  // Migrate settings data
  await upsertRecord('portfolio_settings', { key: 'about', data: aboutData });
  await upsertRecord('portfolio_settings', { key: 'header', data: headerData });
  await upsertRecord('portfolio_settings', { key: 'homeScreen', data: homeScreenData });
  await upsertRecord('portfolio_settings', { key: 'projectsRoles', data: { roles: projectsData.roles } });
  await upsertRecord('portfolio_settings', { key: 'site', data: siteData });

  // Migrate projects
  for (const project of projectsData.projects) {
    await upsertRecord('projects', project, 'name');
  }
}

async function main() {
  console.log('🚀 Starting PocketBase migration...\n');

  try {
    await authenticateAdmin();
    await setupCollections();
    await migrateData();
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
