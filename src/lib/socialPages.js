// Apart from socialMeta.js so the admin form can import it without pulling Prisma into the browser.

// Public pages an admin can override social metadata for. `key` is the logical
// (version-agnostic) path each page passes to applySocialOverrides.
export const SOCIAL_PAGES = [
    { key: '/', label: 'Home', hint: 'Landing / hero page' },
    { key: '/about-me', label: 'About', hint: 'Bio & skills' },
    { key: '/projects', label: 'Projects', hint: 'Portfolio archive' },
    { key: '/apps', label: 'Apps', hint: 'Hosted apps & services' },
    { key: '/gallery', label: 'Gallery', hint: 'Photos & certificates' },
    { key: '/github', label: 'GitHub', hint: 'Repo stats' },
    { key: '/contact-us', label: 'Contact', hint: 'Get in touch' },
    { key: '/ai', label: 'AI Hub', hint: 'The /ai showcase' },
];
