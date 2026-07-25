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

const buildAiOverviewMarkdown = () => {
  return `# AI Hub & Intelligent Systems Overview

> **"Building with intelligence."**
> A living map of how I design, ship, and run AI-powered software — the stacks I trust, the credits I mine, and the prompts I reach for.

## Core Technical Focus Areas
- ⚡ **RAG Pipelines**: Retrieval-Augmented Generation with vector embeddings and grounded citation.
- 🤖 **Multi-Agent Orchestration**: Coordinating autonomous specialized agents with task breakdown and verification.
- 🎯 **Prompt Engineering**: System prompt architecture, few-shot prompting, and strict output schemas.
- 🔌 **MCP Servers**: Model Context Protocol integration for connecting LLMs to custom tools and databases.
- ⚙️ **Fine-Tuning & Quantization**: Adapting open models for localized, domain-specific inference.

## Telemetry & Infrastructure
- **API Proxy**: Next.js Server Actions with cached telemetry logging.
- **Provider Gateways**: Groq Cloud, OpenRouter, Google AI Studio, and Ollama local daemon.
- **Status**: Live Production & Continuous Beta Testing.

Click **Open Page** to open the interactive AI Hub on the web (\`/v2/ai\`).
`;
};

const buildAiSkillsMarkdown = () => {
  return `# AI Agent Skills & Specializations

A catalog of agent capabilities and skills configured for autonomous workflows.

## 🎨 Motion & Animation
- **GSAP Core**: Framework-agnostic JavaScript animation — tweens, easing, stagger, and reduced-motion aware timelines.
- **GSAP for React**: \`useGSAP\` hook with refs, context, and automatic cleanup inside React and Next.js.
- **ScrollTrigger**: Scroll-linked animation: pinning, scrub, parallax, and trigger-driven reveals.

## 📐 Design & Visualization
- **UI/UX Pro Max**: Design intelligence across 67 styles, 96 palettes, and font pairings to plan and review interfaces.
- **Data Viz**: Accessible, system-consistent charts and dashboards reading cleanly in light and dark mode.
- **Artifact Design**: Design fundamentals for self-contained, theme-aware web artifacts.

## ⚡ Engineering & Performance
- **Architecture Patterns**: Structural guidance for organizing code, boundaries, and data flow.
- **Web Performance**: Bundle, render, and runtime optimization to keep pages fast across device tiers.
- **SQL Query Optimization**: Rewriting slow queries, indexing, and query plans for database access.

## 🛠️ Workflow & Review
- **Code Review**: Automated code diff analysis for correctness, security, and performance.
- **Verify**: End-to-end observation of real behavior before shipping code.
- **Run**: Automated app execution to confirm changes in production environments.
`;
};

const buildRecommendedStackMarkdown = () => {
  return `# Recommended AI Stack & Tools

Production-tested AI tools, model gateways, and generative UI frameworks.

## 🚀 Model Providers & Gateways
1. **Groq Cloud** (Rating: ⭐⭐⭐⭐⭐)
   - *Blurb*: Absurdly fast inference for open models (Llama 3, Mixtral). When latency is critical, nothing else comes close on free tier.
   - *Tags*: \`low-latency\`, \`free-tier\`, \`open-source\`

2. **OpenRouter** (Rating: ⭐⭐⭐⭐⭐)
   - *Blurb*: One API key for every major LLM provider. Ideal for A/B-testing models without rewriting client code.
   - *Tags*: \`gateway\`, \`multi-model\`, \`cheap-api\`

3. **Ollama** (Rating: ⭐⭐⭐⭐)
   - *Blurb*: Local models running with a single CLI command. My default for private prototyping and zero-cost iteration.
   - *Tags*: \`local\`, \`private\`, \`open-source\`

4. **v0.dev** (Rating: ⭐⭐⭐⭐)
   - *Blurb*: Generative UI framework outputting clean React + Tailwind CSS components natively.
   - *Tags*: \`generative-ui\`, \`react\`, \`prototyping\`
`;
};

const buildFreeCreditsMarkdown = () => {
  return `# Free AI Credits & Free Tiers Guide

Where to obtain real AI model inference without adding a credit card.

| Provider | Offer Summary | Requirements | Highlights |
|---|---|---|---|
| **Google AI Studio** | Gemini 2.0 Flash / Flash-Lite with high daily quota | No Card Required | Best free-to-quality ratio |
| **Groq Cloud** | Free Llama 3 & Mixtral at record token speed | No Card Required | Fastest tokens/sec at $0 |
| **OpenRouter** | Free variants of select models (\`:free\` suffix) | No Card Required | Unified multi-provider access |
| **GitHub Models** | GPT-4o, Claude, Llama 3 inference under GitHub account | No Card Required | Great for developer PAT testing |
| **Hugging Face** | Serverless Inference API + community Spaces | No Card Required | Enormous model catalog |
`;
};

const buildPromptLibraryMarkdown = () => {
  return `# Production System Prompt Library

A curated collection of system prompts ready for deployment.

---

### 1. TypeScript Agent Developer
**Role**: Engineering  
\`\`\`text
You are a senior TypeScript engineer. Write strictly-typed, production-grade code with no \`any\`. Prefer composition over inheritance, small pure functions, and exhaustive error handling. Explain trade-offs briefly, then output the final code in a single block.
\`\`\`

---

### 2. SEO Blog Outline Generator
**Role**: Content & SEO  
\`\`\`text
Act as an SEO strategist. Given a topic, produce a search-intent-driven outline: one H1, 5–7 H2 sections with target keywords, an FAQ block sourced from People-Also-Ask patterns, and a meta description under 155 characters. Prioritize clarity over keyword stuffing.
\`\`\`

---

### 3. Grounded RAG Answerer
**Role**: Information Retrieval  
\`\`\`text
Answer ONLY from the provided <context>. If the context is insufficient, say so explicitly — never fabricate. Cite the source id in [brackets] after each claim. Keep answers concise and structured.
\`\`\`
`;
};

const buildAppsMarkdown = () => {
  return `# Aiyu OS Applications Suite\n\nA comprehensive list of built-in web desktop applications available in Aiyu OS.\n\n## Suite Overview\n- 📁 **File Explorer**: Hierarchical file manager supporting picture galleries, blogs, and folder navigation.\n- 💻 **Code Editor**: Feature-packed browser IDE with syntax highlighting and live execution preview.\n- ⚡ **Terminal**: PowerShell simulator supporting interactive shell commands (\`help\`, \`ls\`, \`cat\`, \`whoami\`, \`open\`).\n- 🖼️ **Photos Gallery**: HD lightbox photo viewer with zoom and aspect controls.\n- 📝 **Notepad**: Fast text editor with line numbers, word wrap, and export functionality.\n- 📊 **Task Manager**: Real-time process monitoring, memory allocation, and window management.\n- 🎨 **Whiteboard**: Canvas drawing tool with brush, highlighter, and PNG download.\n- 𝚺 **Calculator**: Math calculator with expression evaluation and history log.\n`;
};

const buildHelloMarkdown = () => {
  return `# Hello World - Welcome to Aiyu OS\n\nHello and welcome! I am **${name}**, software developer and web craftsman.\n\n## Quick Navigation Folders\n- 📁 **about**: Detailed biography, experience, and skill tree.\n- 🤖 **ai**: Interactive AI Assistant & LLM Hub.\n- 📄 **resume**: Full professional resume & CV.\n- 🚀 **projects**: Highlighted projects portfolio.\n- 📱 **apps**: Interactive web applications suite.\n- ✍️ **blogs**: Engineering posts and articles.\n\nEnjoy exploring the interactive desktop!\n`;
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
    description: 'AI Hub, Agent Skills, Prompts & Free Credits',
    files: [
      {
        _id: 'file-ai-overview',
        slug: 'ai-overview',
        title: 'ai-overview',
        fileName: 'ai-overview.md',
        route: '/v2/ai',
        category: 'ai',
        date: 'BETA Feature',
        readingTime: 2,
        excerpt: 'AI Hub overview, RAG pipelines, multi-agent orchestration, and live telemetry.',
        content: buildAiOverviewMarkdown(),
      },
      {
        _id: 'file-ai-skills',
        slug: 'ai-skills',
        title: 'ai-skills',
        fileName: 'ai-skills.md',
        route: '/v2/ai/skills',
        category: 'ai',
        date: 'Agent Skills',
        readingTime: 3,
        excerpt: 'Catalog of AI agent skills across Motion, Design, Engineering, and Workflow.',
        content: buildAiSkillsMarkdown(),
      },
      {
        _id: 'file-recommended-stack',
        slug: 'recommended-stack',
        title: 'recommended-stack',
        fileName: 'recommended-stack.md',
        route: '/v2/ai/recommendations',
        category: 'ai',
        date: 'Stack Guide',
        readingTime: 2,
        excerpt: 'Production-tested AI tools (Groq, OpenRouter, Ollama, v0.dev) with ratings.',
        content: buildRecommendedStackMarkdown(),
      },
      {
        _id: 'file-free-credits',
        slug: 'free-credits',
        title: 'free-credits',
        fileName: 'free-credits.md',
        route: '/v2/ai/credits',
        category: 'ai',
        date: 'Free Inference',
        readingTime: 2,
        excerpt: 'Guide to free AI inference tiers and API keys (Google AI Studio, Groq Cloud, GitHub Models).',
        content: buildFreeCreditsMarkdown(),
      },
      {
        _id: 'file-prompt-library',
        slug: 'prompt-library',
        title: 'prompt-library',
        fileName: 'prompt-library.md',
        route: '/v2/ai/prompts',
        category: 'ai',
        date: 'Prompts',
        readingTime: 3,
        excerpt: 'Production system prompts for TypeScript engineering, SEO outlines, and grounded RAG.',
        content: buildPromptLibraryMarkdown(),
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
