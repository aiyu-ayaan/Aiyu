import {
    FaGaugeHigh, FaHouse, FaUser, FaBriefcase, FaPenNib, FaImages,
    FaHeading, FaShareNodes, FaEnvelope, FaPalette, FaGithub, FaSliders,
    FaDatabase, FaTerminal, FaRobot, FaServer, FaHardDrive, FaCode,
    FaGoogle, FaClock, FaBell, FaChartLine, FaMagnifyingGlass,
    FaShieldHalved, FaGauge, FaPlug, FaWandMagicSparkles,
    FaGear, FaFileLines, FaShareFromSquare, FaDesktop, FaScaleBalanced,
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
            { label: "Legal", description: "Privacy policy & terms", icon: FaScaleBalanced, path: "/admin/legal", accent: "sky" },
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
            { label: "Desktop", description: "Virtual OS & wallpaper", icon: FaDesktop, path: "/admin/desktop", accent: "blue" },
            { label: "Terminal", description: "CLI appearance", icon: FaTerminal, path: "/admin/terminal", accent: "amber" },
            { label: "Ads", description: "Google AdSense", icon: FaGoogle, path: "/admin/ads", accent: "green" },
        ],
    },
    {
        id: "insights",
        label: "Insights",
        items: [
            { label: "Analytics", description: "Traffic & insights", icon: FaChartLine, path: "/admin/analytics", accent: "cyan" },
            { label: "SEO & Crawl", description: "Search & sitemap", icon: FaMagnifyingGlass, path: "/admin/seo", accent: "lime" },
            { label: "Social & Metadata", description: "Per-page Open Graph tags", icon: FaShareFromSquare, path: "/admin/social", accent: "green" },
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
    beta: { label: "Beta", badge: "text-[var(--adm-info-ink)] bg-[color-mix(in_srgb,var(--status-info)_12%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--status-info)_35%,transparent)]", dot: "bg-[var(--status-info)]" },
    alpha: { label: "Alpha", badge: "text-[var(--adm-warn-ink)] bg-[color-mix(in_srgb,var(--status-warning)_12%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--status-warning)_35%,transparent)]", dot: "bg-[var(--status-warning)]" },
};

/**
 * Tailwind class fragments keyed by accent name. Kept as full literal strings
 * (never interpolated at the class level beyond this map) so the Tailwind JIT
 * can see and emit every variant.
 */
export const ACCENT = {
    cyan: { text: "text-[color-mix(in_srgb,var(--accent-cyan)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-cyan)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-cyan)_65%,var(--text-bright))]", dot: "bg-[var(--accent-cyan)]", glow: "" },
    purple: { text: "text-[color-mix(in_srgb,var(--accent-purple)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-purple)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-purple)_65%,var(--text-bright))]", dot: "bg-[var(--accent-purple)]", glow: "" },
    green: { text: "text-[color-mix(in_srgb,var(--status-success)_55%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--status-success)_55%,var(--text-bright))]", dot: "bg-[var(--status-success)]", glow: "" },
    blue: { text: "text-[color-mix(in_srgb,var(--accent-cyan)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-cyan)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-cyan)_65%,var(--text-bright))]", dot: "bg-[var(--accent-cyan)]", glow: "" },
    teal: { text: "text-[color-mix(in_srgb,var(--accent-teal)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-teal)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-teal)_65%,var(--text-bright))]", dot: "bg-[var(--accent-teal)]", glow: "" },
    indigo: { text: "text-[color-mix(in_srgb,var(--accent-purple)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-purple)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-purple)_65%,var(--text-bright))]", dot: "bg-[var(--accent-purple)]", glow: "" },
    fuchsia: { text: "text-[color-mix(in_srgb,var(--accent-purple)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-purple)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-purple)_65%,var(--text-bright))]", dot: "bg-[var(--accent-purple)]", glow: "" },
    orange: { text: "text-[color-mix(in_srgb,var(--accent-orange)_55%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-orange)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-orange)_55%,var(--text-bright))]", dot: "bg-[var(--accent-orange)]", glow: "" },
    pink: { text: "text-[color-mix(in_srgb,var(--accent-pink)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-pink)_65%,var(--text-bright))]", dot: "bg-[var(--accent-pink)]", glow: "" },
    red: { text: "text-[color-mix(in_srgb,var(--status-error)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--status-error)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--status-error)_65%,var(--text-bright))]", dot: "bg-[var(--status-error)]", glow: "" },
    violet: { text: "text-[color-mix(in_srgb,var(--accent-purple)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-purple)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-purple)_65%,var(--text-bright))]", dot: "bg-[var(--accent-purple)]", glow: "" },
    amber: { text: "text-[color-mix(in_srgb,var(--status-warning)_50%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--status-warning)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--status-warning)_50%,var(--text-bright))]", dot: "bg-[var(--status-warning)]", glow: "" },
    sky: { text: "text-[color-mix(in_srgb,var(--status-info)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--status-info)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--status-info)_65%,var(--text-bright))]", dot: "bg-[var(--status-info)]", glow: "" },
    lime: { text: "text-[color-mix(in_srgb,var(--accent-green)_55%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-green)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-green)_55%,var(--text-bright))]", dot: "bg-[var(--accent-green)]", glow: "" },
    emerald: { text: "text-[color-mix(in_srgb,var(--status-success)_55%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--status-success)_55%,var(--text-bright))]", dot: "bg-[var(--status-success)]", glow: "" },
    rose: { text: "text-[color-mix(in_srgb,var(--accent-pink)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--accent-pink)_65%,var(--text-bright))]", dot: "bg-[var(--accent-pink)]", glow: "" },
    yellow: { text: "text-[color-mix(in_srgb,var(--status-warning)_50%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--status-warning)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--status-warning)_50%,var(--text-bright))]", dot: "bg-[var(--status-warning)]", glow: "" },
    slate: { text: "text-[color-mix(in_srgb,var(--text-secondary)_65%,var(--text-bright))]", bgSoft: "bg-[color-mix(in_srgb,var(--text-secondary)_12%,transparent)]", border: "hover:border-[var(--hairline-strong)]", ring: "group-hover:text-[color-mix(in_srgb,var(--text-secondary)_65%,var(--text-bright))]", dot: "bg-[var(--text-secondary)]", glow: "" },
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
