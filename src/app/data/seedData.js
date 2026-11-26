/**
 * What a new, empty database starts with. The web build writes it to `seed.json` for the Rust server
 * (server/src/seed.rs).
 */
import projects from './projectsData.js';
import deployments from './deploymentsData.js';
import { name, roles, professionalSummary, skills, experiences, education, certifications } from './aboutData.js';
import { name as homeName, homeRoles, githubLink, codeSnippets } from './homeScreenData.js';
import { navLinks, contactLink } from './headerData.js';

const showcaseSection = {
    eyebrow: 'How I Work',
    headline: 'Focus areas, side to side.',
    description: 'Keep scrolling — this rail moves sideways with you, then hands you back to the page.',
    panels: [
        {
            title: 'Product Engineering',
            description: 'Turning fuzzy ideas into shipped features, with a bias for the user’s real friction.',
            icon: 'Laptop',
            accent: 'var(--accent-cyan)',
            tags: ['Next.js', 'React', 'TypeScript']
        },
        {
            title: 'Backend & APIs',
            description: 'Pragmatic services and data models that stay readable as the surface area grows.',
            icon: 'Server',
            accent: 'var(--accent-purple)',
            tags: ['Node', 'REST', 'Mongo']
        },
        {
            title: 'Interface Craft',
            description: 'Responsive, accessible UI that feels calm on desktop and quick on mobile.',
            icon: 'Mobile',
            accent: 'var(--accent-orange)',
            tags: ['Tailwind', 'Motion', 'A11y']
        },
        {
            title: 'Design Systems',
            description: 'Tokens, glass surfaces, and reusable primitives that keep a product coherent.',
            icon: 'PaintBrush',
            accent: 'var(--accent-pink)',
            tags: ['Theming', 'Tokens', 'GSAP']
        },
        {
            title: 'Performance',
            description: 'Measuring before tuning — lazy boundaries, device tiers, and smooth 60fps scroll.',
            icon: 'Rocket',
            accent: 'var(--accent-cyan)',
            tags: ['Lighthouse', 'k6', 'LOD']
        },
        {
            title: 'AI & Automation',
            description: 'Wiring models and tooling into workflows so the boring parts run themselves.',
            icon: 'Brain',
            accent: 'var(--accent-purple)',
            tags: ['LLMs', 'Agents', 'Tooling']
        }
    ]
};

// The robots rules of the original hardcoded robots.js.
const disallow = [
    '/admin', '/api/admin', '/api/auth/login', '/api/auth/logout',
    '/api/config', '/*.json$', '/*?', '/blog/', '/deployments/',
];

export const SEED = {
    projects,
    deployments,
    about: { name, roles, professionalSummary, skills, experiences, education, certifications },
    home: { name: homeName, homeRoles, githubLink, codeSnippets, showcaseSection },
    header: { navLinks, contactLink },
    socials: [
        { name: 'GitHub', url: 'https://github.com/aiyu-ayaan', iconName: 'FaGithub' },
        { name: 'LinkedIn', url: 'https://www.linkedin.com/in/aiyu/', iconName: 'FaLinkedin' },
        { name: 'Instagram', url: 'https://www.instagram.com/aiyu.dev_/', iconName: 'FaInstagram' },
        { name: 'Email', url: 'mailto:aiyu.ayaan@gmail.com', iconName: 'FaEnvelope' },
    ],
    config: { logoText: '< aiyu />', siteTitle: 'Aiyu', n8nWebhookUrl: '', resume: { type: 'url', value: '' } },
    seo: {
        robots: {
            rules: [
                { userAgent: '*', allow: ['/'], disallow, crawlDelay: 1 },
                { userAgent: 'Googlebot', allow: ['/'], disallow, crawlDelay: 0 },
            ],
            extraSitemaps: [],
            customAppend: '',
        },
        sitemap: { extraUrls: [], excludePaths: [], defaultPriorities: {} },
        indexing: { enabled: false },
    },
};
