import { name, roles, professionalSummary, skills, experiences, education, certifications } from './aboutData';
import projects from './projectsData';

const buildAboutMarkdown = () => {
  const skillsList = skills.map((s) => `- **${s.name}**: ${s.level}% proficiency`).join('\n');
  const expList = experiences.map((e) => `### ${e.role} @ ${e.company}\n*${e.duration}*\n${e.description}\n`).join('\n');
  const eduList = education.map((ed) => `- **${ed.degree}** - ${ed.institution} (${ed.duration}) | CGPA: ${ed.cgpa}`).join('\n');
  const certList = certifications.map((c) => `- **${c.name}** (${c.issuer}, ${c.date})`).join('\n');

  return `# About ${name}\n\n**Roles**: ${roles.join(' | ')}\n\n## Professional Summary\n${professionalSummary}\n\n---\n\n## Work Experience\n${expList}\n\n---\n\n## Education\n${eduList}\n\n---\n\n## Certifications\n${certList}\n\n---\n\n## Technical Skills\n${skillsList}\n`;
};

const buildResumeMarkdown = () => {
  const expList = experiences.map((e) => `### ${e.role} - ${e.company} (${e.duration})\n${e.description}\n`).join('\n');
  const eduList = education.map((ed) => `- **${ed.degree}**, ${ed.institution} (${ed.duration}) - Grade: ${ed.cgpa}`).join('\n');
  const topSkills = skills.slice(0, 12).map((s) => s.name).join(', ');

  return `# ${name} - Resume & CV\n\n**Location**: India\n**Specialties**: Android Development, Full Stack Web Engineering, Reactive UIs\n\n---\n\n## Executive Summary\n${professionalSummary}\n\n---\n\n## Core Competencies\n${topSkills}\n\n---\n\n## Professional Experience\n${expList}\n\n---\n\n## Education\n${eduList}\n\n---\n\n## Key Achievements\n- Published **BIT App** on Google Play Store with 1000+ active users & 4.7★ rating.\n- Developed **TTS-Engine** Android library with 500+ downloads on JitPack.\n- Reduced process automation time by 40% using Dynamics 365 POC during Adrosonic internship.\n`;
};

const buildProjectsMarkdown = () => {
  const projectEntries = projects.map((p) => `### 🚀 ${p.name} (${p.year})\n**Status**: ${p.status} | **Type**: ${p.projectType}\n**Tech Stack**: ${p.techStack.join(', ')}\n\n${p.description}\n\n🔗 [View Repository / Link](${p.codeLink})\n`).join('\n---\n\n');

  return `# Engineering Projects & Showcase\n\nA collection of featured mobile apps, web backends, open-source libraries, and developer tools built by ${name}.\n\n---\n\n${projectEntries}`;
};

const buildAIMarkdown = () => {
  return `# AI Assistant & LLM Studio [BETA]\n\nAn intelligent conversational workspace integrated into Aiyu OS.\n\n## Capabilities & Features\n- **Multi-Model Orchestration**: Supports Gemini, OpenAI, Claude, and local LLM endpoints via Model Context Protocol (MCP).\n- **Automated Workflows**: Smart code generation, document summarization, refactoring, and natural language shell commands.\n- **Developer Tools**: Code execution, live context evaluation, and prompt engineering workspace.\n\n## System Specs\n- **Engine**: Next.js Server Actions + API Proxy\n- **Protocol**: MCP (Model Context Protocol) 1.0\n- **Status**: Active Beta\n`;
};

const buildAppsMarkdown = () => {
  return `# Aiyu OS Applications Suite\n\nA comprehensive list of built-in web desktop applications available in Aiyu OS.\n\n## Suite Overview\n- 📁 **File Explorer**: Hierarchical file manager supporting picture galleries, blogs, and folder navigation.\n- 💻 **Code Editor**: Feature-packed browser IDE with syntax highlighting and live execution preview.\n- ⚡ **Terminal**: PowerShell simulator supporting interactive shell commands (\`help\`, \`ls\`, \`cat\`, \`whoami\`, \`open\`).\n- 🖼️ **Photos Gallery**: HD lightbox photo viewer with zoom and aspect controls.\n- 📝 **Notepad**: Fast text editor with line numbers, word wrap, and export functionality.\n- 📊 **Task Manager**: Real-time process monitoring, memory allocation, and window management.\n- 🎨 **Whiteboard**: Canvas drawing tool with brush, highlighter, and PNG download.\n- 𝚺 **Calculator**: Math calculator with expression evaluation and history log.\n`;
};

const buildHelloMarkdown = () => {
  return `# Hello World - Welcome to Aiyu OS\n\nHello and welcome! I am **${name}**, software developer and web craftsman.\n\n## Quick Navigation Folders\n- 📁 **about**: Detailed biography, experience, and skill tree.\n- 🤖 **ai**: Interactive AI Assistant.\n- 📄 **resume**: Full professional resume & CV.\n- 🚀 **projects**: Highlighted projects portfolio.\n- 📱 **apps**: Interactive web applications suite.\n- ✍️ **blogs**: Engineering posts and articles.\n\nEnjoy exploring the interactive desktop!\n`;
};

const buildGithubMarkdown = () => {
  return `# GitHub Profile Overview\n\n**Username**: @aiyu-ayaan\n**URL**: https://github.com/aiyu-ayaan\n\n## Profile Summary\n- Active open source contributor with repositories spanning Android, Kotlin, Next.js, C#, and AI tools.\n- Top repositories include **BIT-App**, **ExpenseSync**, **Research-Hub-KMP**, **Gemini-CLI**, and **neon-cyberpunk**.\n`;
};

export const FOLDERS_DATA = [
  {
    folderKey: 'about',
    folderName: 'about',
    description: 'Bio, Skills, Experience & Education',
    files: [
      {
        _id: 'file-about-me',
        slug: 'about-me',
        title: 'about-me',
        fileName: 'about-me.md',
        route: '/about-me',
        category: 'about',
        date: 'Updated Recent',
        readingTime: 3,
        excerpt: 'Complete developer bio, work history at Adrosonic & BeyondSchool, skills tree, and education.',
        content: buildAboutMarkdown(),
      },
    ],
  },
  {
    folderKey: 'ai',
    folderName: 'ai',
    description: 'AI Assistant & LLM Capabilities',
    files: [
      {
        _id: 'file-ai-assistant',
        slug: 'ai',
        title: 'ai-assistant',
        fileName: 'ai-assistant.md',
        route: '/v2/ai',
        category: 'ai',
        date: 'BETA Feature',
        readingTime: 2,
        excerpt: 'AI Assistant overview, Model Context Protocol integration, and workspace features.',
        content: buildAIMarkdown(),
      },
    ],
  },
  {
    folderKey: 'resume',
    folderName: 'resume',
    description: 'Professional Resume & CV',
    files: [
      {
        _id: 'file-resume',
        slug: 'resume',
        title: 'resume',
        fileName: 'resume.md',
        route: '/resume.pdf',
        external: true,
        category: 'resume',
        date: 'PDF Document',
        readingTime: 2,
        excerpt: 'Full CV & resume details including technical achievements, roles, and education.',
        content: buildResumeMarkdown(),
      },
    ],
  },
  {
    folderKey: 'projects',
    folderName: 'projects',
    description: 'Showcase of 10+ Engineering Projects',
    files: [
      {
        _id: 'file-projects',
        slug: 'projects',
        title: 'projects-list',
        fileName: 'projects.md',
        route: '/projects',
        category: 'projects',
        date: '10 Projects',
        readingTime: 4,
        excerpt: 'Complete list of projects (ExpenseSync, BIT App, Gemini CLI, TTS Engine, etc.).',
        content: buildProjectsMarkdown(),
      },
    ],
  },
  {
    folderKey: 'apps',
    folderName: 'apps',
    description: 'Web Desktop Applications Suite',
    files: [
      {
        _id: 'file-apps',
        slug: 'apps',
        title: 'apps-suite',
        fileName: 'apps.md',
        route: '/apps',
        category: 'apps',
        date: 'Desktop Suite',
        readingTime: 2,
        excerpt: 'Overview of File Explorer, Terminal, Code Editor, Task Manager, Notepad, and Whiteboard.',
        content: buildAppsMarkdown(),
      },
    ],
  },
  {
    folderKey: 'hello',
    folderName: 'hello',
    description: 'Welcome & Introduction',
    files: [
      {
        _id: 'file-hello',
        slug: 'hello',
        title: 'hello-world',
        fileName: 'hello.md',
        route: '/',
        category: 'hello',
        date: 'Welcome',
        readingTime: 1,
        excerpt: 'Welcome introduction to Aiyu OS web desktop environment.',
        content: buildHelloMarkdown(),
      },
    ],
  },
  {
    folderKey: 'github',
    folderName: 'github',
    description: 'GitHub Repositories & Profile',
    files: [
      {
        _id: 'file-github',
        slug: 'github',
        title: 'github-profile',
        fileName: 'github.md',
        route: 'https://github.com/aiyu-ayaan',
        external: true,
        category: 'github',
        date: 'External Link',
        readingTime: 1,
        excerpt: 'GitHub repositories, open source contributions, and developer profile.',
        content: buildGithubMarkdown(),
      },
    ],
  },
];
