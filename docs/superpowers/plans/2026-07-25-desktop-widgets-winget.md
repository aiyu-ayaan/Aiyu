# Desktop Widgets Board & Winget Package Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Windows 11 style Widgets Board and Winget Package Manager integrated into the left side of `/desktop` taskbar with staggered masonry layout, pagination, category filtering, and conventional commits.

**Architecture:** A left-sliding glassmorphic panel in `WidgetsPanel.js` triggered by a new Widgets icon on the left side of `Taskbar.js`. Includes `WidgetsFeed.js` (staggered 2-column masonry grid with pagination controls) and `WingetPanel.js` (interactive terminal & package manager), driven by curated data in `widgetItems.js`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Lucide React icons, Framer Motion.

## Global Constraints

- Preserve all existing desktop window & app launcher behavior.
- Maintain responsive glassmorphism aesthetic matching Windows 11 dark mode (`bg-[#1c1c1f]/85 backdrop-blur-2xl border-r border-white/10`).
- Execute conventional git commits at each completed stage.
- Zero broken imports or lint errors (`npm run lint`).

---

### Task 1: Widget Items Data & Widgets Icon Component

**Files:**
- Create: `src/app/components/desktop/widgets/data/widgetItems.js`
- Modify: `src/app/components/desktop/icons.js`

**Interfaces:**
- Produces: `WIDGET_ITEMS` array containing typed content items (`type: 'image' | 'blog' | 'app' | 'project' | 'skill'`) and `WidgetsIcon` React component.

- [ ] **Step 1: Add WidgetsIcon to `icons.js`**

Add the Windows 11 split-rectangle SVG icon to `src/app/components/desktop/icons.js`:

```javascript
export function WidgetsIcon(props) {
    return (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <rect x="2" y="2" width="28" height="28" rx="4" fill="#2563EB" />
            <rect x="5" y="5" width="10" height="22" rx="2" fill="#FFFFFF" />
            <rect x="17" y="5" width="10" height="10" rx="2" fill="#60A5FA" />
            <rect x="17" y="17" width="10" height="10" rx="2" fill="#93C5FD" />
        </svg>
    );
}
```

- [ ] **Step 2: Create `widgetItems.js` with rich data stream**

Create `src/app/components/desktop/widgets/data/widgetItems.js` with structured items covering images, blogs, apps, projects, and AI skills:

```javascript
export const WIDGET_ITEMS = [
    {
        id: 'img-1',
        type: 'image',
        category: 'Images',
        title: 'Aurora Borealis Night',
        src: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=800&auto=format&fit=crop',
        description: 'Vibrant blue and green neon skies over snowy peaks.',
        appKey: 'photos',
        badge: 'Photo',
    },
    {
        id: 'skill-1',
        type: 'skill',
        category: 'AI Skills',
        title: 'AI Pair Programming & Agentic Workflows',
        description: 'Multi-agent orchestration, tool usage, context management, and systematic code generation.',
        level: 'Expert',
        icon: 'Bot',
        tags: ['Agents', 'LLM', 'CodeGraph', 'MCP'],
    },
    {
        id: 'blog-1',
        type: 'blog',
        category: 'Blogs',
        title: 'Building Next-Gen OS Interfaces with Next.js 16 & React 19',
        excerpt: 'How we achieved desktop-grade performance and fluid window management on the web.',
        date: '2026-07-20',
        author: 'Aiyu',
        readTime: '4 min read',
        appKey: 'browser',
        url: '/blogs',
    },
    {
        id: 'app-1',
        type: 'app',
        category: 'Apps',
        title: 'Visual Studio Code',
        description: 'Web-based source code editor with multi-file tabs and syntax highlighting.',
        appKey: 'code',
        icon: 'Code',
    },
    {
        id: 'proj-1',
        type: 'project',
        category: 'Projects',
        title: 'Aiyu Portfolio OS',
        description: 'Fullstack Windows 11 style portfolio powered by PostgreSQL, Prisma & Framer Motion.',
        techStack: ['Next.js 16', 'React 19', 'Tailwind 4', 'Prisma'],
        status: 'Active',
        appKey: 'github',
    },
    {
        id: 'img-2',
        type: 'image',
        category: 'Images',
        title: 'Cyberpunk Metropolis',
        src: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
        description: 'Futuristic city lights in deep rain reflections.',
        appKey: 'photos',
        badge: 'Wallpaper',
    },
    {
        id: 'skill-2',
        type: 'skill',
        category: 'AI Skills',
        title: 'Fullstack Next.js & Server Actions',
        description: 'App Router architecture, React Server Components, streaming SSR & API routes.',
        level: 'Advanced',
        icon: 'Cpu',
        tags: ['Next.js 16', 'React 19', 'SSR'],
    },
    {
        id: 'app-2',
        type: 'app',
        category: 'Apps',
        title: 'Terminal & CLI',
        description: 'Interactive powershell style terminal supporting commands and script execution.',
        appKey: 'terminal',
        icon: 'Terminal',
    },
    {
        id: 'blog-2',
        type: 'blog',
        category: 'Blogs',
        title: 'Mastering GSAP Motion & Glassmorphism Aesthetics',
        excerpt: 'Crafting ultra-smooth 60fps micro-animations and translucent material UI components.',
        date: '2026-07-15',
        author: 'Aiyu',
        readTime: '6 min read',
        appKey: 'browser',
        url: '/blogs',
    },
    {
        id: 'proj-2',
        type: 'project',
        category: 'Projects',
        title: 'Neural Vision Analyzer',
        description: 'AI-driven computer vision app analyzing photo compositions and spatial metadata.',
        techStack: ['Python', 'OpenCV', 'TensorFlow', 'React'],
        status: 'Completed',
        appKey: 'browser',
    },
    {
        id: 'skill-3',
        type: 'skill',
        category: 'AI Skills',
        title: 'High Performance UI & Framer Motion',
        description: 'GPU-accelerated layout transitions, spring physics, and physical drag responsiveness.',
        level: 'Expert',
        icon: 'Zap',
        tags: ['Framer Motion', 'Tailwind 4', 'CSS GPU'],
    },
    {
        id: 'app-3',
        type: 'app',
        category: 'Apps',
        title: 'File Explorer',
        description: 'Browse virtual system files, images, documents, and system configuration.',
        appKey: 'explorer',
        icon: 'Folder',
    },
];

export const CATEGORIES = ['All', 'Images', 'Blogs', 'Apps', 'Projects', 'AI Skills'];
```

---

### Task 2: Left Taskbar Button & Desktop Panel State

**Files:**
- Modify: `src/app/components/desktop/Taskbar.js`
- Modify: `src/app/components/desktop/Desktop.js`
- Create: `src/app/components/desktop/WidgetsPanel.js`

**Interfaces:**
- Consumes: `WidgetsIcon` from `./icons.js`, `onToggleWidgets` prop in `Taskbar.js`.
- Produces: Left-aligned Widgets button on taskbar and sliding drawer shell.

- [ ] **Step 1: Update `Taskbar.js`**

In `src/app/components/desktop/Taskbar.js`, import `WidgetsIcon` and replace the left `<div className="w-40" />` spacer with:

```javascript
{/* Left cluster: Widgets button */}
<div className="flex w-40 items-center justify-start pl-1">
    <button
        onClick={onToggleWidgets}
        className={`flex h-10 items-center gap-2 rounded-md px-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
            widgetsOpen ? 'bg-black/5 dark:bg-white/10' : ''
        }`}
        aria-label="Widgets & Winget"
        title="Widgets & Winget (Left Side)"
    >
        <WidgetsIcon className="h-5 w-5 drop-shadow-sm" />
        <span className="hidden text-xs font-medium opacity-80 sm:inline">Widgets</span>
    </button>
</div>
```

- [ ] **Step 2: Create `WidgetsPanel.js` Drawer Shell**

Create `src/app/components/desktop/WidgetsPanel.js` with sliding animation and dual-tab container (`❖ Widgets Feed` / `📦 Winget CLI`):

```javascript
"use client";
import React, { useState } from 'react';
import { X, LayoutGrid, Box } from 'lucide-react';
import WidgetsFeed from './widgets/WidgetsFeed';
import WingetPanel from './widgets/WingetPanel';

export default function WidgetsPanel({ open, onClose, openApp }) {
    const [tab, setTab] = useState('feed'); // 'feed' | 'winget'

    if (!open) return null;

    return (
        <div
            className="fixed bottom-12 left-0 top-0 z-40 flex w-full max-w-[460px] flex-col border-r border-white/15 bg-[#161618]/90 text-white shadow-2xl backdrop-blur-2xl transition-all duration-300 dark:bg-[#121214]/95"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30">
                        {tab === 'feed' ? <LayoutGrid className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold leading-none">
                            {tab === 'feed' ? 'Widgets Board' : 'Winget Package Manager'}
                        </h2>
                        <p className="text-[11px] text-neutral-400">Aiyu OS Desktop Center</p>
                    </div>
                </div>

                {/* Tab Pill Switcher */}
                <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1 text-xs">
                    <button
                        onClick={() => setTab('feed')}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
                            tab === 'feed' ? 'bg-blue-600 font-medium text-white shadow' : 'text-neutral-300 hover:text-white'
                        }`}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>Feed</span>
                    </button>
                    <button
                        onClick={() => setTab('winget')}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
                            tab === 'winget' ? 'bg-blue-600 font-medium text-white shadow' : 'text-neutral-300 hover:text-white'
                        }`}
                    >
                        <Box className="h-3.5 w-3.5" />
                        <span>Winget</span>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-3">
                {tab === 'feed' ? <WidgetsFeed openApp={openApp} /> : <WingetPanel openApp={openApp} />}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Update `Desktop.js` to manage `widgetsOpen` state**

In `src/app/components/desktop/Desktop.js`, add `widgetsOpen` state, pass to `Taskbar`, and render `WidgetsPanel`:

```javascript
const [widgetsOpen, setWidgetsOpen] = useState(false);

// inside return:
<WidgetsPanel open={widgetsOpen} onClose={() => setWidgetsOpen(false)} openApp={openApp} />
<Taskbar
    apps={apps}
    windows={windows}
    activeId={activeId}
    startOpen={startOpen}
    widgetsOpen={widgetsOpen}
    onToggleWidgets={() => setWidgetsOpen((v) => !v)}
    onStart={() => setStartOpen((v) => !v)}
    onOpen={openApp}
    onTaskClick={taskClick}
/>
```

- [ ] **Step 4: Commit Stage 1**

```bash
git add src/app/components/desktop/icons.js src/app/components/desktop/Taskbar.js src/app/components/desktop/Desktop.js src/app/components/desktop/WidgetsPanel.js src/app/components/desktop/widgets/
git commit -m "feat(desktop): add left taskbar widget button and slide-out panel shell"
```

---

### Task 3: Staggered Masonry Layout, Filtering & Pagination (`WidgetsFeed.js`)

**Files:**
- Create: `src/app/components/desktop/widgets/WidgetsFeed.js`

**Interfaces:**
- Consumes: `WIDGET_ITEMS`, `CATEGORIES` from `./data/widgetItems.js`, `openApp` callback.
- Produces: Paginated 2-column masonry grid with category filter pills and pagination bar.

- [ ] **Step 1: Implement `WidgetsFeed.js`**

Create `src/app/components/desktop/widgets/WidgetsFeed.js`:

```javascript
"use client";
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Bot, Cpu, Zap, Code, Terminal, Folder } from 'lucide-react';
import { WIDGET_ITEMS, CATEGORIES } from './data/widgetItems';

const ITEMS_PER_PAGE = 6;

const ICON_MAP = { Bot, Cpu, Zap, Code, Terminal, Folder };

export default function WidgetsFeed({ openApp }) {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [page, setPage] = useState(1);

    const filteredItems = useMemo(() => {
        if (selectedCategory === 'All') return WIDGET_ITEMS;
        return WIDGET_ITEMS.filter((item) => item.category === selectedCategory);
    }, [selectedCategory]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredItems, currentPage]);

    const handleCategoryChange = (cat) => {
        setSelectedCategory(cat);
        setPage(1);
    };

    return (
        <div className="flex flex-col gap-3 h-full">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`whitespace-nowrap rounded-full px-3 py-1 transition-all ${
                            selectedCategory === cat
                                ? 'bg-blue-600 text-white font-medium shadow-sm'
                                : 'bg-white/10 text-neutral-300 hover:bg-white/15 hover:text-white'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Staggered 2-Column Masonry Grid */}
            <div className="grid grid-cols-2 gap-3 items-start flex-1">
                {currentItems.map((item) => (
                    <WidgetCard key={item.id} item={item} openApp={openApp} />
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-neutral-300">
                <span className="text-[11px] text-neutral-400">
                    Showing {currentItems.length} of {filteredItems.length} items
                </span>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
                        aria-label="Previous Page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setPage(idx + 1)}
                                className={`h-2 rounded-full transition-all ${
                                    currentPage === idx + 1 ? 'w-4 bg-blue-500' : 'w-2 bg-white/30 hover:bg-white/50'
                                }`}
                                aria-label={`Page ${idx + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
                        aria-label="Next Page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function WidgetCard({ item, openApp }) {
    switch (item.type) {
        case 'image':
            return (
                <div
                    onClick={() => openApp && openApp('photos', { src: item.src })}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2 transition-all hover:bg-white/10 hover:border-blue-500/40 hover:shadow-lg"
                >
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                        <img src={item.src} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-md">
                            {item.badge}
                        </span>
                    </div>
                    <div className="mt-2 px-0.5">
                        <h4 className="text-xs font-semibold leading-tight line-clamp-1 group-hover:text-blue-400">{item.title}</h4>
                        <p className="text-[10px] text-neutral-400 line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                </div>
            );

        case 'blog':
            return (
                <div
                    onClick={() => openApp && openApp('browser', { url: item.url })}
                    className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-blue-500/40 hover:shadow-lg flex flex-col justify-between min-h-[140px]"
                >
                    <div>
                        <div className="flex items-center justify-between text-[10px] text-blue-400 font-medium">
                            <span>{item.readTime}</span>
                            <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                        </div>
                        <h4 className="mt-1 text-xs font-semibold leading-snug line-clamp-2 group-hover:text-blue-300">{item.title}</h4>
                        <p className="mt-1 text-[10px] text-neutral-400 line-clamp-2">{item.excerpt}</p>
                    </div>
                    <span className="mt-2 text-[10px] text-neutral-500">{item.date}</span>
                </div>
            );

        case 'app': {
            const IconComponent = ICON_MAP[item.icon] || Code;
            return (
                <div
                    onClick={() => openApp && openApp(item.appKey)}
                    className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-blue-500/40 hover:shadow-lg flex items-start gap-2.5"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold leading-tight group-hover:text-blue-400">{item.title}</h4>
                        <p className="mt-0.5 text-[10px] text-neutral-400 line-clamp-2">{item.description}</p>
                    </div>
                </div>
            );
        }

        case 'project':
            return (
                <div
                    onClick={() => openApp && openApp(item.appKey || 'github')}
                    className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-blue-500/40 hover:shadow-lg flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-medium text-blue-400">{item.status}</span>
                        </div>
                        <h4 className="mt-1.5 text-xs font-semibold leading-tight group-hover:text-blue-300">{item.title}</h4>
                        <p className="mt-1 text-[10px] text-neutral-400 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                        {item.techStack.map((tech) => (
                            <span key={tech} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-neutral-300">
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            );

        case 'skill': {
            const IconComp = ICON_MAP[item.icon] || Zap;
            return (
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-3 transition-all hover:border-purple-500/40 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/20 text-purple-400">
                            <IconComp className="h-4 w-4" />
                        </div>
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-semibold text-purple-300">
                            {item.level}
                        </span>
                    </div>
                    <h4 className="mt-2 text-xs font-semibold text-white leading-tight">{item.title}</h4>
                    <p className="mt-1 text-[10px] text-neutral-400 leading-normal">{item.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.map((t) => (
                            <span key={t} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-neutral-300">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            );
        }

        default:
            return null;
    }
}
```

- [ ] **Step 2: Commit Stages 2 & 3**

```bash
git add src/app/components/desktop/widgets/WidgetsFeed.js
git commit -m "feat(desktop): implement staggered masonry widget feed with mixed content, category filters, and pagination"
```

---

### Task 4: Interactive Winget Terminal & Package Manager (`WingetPanel.js`)

**Files:**
- Create: `src/app/components/desktop/widgets/WingetPanel.js`

**Interfaces:**
- Consumes: `openApp` callback.
- Produces: Interactive Winget CLI command bar, preset tool cards, and progress terminal.

- [ ] **Step 1: Create `WingetPanel.js`**

Create `src/app/components/desktop/widgets/WingetPanel.js`:

```javascript
"use client";
import React, { useState } from 'react';
import { Search, Download, CheckCircle2, Terminal, Play, Package } from 'lucide-react';

const PACKAGES = [
    { id: 'git', name: 'Git for Windows', publisher: 'Git', version: '2.45.2', idName: 'Git.Git', category: 'Dev Tools' },
    { id: 'node', name: 'Node.js LTS', publisher: 'OpenJS Foundation', version: '22.4.0', idName: 'OpenJS.NodeJS.LTS', category: 'Runtime' },
    { id: 'vscode', name: 'Visual Studio Code', publisher: 'Microsoft', version: '1.91.1', idName: 'Microsoft.VisualStudioCode', category: 'IDE' },
    { id: 'next', name: 'Create Next App CLI', publisher: 'Vercel', version: '16.0.0', idName: 'Vercel.NextJS', category: 'Framework' },
    { id: 'prisma', name: 'Prisma CLI', publisher: 'Prisma', version: '6.2.0', idName: 'Prisma.PrismaCLI', category: 'ORM' },
    { id: 'docker', name: 'Docker Desktop', publisher: 'Docker', version: '4.32.0', idName: 'Docker.DockerDesktop', category: 'Containers' },
    { id: 'python', name: 'Python 3.12', publisher: 'Python Software Foundation', version: '3.12.4', idName: 'Python.Python.3.12', category: 'Language' },
];

export default function WingetPanel({ openApp }) {
    const [query, setQuery] = useState('');
    const [logs, setLogs] = useState([
        'Windows Package Manager v1.8.1911',
        'Type a package name or select a recommended package below.',
    ]);
    const [installing, setInstalling] = useState(null);
    const [progress, setProgress] = useState(0);
    const [installed, setInstalled] = useState(['git', 'node']);

    const filtered = PACKAGES.filter(
        (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.idName.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase())
    );

    const handleInstall = (pkg) => {
        if (installing) return;
        setInstalling(pkg.id);
        setProgress(10);
        setLogs((prev) => [
            ...prev,
            `> winget install --id ${pkg.idName} -e`,
            `Found ${pkg.name} [${pkg.idName}] Version ${pkg.version}`,
            `Downloading https://cdn.winget.microsoft.com/packages/${pkg.id}.msi...`,
        ]);

        let p = 10;
        const interval = setInterval(() => {
            p += 25;
            setProgress(Math.min(100, p));
            if (p >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setInstalling(null);
                    setInstalled((prev) => [...prev, pkg.id]);
                    setLogs((prev) => [
                        ...prev,
                        `[100%] Verification complete hash matches.`,
                        `Successfully installed ${pkg.name}!`,
                    ]);
                }, 400);
            }
        }, 300);
    };

    return (
        <div className="flex flex-col gap-3 h-full">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search packages (e.g. winget search git)..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-400 focus:border-blue-500 focus:outline-none"
                />
            </div>

            {/* Package Cards List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-1">
                {filtered.map((pkg) => {
                    const isInst = installed.includes(pkg.id);
                    const isCurrent = installing === pkg.id;

                    return (
                        <div
                            key={pkg.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors hover:bg-white/10"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                                    <Package className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-semibold text-white truncate">{pkg.name}</h4>
                                        <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] text-neutral-400">{pkg.version}</span>
                                    </div>
                                    <p className="text-[10px] text-neutral-400 truncate">{pkg.idName}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleInstall(pkg)}
                                disabled={isInst || isCurrent}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                                    isInst
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : isCurrent
                                        ? 'bg-blue-600 text-white animate-pulse'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow'
                                }`}
                            >
                                {isInst ? (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>Installed</span>
                                    </>
                                ) : isCurrent ? (
                                    <>
                                        <Download className="h-3.5 w-3.5 animate-bounce" />
                                        <span>{progress}%</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-3.5 w-3.5" />
                                        <span>Install</span>
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Interactive Terminal Output Window */}
            <div className="flex-1 flex flex-col rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-[11px] text-neutral-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 text-neutral-400">
                    <div className="flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-blue-400" />
                        <span className="font-semibold text-white">winget.exe CLI</span>
                    </div>
                    <button
                        onClick={() => openApp && openApp('terminal')}
                        className="flex items-center gap-1 hover:text-white transition-colors text-[10px]"
                    >
                        <span>Full Terminal</span>
                        <Play className="h-3 w-3" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 font-mono text-[10.5px]">
                    {logs.map((line, idx) => (
                        <div key={idx} className={line.startsWith('>') ? 'text-blue-400 font-bold' : line.includes('Successfully') ? 'text-emerald-400 font-bold' : 'text-neutral-300'}>
                            {line}
                        </div>
                    ))}
                </div>

                {installing && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                            <span>Downloading & Installing...</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit Stage 4**

```bash
git add src/app/components/desktop/widgets/WingetPanel.js
git commit -m "feat(desktop): implement interactive winget package manager tab in widget panel"
```

---

### Task 5: Polish & Lint Verification

**Files:**
- Modify: `src/app/components/desktop/WidgetsPanel.js`
- Test: `npm run lint`

- [ ] **Step 1: Run `npm run lint` and verify output**

Run: `npm run lint`
Expected: Zero lint errors.

- [ ] **Step 2: Final Integration Commit (Stage 5)**

```bash
git add -A
git commit -m "refactor(desktop): polish animations, responsiveness, and verify integration"
```
