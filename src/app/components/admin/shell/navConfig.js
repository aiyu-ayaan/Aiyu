import {
    FaGaugeHigh, FaHouse, FaUser, FaBriefcase, FaPenNib, FaImages,
    FaHeading, FaShareNodes, FaEnvelope, FaPalette, FaGithub, FaSliders,
    FaDatabase, FaTerminal, FaRobot, FaServer, FaHardDrive, FaCode,
    FaGoogle, FaClock, FaBell, FaChartLine, FaMagnifyingGlass,
    FaShieldHalved, FaGauge, FaCodeBranch, FaPlug, FaWandMagicSparkles,
    FaGear, FaFileLines,
} from "react-icons/fa6";

/**
 * Single source of truth for the admin navigation.
 *
 * Consumed by both the persistent sidebar drawer (AdminSidebar) and the
 * dashboard landing page (AdminDashboard), so the two never drift apart.
 * Each group renders as a labelled section in the drawer; each item carries a
 * Tailwind `accent` (text/border colour token) used for icons, hovers and the
 * dashboard cards.
 */
export const NAV_GROUPS = [
    {
        id: "overview",
        label: "Overview",
        items: [
            { label: "Dashboard", description: "At-a-glance overview", icon: FaGaugeHigh, path: "/admin", accent: "cyan", exact: true },
        ],
    },
    {
        id: "content",
        label: "Content",
        items: [
            { label: "Home", description: "Hero & intro", icon: FaHouse, path: "/admin/home", accent: "purple" },
            { label: "About", description: "Bio & skills", icon: FaUser, path: "/admin/about", accent: "green" },
            { label: "Projects", description: "Portfolio items", icon: FaBriefcase, path: "/admin/projects", accent: "blue" },
            { label: "Apps", description: "Hosted apps & services", icon: FaServer, path: "/admin/apps", accent: "cyan" },
            { label: "Blogs", description: "Articles & posts", icon: FaPenNib, path: "/admin/blogs", accent: "teal" },
            { label: "Gallery", description: "Photos & certificates", icon: FaImages, path: "/admin/gallery", accent: "indigo" },
            { label: "AI Hub", description: "The /ai showcase page", icon: FaWandMagicSparkles, path: "/admin/ai-page", accent: "fuchsia" },
            { label: "Resume Studio", description: "LaTeX resume editor", icon: FaFileLines, path: "/admin/resume", accent: "amber" },
        ],
    },
    {
        id: "structure",
        label: "Site Structure",
        items: [
            { label: "Header", description: "Nav & logo", icon: FaHeading, path: "/admin/header", accent: "orange" },
            { label: "Footer", description: "Links & profiles", icon: FaShareNodes, path: "/admin/footer", accent: "pink" },
            { label: "Contact", description: "Messages & info", icon: FaEnvelope, path: "/admin/contact", accent: "red" },
        ],
    },
    {
        id: "appearance",
        label: "Appearance",
        items: [
            { label: "Themes", description: "Colors & style", icon: FaPalette, path: "/admin/themes", accent: "violet" },
            { label: "Terminal", description: "CLI appearance", icon: FaTerminal, path: "/admin/terminal", accent: "amber" },
            { label: "Version", description: "Classic vs V2 default", icon: FaCodeBranch, path: "/admin/version", accent: "sky" },
            { label: "Ads", description: "Google AdSense", icon: FaGoogle, path: "/admin/ads", accent: "green" },
        ],
    },
    {
        id: "insights",
        label: "Insights",
        items: [
            { label: "Analytics", description: "Traffic & insights", icon: FaChartLine, path: "/admin/analytics", accent: "cyan" },
            { label: "SEO & Crawl", description: "Search & sitemap", icon: FaMagnifyingGlass, path: "/admin/seo", accent: "lime" },
            { label: "Server Health", description: "Resources & uptime", icon: FaGauge, path: "/admin/health", accent: "emerald" },
            { label: "GitHub", description: "Repo stats", icon: FaGithub, path: "/admin/github", accent: "slate" },
        ],
    },
    {
        id: "system",
        label: "System",
        items: [
            { label: "Config", description: "Site settings", icon: FaSliders, path: "/admin/config", accent: "slate" },
            { label: "Cron Jobs", description: "Task scheduler", icon: FaClock, path: "/admin/config/crons", accent: "emerald" },
            { label: "Notifications", description: "Alert channels & integrations", icon: FaBell, path: "/admin/config/notification", accent: "pink" },
            { label: "Security", description: "Sessions & audit log", icon: FaShieldHalved, path: "/admin/security", accent: "rose" },
            { label: "Database", description: "Backups & JSON", icon: FaDatabase, path: "/admin/database", accent: "yellow" },
            { label: "Resources", description: "Storage & cleanup", icon: FaHardDrive, path: "/admin/resources", accent: "cyan" },
        ],
    },
    {
        id: "developer",
        label: "Developer",
        items: [
            { label: "AI Core", description: "Neural settings", icon: FaRobot, path: "/admin/ai", accent: "cyan" },
            { label: "MCP Server", description: "Model Context Protocol", icon: FaPlug, path: "/admin/mcp", accent: "indigo" },
            { label: "API Reference", description: "Docs & tokens", icon: FaCode, path: "/admin/api-reference", accent: "fuchsia" },
        ],
    },
];

/**
 * The Settings destination lives in the sidebar footer (not the scrolling
 * groups), but is still part of NAV_ITEMS so the breadcrumb and command
 * palette can resolve it.
 */
export const SETTINGS_ITEM = {
    label: "Settings",
    description: "Section stages & preferences",
    icon: FaGear,
    path: "/admin/settings",
    accent: "slate",
    exact: true,
};

/** Flat list of every nav item, useful for search and breadcrumb lookups. */
export const NAV_ITEMS = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];

/**
 * Release-stage labels an admin can pin to any section from Settings. Stored in
 * the config singleton as `adminSectionStages` ({ [path]: "beta" | "alpha" }).
 */
export const STAGE_META = {
    beta: { label: "Beta", badge: "text-sky-300 bg-sky-500/15 ring-1 ring-sky-400/30", dot: "bg-sky-400" },
    alpha: { label: "Alpha", badge: "text-amber-300 bg-amber-500/15 ring-1 ring-amber-400/30", dot: "bg-amber-400" },
};

/**
 * Tailwind class fragments keyed by accent name. Kept as full literal strings
 * (never interpolated at the class level beyond this map) so the Tailwind JIT
 * can see and emit every variant.
 */
export const ACCENT = {
    cyan: { text: "text-cyan-400", bgSoft: "bg-cyan-500/10", border: "hover:border-cyan-500/40", ring: "group-hover:text-cyan-400", dot: "bg-cyan-400", glow: "hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]" },
    purple: { text: "text-purple-400", bgSoft: "bg-purple-500/10", border: "hover:border-purple-500/40", ring: "group-hover:text-purple-400", dot: "bg-purple-400", glow: "hover:shadow-[0_0_24px_rgba(168,85,247,0.12)]" },
    green: { text: "text-green-400", bgSoft: "bg-green-500/10", border: "hover:border-green-500/40", ring: "group-hover:text-green-400", dot: "bg-green-400", glow: "hover:shadow-[0_0_24px_rgba(34,197,94,0.12)]" },
    blue: { text: "text-blue-400", bgSoft: "bg-blue-500/10", border: "hover:border-blue-500/40", ring: "group-hover:text-blue-400", dot: "bg-blue-400", glow: "hover:shadow-[0_0_24px_rgba(59,130,246,0.12)]" },
    teal: { text: "text-teal-400", bgSoft: "bg-teal-500/10", border: "hover:border-teal-500/40", ring: "group-hover:text-teal-400", dot: "bg-teal-400", glow: "hover:shadow-[0_0_24px_rgba(20,184,166,0.12)]" },
    indigo: { text: "text-indigo-400", bgSoft: "bg-indigo-500/10", border: "hover:border-indigo-500/40", ring: "group-hover:text-indigo-400", dot: "bg-indigo-400", glow: "hover:shadow-[0_0_24px_rgba(99,102,241,0.12)]" },
    fuchsia: { text: "text-fuchsia-400", bgSoft: "bg-fuchsia-500/10", border: "hover:border-fuchsia-500/40", ring: "group-hover:text-fuchsia-400", dot: "bg-fuchsia-400", glow: "hover:shadow-[0_0_24px_rgba(217,70,239,0.12)]" },
    orange: { text: "text-orange-400", bgSoft: "bg-orange-500/10", border: "hover:border-orange-500/40", ring: "group-hover:text-orange-400", dot: "bg-orange-400", glow: "hover:shadow-[0_0_24px_rgba(249,115,22,0.12)]" },
    pink: { text: "text-pink-400", bgSoft: "bg-pink-500/10", border: "hover:border-pink-500/40", ring: "group-hover:text-pink-400", dot: "bg-pink-400", glow: "hover:shadow-[0_0_24px_rgba(236,72,153,0.12)]" },
    red: { text: "text-red-400", bgSoft: "bg-red-500/10", border: "hover:border-red-500/40", ring: "group-hover:text-red-400", dot: "bg-red-400", glow: "hover:shadow-[0_0_24px_rgba(239,68,68,0.12)]" },
    violet: { text: "text-violet-400", bgSoft: "bg-violet-500/10", border: "hover:border-violet-500/40", ring: "group-hover:text-violet-400", dot: "bg-violet-400", glow: "hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]" },
    amber: { text: "text-amber-400", bgSoft: "bg-amber-500/10", border: "hover:border-amber-500/40", ring: "group-hover:text-amber-400", dot: "bg-amber-400", glow: "hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]" },
    sky: { text: "text-sky-400", bgSoft: "bg-sky-500/10", border: "hover:border-sky-500/40", ring: "group-hover:text-sky-400", dot: "bg-sky-400", glow: "hover:shadow-[0_0_24px_rgba(14,165,233,0.12)]" },
    lime: { text: "text-lime-400", bgSoft: "bg-lime-500/10", border: "hover:border-lime-500/40", ring: "group-hover:text-lime-400", dot: "bg-lime-400", glow: "hover:shadow-[0_0_24px_rgba(132,204,22,0.12)]" },
    emerald: { text: "text-emerald-400", bgSoft: "bg-emerald-500/10", border: "hover:border-emerald-500/40", ring: "group-hover:text-emerald-400", dot: "bg-emerald-400", glow: "hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]" },
    rose: { text: "text-rose-400", bgSoft: "bg-rose-500/10", border: "hover:border-rose-500/40", ring: "group-hover:text-rose-400", dot: "bg-rose-400", glow: "hover:shadow-[0_0_24px_rgba(244,63,94,0.12)]" },
    yellow: { text: "text-yellow-400", bgSoft: "bg-yellow-500/10", border: "hover:border-yellow-500/40", ring: "group-hover:text-yellow-400", dot: "bg-yellow-400", glow: "hover:shadow-[0_0_24px_rgba(234,179,8,0.12)]" },
    slate: { text: "text-slate-300", bgSoft: "bg-slate-500/10", border: "hover:border-slate-400/40", ring: "group-hover:text-slate-200", dot: "bg-slate-400", glow: "hover:shadow-[0_0_24px_rgba(148,163,184,0.12)]" },
};

/** Resolve the active nav item for a given pathname (longest-prefix match). */
export function findActiveItem(pathname) {
    if (!pathname) return null;
    let best = null;
    for (const item of NAV_ITEMS) {
        if (item.exact) {
            if (pathname === item.path) return item;
            continue;
        }
        if (pathname === item.path || pathname.startsWith(item.path + "/")) {
            if (!best || item.path.length > best.path.length) best = item;
        }
    }
    return best;
}
