//! Code Mode API catalog: allow list of admin routes, path validation, response redactions, and OpenAPI generation.

use serde_json::{Map, Value, json};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Scope {
    Read,
    Write,
}

impl Scope {
    pub const fn allows(self, required: Scope) -> bool {
        match (self, required) {
            (Scope::Write, _) => true,
            (Scope::Read, Scope::Read) => true,
            (Scope::Read, Scope::Write) => false,
        }
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Scope::Read => "read",
            Scope::Write => "write",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParamLocation {
    Path,
    Query,
}

impl ParamLocation {
    pub const fn as_str(self) -> &'static str {
        match self {
            ParamLocation::Path => "path",
            ParamLocation::Query => "query",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Param {
    pub name: &'static str,
    pub location: ParamLocation,
    pub required: bool,
    pub description: &'static str,
}

#[derive(Debug, Clone, Copy)]
pub struct CatalogEntry {
    pub method: &'static str,
    pub path: &'static str,
    pub scope: Scope,
    pub section: &'static str,
    /// Admin nav paths from `src/app/components/admin/shell/navConfig.js` covered by this entry.
    pub admin_paths: &'static [&'static str],
    pub summary: &'static str,
    pub params: &'static [Param],
    /// Allowed top-level JSON body fields for write routes (empty for read routes).
    pub allowed_body_fields: &'static [&'static str],
    /// Dot/array path expressions stripped from JSON responses before returning to the sandbox.
    pub redactions: &'static [&'static str],
}

const ID_PARAM: &[Param] = &[Param {
    name: "id",
    location: ParamLocation::Path,
    required: true,
    description: "Resource identifier",
}];

/// Secret fields stripped from `GET /api/config` (which returns the full `Config.data` blob for admins).
const CONFIG_REDACTIONS: &[&str] = &[
    "gdriveConfig",
    "ai.gatewayApiKey",
    "ai.providers[].apiKey",
    "n8nWebhookAuthKey",
    "n8nWebhookUrl",
    "encryptedGithubToken",
    "encryptedGithubWebhookSecret",
    "encryptedGeminiApiKey",
    "encryptedGroqApiKey",
    "encryptedOpenRouterApiKey",
    "blogApiTokenHash",
];

/// Safe top-level config fields writable via `PUT /api/config`.
/// Never includes secret columns, `gdriveConfig`, `ai`, or webhook credentials.
const CONFIG_WRITE_FIELDS: &[&str] = &[
    "siteTitle", "siteDescription", "seoDescription", "logoText", "ogImage", "profession",
    "authorName", "googleAnalyticsId", "resume", "favicon", "contactLocation", "contactEmail",
    "contactStatus", "footerText", "footerText2", "showWorkStatus", "workStatus", "footerVersion",
    "footerVersionLink", "terminal", "blogsTitle", "blogsSubtitle", "isBlogAutomated",
    "blogAutomationMessage", "showBlogViewCount", "enableBlogReviewEngine", "customTestKeywords",
    "projectsTitle", "projectsSubtitle", "galleryTitle", "gallerySubtitle", "desktopWallpaper",
    "desktopDeviceName", "desktopOsVersion", "activeTheme", "activeThemeVariant",
    "allowThemeSwitching", "perPageThemes", "adminSectionStages",
];

const PROJECT_CREATE_FIELDS: &[&str] = &[
    "name", "slug", "techStack", "year", "status", "projectType", "description", "codeLink",
    "blogLink", "image", "displayOrder", "readme",
];
const PROJECT_UPDATE_FIELDS: &[&str] = &[
    "name", "slug", "techStack", "year", "status", "projectType", "description", "codeLink",
    "blogLink", "image", "displayOrder", "readme", "pinnedFields",
];
const DEPLOYMENT_FIELDS: &[&str] = &[
    "name", "slug", "techStack", "status", "appType", "environment", "hostingProvider",
    "description", "hostedUrl", "blogLink", "image", "displayOrder", "projectId",
];
const LEGAL_APP_FIELDS: &[&str] = &[
    "name", "slug", "packageName", "description", "contactEmail", "deploymentId",
];
const LEGAL_DOC_FIELDS: &[&str] = &[
    "kind", "title", "slug", "format", "content", "seoDescription", "effectiveDate", "published",
    "noIndex", "displayOrder",
];
const BLOG_CREATE_FIELDS: &[&str] = &[
    "title", "content", "image", "imageAlt", "excerpt", "seoTitle", "seoDescription",
    "canonicalUrl", "keywords", "socialTitle", "socialDescription", "socialImage",
    "socialImageAlt", "noIndex", "tags", "date", "published",
];
const BLOG_UPDATE_FIELDS: &[&str] = &[
    "title", "content", "image", "imageAlt", "excerpt", "seoTitle", "seoDescription",
    "canonicalUrl", "keywords", "socialTitle", "socialDescription", "socialImage",
    "socialImageAlt", "noIndex", "tags", "date", "published", "isFlagged", "flagReason",
    "reviewStatus",
];
const SOCIAL_FIELDS: &[&str] = &["name", "url", "iconName", "isHidden"];
const THEME_FIELDS: &[&str] = &["name", "description", "variants"];
const AI_CATEGORY_FIELDS: &[&str] = &["label", "accent", "displayOrder"];
const AI_SKILL_FIELDS: &[&str] = &["categoryId", "name", "description", "url", "displayOrder"];
const AI_REC_FIELDS: &[&str] = &["name", "url", "rating", "accent", "blurb", "tags", "displayOrder"];
const AI_CREDIT_FIELDS: &[&str] = &["name", "offer", "url", "noCard", "freeApi", "note", "displayOrder"];
const AI_PROMPT_FIELDS: &[&str] = &["title", "role", "prompt", "displayOrder"];

/// Secret fields stripped from `GET /api/admin/crons` (which decrypts `webhookEnv`).
const CRONS_REDACTIONS: &[&str] = &["data[].webhookEnv"];

/// Webhook URLs and tokens stripped from `GET /api/admin/notifications`.
const NOTIFICATIONS_REDACTIONS: &[&str] = &[
    "data.ntfy.token",
    "data.ntfy.serverUrl",
    "data.telegram.botToken",
    "data.discord.webhookUrl",
];

/// Session JWT IDs stripped from `GET /api/admin/security/sessions`.
const SESSIONS_REDACTIONS: &[&str] = &["sessions[].jti"];

/// Phase 1 read-only allow list. Deny by default: any route not listed here is refused.
/// Never routes (auth/*, tokens, export/import, gdrive config/OAuth/restore/delete/disconnect,
/// cron mutations/env/preview, notification writes, session revoke, analytics reset, storage
/// destructive ops, AI provider keys/validation, and `/api/codemode/*`) are intentionally absent.
pub const CATALOG: &[CatalogEntry] = &[
    // Dashboard
    CatalogEntry {
        method: "GET",
        path: "/api/version",
        scope: Scope::Read,
        section: "Dashboard",
        admin_paths: &["/admin"],
        summary: "Get application version",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/health",
        scope: Scope::Read,
        section: "Dashboard",
        admin_paths: &["/admin"],
        summary: "Get server health status (pass deep=1 to check database connectivity)",
        params: &[Param {
            name: "deep",
            location: ParamLocation::Query,
            required: false,
            description: "Set to 1 to run a database connectivity check",
        }],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Home
    CatalogEntry {
        method: "GET",
        path: "/api/home",
        scope: Scope::Read,
        section: "Home",
        admin_paths: &["/admin/home"],
        summary: "Get home page singleton content",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // About
    CatalogEntry {
        method: "GET",
        path: "/api/about",
        scope: Scope::Read,
        section: "About",
        admin_paths: &["/admin/about"],
        summary: "Get about page singleton content",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Projects
    CatalogEntry {
        method: "GET",
        path: "/api/projects",
        scope: Scope::Read,
        section: "Projects",
        admin_paths: &["/admin/projects"],
        summary: "List all portfolio projects",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/projects/{id}",
        scope: Scope::Read,
        section: "Projects",
        admin_paths: &["/admin/projects"],
        summary: "Get a single project by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/projects/{id}/links",
        scope: Scope::Read,
        section: "Projects",
        admin_paths: &["/admin/projects"],
        summary: "Get linked apps and legal pages for a project",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Apps (Deployments)
    CatalogEntry {
        method: "GET",
        path: "/api/deployments",
        scope: Scope::Read,
        section: "Apps",
        admin_paths: &["/admin/apps"],
        summary: "List all hosted apps and deployments",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/deployments/{id}",
        scope: Scope::Read,
        section: "Apps",
        admin_paths: &["/admin/apps"],
        summary: "Get a single app/deployment by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/deployments/{id}/links",
        scope: Scope::Read,
        section: "Apps",
        admin_paths: &["/admin/apps"],
        summary: "Get product page, source project, and legal links for an app",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Legal
    CatalogEntry {
        method: "GET",
        path: "/api/legal/apps",
        scope: Scope::Read,
        section: "Legal",
        admin_paths: &["/admin/legal"],
        summary: "List all legal apps with their documents (drafts included)",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/legal/apps/{id}",
        scope: Scope::Read,
        section: "Legal",
        admin_paths: &["/admin/legal"],
        summary: "Get a legal app and its documents by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/legal/documents/{id}",
        scope: Scope::Read,
        section: "Legal",
        admin_paths: &["/admin/legal"],
        summary: "Get a legal document and its parent app by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Blogs
    CatalogEntry {
        method: "GET",
        path: "/api/blogs",
        scope: Scope::Read,
        section: "Blogs",
        admin_paths: &["/admin/blogs"],
        summary: "List blog posts (pass all=true for drafts, filters, sorting, and view counts)",
        params: &[
            Param { name: "all", location: ParamLocation::Query, required: false, description: "Set to true to include drafts and admin metadata" },
            Param { name: "page", location: ParamLocation::Query, required: false, description: "Page number (1-indexed)" },
            Param { name: "limit", location: ParamLocation::Query, required: false, description: "Items per page (1-24)" },
            Param { name: "filter", location: ParamLocation::Query, required: false, description: "Admin tab filter: all, active, ceased, or flagged" },
            Param { name: "sortKey", location: ParamLocation::Query, required: false, description: "Sort column: date, title, published, or views" },
            Param { name: "sortDir", location: ParamLocation::Query, required: false, description: "Sort direction: asc or desc" },
        ],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/blogs/{id}",
        scope: Scope::Read,
        section: "Blogs",
        admin_paths: &["/admin/blogs"],
        summary: "Get a single blog post by id or slug",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Gallery
    CatalogEntry {
        method: "GET",
        path: "/api/gallery",
        scope: Scope::Read,
        section: "Gallery",
        admin_paths: &["/admin/gallery"],
        summary: "List all gallery photos and certificates",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // AI Hub
    CatalogEntry {
        method: "GET",
        path: "/api/ai-page",
        scope: Scope::Read,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Get hydrated AI Hub showcase page data",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/ai/layout",
        scope: Scope::Read,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Get AI Hub section layout skeleton",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/ai/skills",
        scope: Scope::Read,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Get AI Hub skills section",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/ai/skills/categories",
        scope: Scope::Read,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "List AI Hub skill categories with their skills",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/ai/recommendations",
        scope: Scope::Read,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Get AI Hub recommendations section",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/ai/credits",
        scope: Scope::Read,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Get AI Hub credits section",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/ai/prompts",
        scope: Scope::Read,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Get AI Hub prompts section",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Resume Studio
    CatalogEntry {
        method: "GET",
        path: "/api/admin/resume",
        scope: Scope::Read,
        section: "Resume Studio",
        admin_paths: &["/admin/resume"],
        summary: "Get Resume Studio LaTeX source, snapshots, and ideas",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Header
    CatalogEntry {
        method: "GET",
        path: "/api/header",
        scope: Scope::Read,
        section: "Header",
        admin_paths: &["/admin/header"],
        summary: "Get site header navigation and logo config",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Footer
    CatalogEntry {
        method: "GET",
        path: "/api/socials",
        scope: Scope::Read,
        section: "Footer",
        admin_paths: &["/admin/footer"],
        summary: "List all social profile links",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/socials/{id}",
        scope: Scope::Read,
        section: "Footer",
        admin_paths: &["/admin/footer"],
        summary: "Get a single social link by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Contact
    CatalogEntry {
        method: "GET",
        path: "/api/contact/message",
        scope: Scope::Read,
        section: "Contact",
        admin_paths: &["/admin/contact"],
        summary: "List contact form messages",
        params: &[Param {
            name: "limit",
            location: ParamLocation::Query,
            required: false,
            description: "Maximum number of messages to return (1-500, default 100)",
        }],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Themes
    CatalogEntry {
        method: "GET",
        path: "/api/themes",
        scope: Scope::Read,
        section: "Themes",
        admin_paths: &["/admin/themes"],
        summary: "List predefined, legacy, and custom themes",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/themes/active",
        scope: Scope::Read,
        section: "Themes",
        admin_paths: &["/admin/themes"],
        summary: "Get the active theme, variant, and per-page theme settings",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/themes/{id}",
        scope: Scope::Read,
        section: "Themes",
        admin_paths: &["/admin/themes"],
        summary: "Get a theme by slug or id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Config, Desktop, Terminal, Settings
    CatalogEntry {
        method: "GET",
        path: "/api/config",
        scope: Scope::Read,
        section: "Config",
        admin_paths: &["/admin/config", "/admin/desktop", "/admin/terminal", "/admin/settings"],
        summary: "Get site configuration (Desktop, Terminal, Settings, Config; secrets redacted)",
        params: &[],
        allowed_body_fields: &[],
        redactions: CONFIG_REDACTIONS,
    },
    // Ads
    CatalogEntry {
        method: "GET",
        path: "/api/admin/ads",
        scope: Scope::Read,
        section: "Ads",
        admin_paths: &["/admin/ads"],
        summary: "Get Google AdSense configuration and placements",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Analytics
    CatalogEntry {
        method: "GET",
        path: "/api/admin/analytics",
        scope: Scope::Read,
        section: "Analytics",
        admin_paths: &["/admin/analytics"],
        summary: "Get traffic analytics KPIs, daily series, and top lists",
        params: &[Param {
            name: "range",
            location: ParamLocation::Query,
            required: false,
            description: "Time window: 7d, 30d (default), or 90d",
        }],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // SEO & Crawl
    CatalogEntry {
        method: "GET",
        path: "/api/admin/seo/config",
        scope: Scope::Read,
        section: "SEO & Crawl",
        admin_paths: &["/admin/seo"],
        summary: "Get SEO config, service account status, and recent indexing logs",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/seo/audit",
        scope: Scope::Read,
        section: "SEO & Crawl",
        admin_paths: &["/admin/seo"],
        summary: "Run metadata SEO audit across blogs, projects, apps, and static pages",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Social & Metadata
    CatalogEntry {
        method: "GET",
        path: "/api/admin/social",
        scope: Scope::Read,
        section: "Social & Metadata",
        admin_paths: &["/admin/social"],
        summary: "Get per-page Open Graph and social metadata configuration",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Server Health
    CatalogEntry {
        method: "GET",
        path: "/api/admin/health/metrics",
        scope: Scope::Read,
        section: "Server Health",
        admin_paths: &["/admin/health"],
        summary: "Get live CPU, memory, disk, database, and host metrics",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/health/uptime",
        scope: Scope::Read,
        section: "Server Health",
        admin_paths: &["/admin/health"],
        summary: "Get latest uptime check status and recent history per target",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/health/targets",
        scope: Scope::Read,
        section: "Server Health",
        admin_paths: &["/admin/health"],
        summary: "List custom uptime monitoring targets",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // GitHub
    CatalogEntry {
        method: "GET",
        path: "/api/github/stats",
        scope: Scope::Read,
        section: "GitHub",
        admin_paths: &["/admin/github"],
        summary: "Get aggregated GitHub profile, repo, and contribution statistics",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/github/config",
        scope: Scope::Read,
        section: "GitHub",
        admin_paths: &["/admin/github"],
        summary: "Get GitHub integration configuration or repo list (mode=repos)",
        params: &[
            Param { name: "mode", location: ParamLocation::Query, required: false, description: "Set to repos to list repositories for the configured account" },
            Param { name: "includePrivate", location: ParamLocation::Query, required: false, description: "Set to true to include private repos when mode=repos" },
        ],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/github/sync",
        scope: Scope::Read,
        section: "GitHub",
        admin_paths: &["/admin/github"],
        summary: "Preview what a GitHub repository sync would change without writing",
        params: &[Param {
            name: "repo",
            location: ParamLocation::Query,
            required: true,
            description: "Repository name or owner/repo (repeatable)",
        }],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Cron Jobs
    CatalogEntry {
        method: "GET",
        path: "/api/admin/crons",
        scope: Scope::Read,
        section: "Cron Jobs",
        admin_paths: &["/admin/config/crons"],
        summary: "List scheduled cron jobs (webhookEnv redacted)",
        params: &[],
        allowed_body_fields: &[],
        redactions: CRONS_REDACTIONS,
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/crons/logs",
        scope: Scope::Read,
        section: "Cron Jobs",
        admin_paths: &["/admin/config/crons"],
        summary: "List paginated cron execution logs",
        params: &[
            Param { name: "page", location: ParamLocation::Query, required: false, description: "Page number (default 1)" },
            Param { name: "limit", location: ParamLocation::Query, required: false, description: "Items per page (1-50, default 10)" },
            Param { name: "status", location: ParamLocation::Query, required: false, description: "Filter by status: success or failure" },
            Param { name: "cronId", location: ParamLocation::Query, required: false, description: "Filter by cron job id" },
            Param { name: "search", location: ParamLocation::Query, required: false, description: "Search cron name, URL, or log output" },
        ],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/crons/timezone",
        scope: Scope::Read,
        section: "Cron Jobs",
        admin_paths: &["/admin/config/crons"],
        summary: "Get default cron scheduler timezone",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Notifications
    CatalogEntry {
        method: "GET",
        path: "/api/admin/notifications",
        scope: Scope::Read,
        section: "Notifications",
        admin_paths: &["/admin/config/notification"],
        summary: "Get notification channel settings (webhook URLs and tokens redacted)",
        params: &[],
        allowed_body_fields: &[],
        redactions: NOTIFICATIONS_REDACTIONS,
    },
    // Security
    CatalogEntry {
        method: "GET",
        path: "/api/admin/security/audit",
        scope: Scope::Read,
        section: "Security",
        admin_paths: &["/admin/security"],
        summary: "List security audit log entries with cursor pagination",
        params: &[
            Param { name: "category", location: ParamLocation::Query, required: false, description: "Filter by audit category" },
            Param { name: "action", location: ParamLocation::Query, required: false, description: "Substring filter on audit action" },
            Param { name: "limit", location: ParamLocation::Query, required: false, description: "Entries per page (1-100, default 50)" },
            Param { name: "cursor", location: ParamLocation::Query, required: false, description: "Pagination cursor from previous response" },
        ],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/security/sessions",
        scope: Scope::Read,
        section: "Security",
        admin_paths: &["/admin/security"],
        summary: "List active, expired, and revoked admin sessions (jti redacted)",
        params: &[],
        allowed_body_fields: &[],
        redactions: SESSIONS_REDACTIONS,
    },
    // Database
    CatalogEntry {
        method: "GET",
        path: "/api/admin/gdrive/status",
        scope: Scope::Read,
        section: "Database",
        admin_paths: &["/admin/database"],
        summary: "Get Google Drive backup connection status and retention settings",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/gdrive/list",
        scope: Scope::Read,
        section: "Database",
        admin_paths: &["/admin/database"],
        summary: "List backup archives stored in Google Drive",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Resources
    CatalogEntry {
        method: "GET",
        path: "/api/admin/storage",
        scope: Scope::Read,
        section: "Resources",
        admin_paths: &["/admin/resources"],
        summary: "Audit database and upload storage usage and unreferenced files",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/storage/migrate",
        scope: Scope::Read,
        section: "Resources",
        admin_paths: &["/admin/resources"],
        summary: "Preview upload files eligible for WebP conversion",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/icons",
        scope: Scope::Read,
        section: "Resources",
        admin_paths: &["/admin/resources"],
        summary: "List available simple-icons titles and slugs",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // AI Core
    CatalogEntry {
        method: "GET",
        path: "/api/admin/ai/config",
        scope: Scope::Read,
        section: "AI Core",
        admin_paths: &["/admin/ai"],
        summary: "Get AI Core provider configuration (keys reported only as boolean hasKey)",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/ai/models",
        scope: Scope::Read,
        section: "AI Core",
        admin_paths: &["/admin/ai"],
        summary: "List available models from configured AI providers",
        params: &[Param {
            name: "providerId",
            location: ParamLocation::Query,
            required: false,
            description: "Filter to a specific provider instance id (default all)",
        }],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "GET",
        path: "/api/admin/ai/logs",
        scope: Scope::Read,
        section: "AI Core",
        admin_paths: &["/admin/ai"],
        summary: "Get the last 50 AI Core calls and per-provider token totals",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // API Reference
    CatalogEntry {
        method: "GET",
        path: "/api/admin/system-prompt",
        scope: Scope::Read,
        section: "API Reference",
        admin_paths: &["/admin/api-reference"],
        summary: "Get generated assistant system prompt with site content context",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // ── Write routes (Scope::Write) ────────────────────────────────────────────────────────────────────
    // Home & About & Header
    CatalogEntry {
        method: "PUT",
        path: "/api/home",
        scope: Scope::Write,
        section: "Home",
        admin_paths: &["/admin/home"],
        summary: "Update home page singleton content",
        params: &[],
        allowed_body_fields: &["name", "intro", "homeRoles", "githubLink", "codeSnippets", "showcaseSection", "heroTitle", "heroSubtitle", "ctaText", "ctaLink"],
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/about",
        scope: Scope::Write,
        section: "About",
        admin_paths: &["/admin/about"],
        summary: "Update about page singleton content",
        params: &[],
        allowed_body_fields: &["name", "roles", "professionalSummary", "skills", "experiences", "education", "certifications"],
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/header",
        scope: Scope::Write,
        section: "Header",
        admin_paths: &["/admin/header"],
        summary: "Update site header navigation and logo config",
        params: &[],
        allowed_body_fields: &["navLinks", "contactLink", "logoText", "showThemeToggle", "showSearch"],
        redactions: &[],
    },
    // Projects
    CatalogEntry {
        method: "POST",
        path: "/api/projects",
        scope: Scope::Write,
        section: "Projects",
        admin_paths: &["/admin/projects"],
        summary: "Create a portfolio project",
        params: &[],
        allowed_body_fields: PROJECT_CREATE_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/projects/{id}",
        scope: Scope::Write,
        section: "Projects",
        admin_paths: &["/admin/projects"],
        summary: "Update a portfolio project by id",
        params: ID_PARAM,
        allowed_body_fields: PROJECT_UPDATE_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/projects/{id}",
        scope: Scope::Write,
        section: "Projects",
        admin_paths: &["/admin/projects"],
        summary: "Delete a portfolio project by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "PATCH",
        path: "/api/projects/reorder",
        scope: Scope::Write,
        section: "Projects",
        admin_paths: &["/admin/projects"],
        summary: "Reorder portfolio projects by orderedIds",
        params: &[],
        allowed_body_fields: &["orderedIds"],
        redactions: &[],
    },
    // Apps (Deployments)
    CatalogEntry {
        method: "POST",
        path: "/api/deployments",
        scope: Scope::Write,
        section: "Apps",
        admin_paths: &["/admin/apps"],
        summary: "Create a hosted app/deployment",
        params: &[],
        allowed_body_fields: DEPLOYMENT_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/deployments/{id}",
        scope: Scope::Write,
        section: "Apps",
        admin_paths: &["/admin/apps"],
        summary: "Update a hosted app/deployment by id",
        params: ID_PARAM,
        allowed_body_fields: DEPLOYMENT_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/deployments/{id}",
        scope: Scope::Write,
        section: "Apps",
        admin_paths: &["/admin/apps"],
        summary: "Delete a hosted app/deployment by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "PATCH",
        path: "/api/deployments/reorder",
        scope: Scope::Write,
        section: "Apps",
        admin_paths: &["/admin/apps"],
        summary: "Reorder hosted apps/deployments by orderedIds",
        params: &[],
        allowed_body_fields: &["orderedIds"],
        redactions: &[],
    },
    // Legal
    CatalogEntry {
        method: "POST",
        path: "/api/legal/apps",
        scope: Scope::Write,
        section: "Legal",
        admin_paths: &["/admin/legal"],
        summary: "Create a legal app",
        params: &[],
        allowed_body_fields: LEGAL_APP_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/legal/apps/{id}",
        scope: Scope::Write,
        section: "Legal",
        admin_paths: &["/admin/legal"],
        summary: "Update a legal app by id",
        params: ID_PARAM,
        allowed_body_fields: LEGAL_APP_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/legal/apps/{id}",
        scope: Scope::Write,
        section: "Legal",
        admin_paths: &["/admin/legal"],
        summary: "Delete a legal app by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/legal/apps/{id}/documents",
        scope: Scope::Write,
        section: "Legal",
        admin_paths: &["/admin/legal"],
        summary: "Create a legal document under a legal app",
        params: ID_PARAM,
        allowed_body_fields: LEGAL_DOC_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/legal/documents/{id}",
        scope: Scope::Write,
        section: "Legal",
        admin_paths: &["/admin/legal"],
        summary: "Update a legal document by id",
        params: ID_PARAM,
        allowed_body_fields: LEGAL_DOC_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/legal/documents/{id}",
        scope: Scope::Write,
        section: "Legal",
        admin_paths: &["/admin/legal"],
        summary: "Delete a legal document by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Blogs
    CatalogEntry {
        method: "POST",
        path: "/api/blogs",
        scope: Scope::Write,
        section: "Blogs",
        admin_paths: &["/admin/blogs"],
        summary: "Create a blog post",
        params: &[],
        allowed_body_fields: BLOG_CREATE_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/blogs/{id}",
        scope: Scope::Write,
        section: "Blogs",
        admin_paths: &["/admin/blogs"],
        summary: "Update a blog post by id",
        params: ID_PARAM,
        allowed_body_fields: BLOG_UPDATE_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/blogs/{id}",
        scope: Scope::Write,
        section: "Blogs",
        admin_paths: &["/admin/blogs"],
        summary: "Delete a blog post by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Gallery
    CatalogEntry {
        method: "POST",
        path: "/api/gallery",
        scope: Scope::Write,
        section: "Gallery",
        admin_paths: &["/admin/gallery"],
        summary: "Create a gallery item",
        params: &[],
        allowed_body_fields: &["src", "thumbnail", "description", "width", "height", "isPinned", "order"],
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/gallery",
        scope: Scope::Write,
        section: "Gallery",
        admin_paths: &["/admin/gallery"],
        summary: "Update or reorder gallery items",
        params: &[],
        allowed_body_fields: &["id", "update", "items"],
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/gallery",
        scope: Scope::Write,
        section: "Gallery",
        admin_paths: &["/admin/gallery"],
        summary: "Delete a gallery item by query id",
        params: &[Param { name: "id", location: ParamLocation::Query, required: true, description: "Gallery item id" }],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // AI Hub
    CatalogEntry {
        method: "PUT",
        path: "/api/ai/layout",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Update AI Hub section layout and sub-page threshold",
        params: &[],
        allowed_body_fields: &["sections", "subPageThreshold"],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/ai/skills/categories",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Create an AI Hub skill category",
        params: &[],
        allowed_body_fields: AI_CATEGORY_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/ai/skills/categories/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Update an AI Hub skill category",
        params: ID_PARAM,
        allowed_body_fields: AI_CATEGORY_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/ai/skills/categories/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Delete an AI Hub skill category",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/ai/skills/items",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Create an AI Hub skill item",
        params: &[],
        allowed_body_fields: AI_SKILL_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/ai/skills/items/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Update an AI Hub skill item",
        params: ID_PARAM,
        allowed_body_fields: AI_SKILL_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/ai/skills/items/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Delete an AI Hub skill item",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/ai/recommendations",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Create an AI Hub recommendation",
        params: &[],
        allowed_body_fields: AI_REC_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/ai/recommendations/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Update an AI Hub recommendation",
        params: ID_PARAM,
        allowed_body_fields: AI_REC_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/ai/recommendations/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Delete an AI Hub recommendation",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/ai/credits",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Create an AI Hub credit entry",
        params: &[],
        allowed_body_fields: AI_CREDIT_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/ai/credits/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Update an AI Hub credit entry",
        params: ID_PARAM,
        allowed_body_fields: AI_CREDIT_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/ai/credits/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Delete an AI Hub credit entry",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/ai/prompts",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Create an AI Hub prompt",
        params: &[],
        allowed_body_fields: AI_PROMPT_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/ai/prompts/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Update an AI Hub prompt",
        params: ID_PARAM,
        allowed_body_fields: AI_PROMPT_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/ai/prompts/{id}",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Delete an AI Hub prompt",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/ai/seed",
        scope: Scope::Write,
        section: "AI Hub",
        admin_paths: &["/admin/ai-page"],
        summary: "Seed empty AI Hub tables from defaults",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Resume Studio
    CatalogEntry {
        method: "PUT",
        path: "/api/admin/resume",
        scope: Scope::Write,
        section: "Resume Studio",
        admin_paths: &["/admin/resume"],
        summary: "Save Resume Studio LaTeX source, snapshots, and ideas",
        params: &[],
        allowed_body_fields: &["latex", "engine", "templateId", "snapshots", "activeVersionId", "ideas", "lastCompiledAt", "lastPublishedAt"],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/admin/resume/compile",
        scope: Scope::Write,
        section: "Resume Studio",
        admin_paths: &["/admin/resume"],
        summary: "Compile Resume Studio LaTeX to PDF",
        params: &[],
        allowed_body_fields: &["latex", "engine"],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/admin/resume/publish",
        scope: Scope::Write,
        section: "Resume Studio",
        admin_paths: &["/admin/resume"],
        summary: "Publish a compiled PDF as the site resume",
        params: &[],
        allowed_body_fields: &["pdfBase64", "filename"],
        redactions: &[],
    },
    // Footer (Socials)
    CatalogEntry {
        method: "POST",
        path: "/api/socials",
        scope: Scope::Write,
        section: "Footer",
        admin_paths: &["/admin/footer"],
        summary: "Create a social link",
        params: &[],
        allowed_body_fields: SOCIAL_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/socials/{id}",
        scope: Scope::Write,
        section: "Footer",
        admin_paths: &["/admin/footer"],
        summary: "Update a social link by id",
        params: ID_PARAM,
        allowed_body_fields: SOCIAL_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/socials/{id}",
        scope: Scope::Write,
        section: "Footer",
        admin_paths: &["/admin/footer"],
        summary: "Delete a social link by id",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Contact
    CatalogEntry {
        method: "DELETE",
        path: "/api/contact/message",
        scope: Scope::Write,
        section: "Contact",
        admin_paths: &["/admin/contact"],
        summary: "Delete a contact message by query id",
        params: &[Param { name: "id", location: ParamLocation::Query, required: true, description: "Contact message id" }],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Themes
    CatalogEntry {
        method: "POST",
        path: "/api/themes",
        scope: Scope::Write,
        section: "Themes",
        admin_paths: &["/admin/themes"],
        summary: "Create a custom theme",
        params: &[],
        allowed_body_fields: THEME_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "PUT",
        path: "/api/themes/{id}",
        scope: Scope::Write,
        section: "Themes",
        admin_paths: &["/admin/themes"],
        summary: "Update a custom theme by id or slug",
        params: ID_PARAM,
        allowed_body_fields: THEME_FIELDS,
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/themes/{id}",
        scope: Scope::Write,
        section: "Themes",
        admin_paths: &["/admin/themes"],
        summary: "Delete a custom theme by id or slug",
        params: ID_PARAM,
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "PATCH",
        path: "/api/themes/active",
        scope: Scope::Write,
        section: "Themes",
        admin_paths: &["/admin/themes"],
        summary: "Set the active theme, variant, or per-page theme overrides",
        params: &[],
        allowed_body_fields: &["themeSlug", "variant", "perPageThemes"],
        redactions: &[],
    },
    // Config, Desktop, Terminal, Settings
    CatalogEntry {
        method: "PUT",
        path: "/api/config",
        scope: Scope::Write,
        section: "Config",
        admin_paths: &["/admin/config", "/admin/desktop", "/admin/terminal", "/admin/settings"],
        summary: "Update allow-listed site configuration fields (no secrets or webhooks)",
        params: &[],
        allowed_body_fields: CONFIG_WRITE_FIELDS,
        redactions: CONFIG_REDACTIONS,
    },
    // Ads
    CatalogEntry {
        method: "PUT",
        path: "/api/admin/ads",
        scope: Scope::Write,
        section: "Ads",
        admin_paths: &["/admin/ads"],
        summary: "Update Google AdSense configuration and placements",
        params: &[],
        allowed_body_fields: &["adsenseEnabled", "clientId", "adsTxt", "placements"],
        redactions: &[],
    },
    // SEO & Crawl (NO serviceAccount field allowed!)
    CatalogEntry {
        method: "PUT",
        path: "/api/admin/seo/config",
        scope: Scope::Write,
        section: "SEO & Crawl",
        admin_paths: &["/admin/seo"],
        summary: "Update SEO robots, sitemap, and indexing settings (serviceAccount excluded)",
        params: &[],
        allowed_body_fields: &["robots", "sitemap", "indexing"],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/admin/seo/crawl",
        scope: Scope::Write,
        section: "SEO & Crawl",
        admin_paths: &["/admin/seo"],
        summary: "Crawl sitemap URLs and report SEO issues",
        params: &[],
        allowed_body_fields: &["limit"],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/admin/seo/index",
        scope: Scope::Write,
        section: "SEO & Crawl",
        admin_paths: &["/admin/seo"],
        summary: "Submit URLs to Google Indexing API",
        params: &[],
        allowed_body_fields: &["urls", "type"],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/admin/seo/fix",
        scope: Scope::Write,
        section: "SEO & Crawl",
        admin_paths: &["/admin/seo"],
        summary: "Auto-fix SEO issues for a blog, project, app, or static config using AI",
        params: &[],
        allowed_body_fields: &["type", "id"],
        redactions: &[],
    },
    // Social & Metadata
    CatalogEntry {
        method: "PUT",
        path: "/api/admin/social",
        scope: Scope::Write,
        section: "Social & Metadata",
        admin_paths: &["/admin/social"],
        summary: "Update per-page Open Graph and social metadata",
        params: &[],
        allowed_body_fields: &["social"],
        redactions: &[],
    },
    // Server Health
    CatalogEntry {
        method: "POST",
        path: "/api/admin/health/targets",
        scope: Scope::Write,
        section: "Server Health",
        admin_paths: &["/admin/health"],
        summary: "Add a custom uptime monitoring target",
        params: &[],
        allowed_body_fields: &["label", "url"],
        redactions: &[],
    },
    CatalogEntry {
        method: "DELETE",
        path: "/api/admin/health/targets",
        scope: Scope::Write,
        section: "Server Health",
        admin_paths: &["/admin/health"],
        summary: "Delete a custom uptime monitoring target by query id",
        params: &[Param { name: "id", location: ParamLocation::Query, required: true, description: "Uptime target id" }],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/admin/health/uptime/check",
        scope: Scope::Write,
        section: "Server Health",
        admin_paths: &["/admin/health"],
        summary: "Run uptime checks now across all targets",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/admin/health/analyze",
        scope: Scope::Write,
        section: "Server Health",
        admin_paths: &["/admin/health"],
        summary: "Analyze recent failures and pasted logs using AI Core",
        params: &[],
        allowed_body_fields: &["logText"],
        redactions: &[],
    },
    // GitHub (NO githubToken or webhookSecret allowed!)
    CatalogEntry {
        method: "PUT",
        path: "/api/github/config",
        scope: Scope::Write,
        section: "GitHub",
        admin_paths: &["/admin/github"],
        summary: "Update non-secret GitHub integration settings",
        params: &[],
        allowed_body_fields: &["username", "includePrivate", "hiddenRepos", "sections", "enabled"],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/github/sync",
        scope: Scope::Write,
        section: "GitHub",
        admin_paths: &["/admin/github"],
        summary: "Sync selected GitHub repositories into portfolio projects",
        params: &[],
        allowed_body_fields: &["repos", "repo"],
        redactions: &[],
    },
    // Cron Jobs (timezone ONLY)
    CatalogEntry {
        method: "POST",
        path: "/api/admin/crons/timezone",
        scope: Scope::Write,
        section: "Cron Jobs",
        admin_paths: &["/admin/config/crons"],
        summary: "Update default cron scheduler timezone",
        params: &[],
        allowed_body_fields: &["timezone"],
        redactions: &[],
    },
    // Database (gdrive/backup ONLY)
    CatalogEntry {
        method: "POST",
        path: "/api/admin/gdrive/backup",
        scope: Scope::Write,
        section: "Database",
        admin_paths: &["/admin/database"],
        summary: "Trigger an on-demand backup archive to Google Drive",
        params: &[
            Param { name: "collections", location: ParamLocation::Query, required: false, description: "Comma-separated collection keys" },
            Param { name: "includeImages", location: ParamLocation::Query, required: false, description: "Set to false to exclude uploads" },
        ],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // Resources (purge-cache; uploads use `codemode.upload({ name, type, base64 })`)
    CatalogEntry {
        method: "POST",
        path: "/api/admin/purge-cache",
        scope: Scope::Write,
        section: "Resources",
        admin_paths: &["/admin/resources"],
        summary: "Purge in-memory server caches",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
    // AI Core
    CatalogEntry {
        method: "POST",
        path: "/api/admin/ai/text",
        scope: Scope::Write,
        section: "AI Core",
        admin_paths: &["/admin/ai"],
        summary: "Generate text using configured AI Core providers",
        params: &[],
        allowed_body_fields: &["prompt", "mode", "context"],
        redactions: &[],
    },
    CatalogEntry {
        method: "POST",
        path: "/api/admin/ai/generate",
        scope: Scope::Write,
        section: "AI Core",
        admin_paths: &["/admin/ai"],
        summary: "Generate an image caption using configured AI Core vision providers",
        params: &[],
        allowed_body_fields: &[],
        redactions: &[],
    },
];

/// Validate a Code Mode request path before matching against the catalog.
///
/// Rules:
/// - Must start with `/api/` and have at least one non-empty segment after it.
/// - Must never target `/api/codemode` or `/api/codemode/*`.
/// - Must not contain `..`, `//`, `%`, `?`, `#`, `\`, or ASCII control characters.
pub fn validate_path(path: &str) -> Result<(), &'static str> {
    if !path.starts_with("/api/") {
        return Err("path must start with /api/");
    }
    if path.len() <= "/api/".len() {
        return Err("path must specify a route under /api/");
    }
    if path == "/api/codemode" || path.starts_with("/api/codemode/") {
        return Err("path cannot target /api/codemode/*");
    }
    if path.contains("..") {
        return Err("path must not contain '..'");
    }
    if path.contains("//") {
        return Err("path must not contain '//'");
    }
    if path.contains('%') {
        return Err("path must not contain '%'");
    }
    if path.contains('?') {
        return Err("path must not contain '?' (pass query parameters via `query`)");
    }
    if path.contains('#') {
        return Err("path must not contain '#'");
    }
    if path.contains('\\') || path.bytes().any(|b| b < 0x20 || b == 0x7f) {
        return Err("path contains invalid characters");
    }
    Ok(())
}

fn pattern_matches(pattern: &str, path: &str) -> bool {
    let mut pat_segs = pattern.split('/');
    let mut path_segs = path.split('/');
    loop {
        match (pat_segs.next(), path_segs.next()) {
            (None, None) => return true,
            (Some(p), Some(s)) => {
                if p.starts_with('{') && p.ends_with('}') && p.len() > 2 {
                    if s.is_empty() {
                        return false;
                    }
                } else if p != s {
                    return false;
                }
            }
            _ => return false,
        }
    }
}

/// Match an HTTP method and validated path against `CATALOG` within `scope`.
/// Exact literal path matches take precedence over parameterized `{id}` matches.
pub fn match_entry(method: &str, path: &str, scope: Scope) -> Option<&'static CatalogEntry> {
    validate_path(path).ok()?;
    let method_ok = |e: &&CatalogEntry| e.method.eq_ignore_ascii_case(method) && scope.allows(e.scope);

    // Prefer exact literal matches first (e.g., `/api/themes/active` over `/api/themes/{id}`).
    if let Some(exact) = CATALOG.iter().filter(method_ok).find(|e| e.path == path) {
        return Some(exact);
    }
    CATALOG
        .iter()
        .filter(method_ok)
        .find(|e| pattern_matches(e.path, path))
}

/// Strip every path expression in `redactions` from `value` in place.
///
/// Path syntax: dot-separated object keys, with an optional `[]` suffix on a key to
/// traverse every element of an array (e.g. `data[].webhookEnv`, `ai.providers[].apiKey`).
pub fn apply_redactions(value: &mut Value, redactions: &[&str]) {
    for expr in redactions {
        let segments: Vec<&str> = expr.split('.').filter(|s| !s.is_empty()).collect();
        if !segments.is_empty() {
            redact_segments(value, &segments);
        }
    }
}

fn redact_segments(value: &mut Value, segments: &[&str]) {
    let Some((&first, rest)) = segments.split_first() else {
        return;
    };
    if let Some(key) = first.strip_suffix("[]") {
        let target = if key.is_empty() {
            Some(value)
        } else {
            value.as_object_mut().and_then(|map| map.get_mut(key))
        };
        if let Some(Value::Array(items)) = target {
            if rest.is_empty() {
                items.clear();
            } else {
                for item in items {
                    redact_segments(item, rest);
                }
            }
        }
        return;
    }

    let Some(map) = value.as_object_mut() else {
        return;
    };
    if rest.is_empty() {
        map.shift_remove(first);
    } else if let Some(child) = map.get_mut(first) {
        redact_segments(child, rest);
    }
}

/// Generate an OpenAPI 3.1.0 document filtered to operations allowed by `scope`.
pub fn openapi_document(scope: Scope) -> Value {
    let mut paths = Map::new();

    for entry in CATALOG.iter().filter(|e| scope.allows(e.scope)) {
        let method_key = entry.method.to_ascii_lowercase();
        let mut op = Map::new();
        op.insert("summary".into(), json!(entry.summary));
        op.insert("tags".into(), json!([entry.section]));
        op.insert("x-scope".into(), json!(entry.scope.as_str()));

        if !entry.params.is_empty() {
            let params: Vec<Value> = entry
                .params
                .iter()
                .map(|p| {
                    json!({
                        "name": p.name,
                        "in": p.location.as_str(),
                        "required": p.required,
                        "description": p.description,
                        "schema": { "type": "string" },
                    })
                })
                .collect();
            op.insert("parameters".into(), Value::Array(params));
        }

        if !entry.allowed_body_fields.is_empty() {
            let props: Map<String, Value> = entry
                .allowed_body_fields
                .iter()
                .map(|&f| (f.to_string(), json!({})))
                .collect();
            op.insert(
                "requestBody".into(),
                json!({
                    "required": true,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": props,
                                "additionalProperties": false,
                            }
                        }
                    }
                }),
            );
        }

        if !entry.redactions.is_empty() {
            op.insert("x-redacted-fields".into(), json!(entry.redactions));
        }

        op.insert(
            "responses".into(),
            json!({
                "200": { "description": "Successful response" }
            }),
        );

        let path_item = paths
            .entry(entry.path.to_string())
            .or_insert_with(|| Value::Object(Map::new()));
        if let Value::Object(methods) = path_item {
            methods.insert(method_key, Value::Object(op));
        }
    }

    let mut doc = json!({
        "openapi": "3.1.0",
        "info": {
            "title": "Aiyu Admin API (Code Mode)",
            "version": "1.0.0",
            "description": "Allow-listed admin API operations reachable from Code Mode scripts."
        },
        "paths": Value::Object(paths),
    });
    if scope.allows(Scope::Write) {
        if let Some(obj) = doc.as_object_mut() {
            obj.insert(
                "x-codemode-upload".into(),
                json!({
                    "helper": "codemode.upload({ name, type, base64 })",
                    "target": "POST /api/upload",
                    "scope": "write",
                    "description": "Uploads a base64-encoded image as multipart/form-data to /api/upload and returns { status, data }."
                }),
            );
        }
    }
    doc
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_matches_win_over_parameterized_matches() {
        let active = match_entry("GET", "/api/themes/active", Scope::Read).unwrap();
        assert_eq!(active.path, "/api/themes/active");
        let custom = match_entry("GET", "/api/themes/my-theme", Scope::Read).unwrap();
        assert_eq!(custom.path, "/api/themes/{id}");
    }

    #[test]
    fn scope_comparison_and_method_case_insensitivity() {
        assert!(Scope::Read.allows(Scope::Read));
        assert!(!Scope::Read.allows(Scope::Write));
        assert!(Scope::Write.allows(Scope::Read));
        assert!(Scope::Write.allows(Scope::Write));

        let hit = match_entry("get", "/api/blogs", Scope::Read);
        assert!(hit.is_some());
        assert!(match_entry("POST", "/api/blogs", Scope::Read).is_none());
    }

    #[test]
    fn redactions_handle_nested_arrays_and_missing_keys() {
        let mut doc = json!({
            "siteTitle": "My Site",
            "gdriveConfig": { "clientSecret": "sealed" },
            "ai": {
                "gatewayApiKey": "gw-secret",
                "providers": [
                    { "id": "1", "type": "openai", "apiKey": "sk-1" },
                    { "id": "2", "type": "groq", "apiKey": "sk-2" }
                ]
            },
            "n8nWebhookAuthKey": "n8n-key"
        });
        apply_redactions(&mut doc, CONFIG_REDACTIONS);
        assert_eq!(doc["siteTitle"], json!("My Site"));
        assert!(doc.get("gdriveConfig").is_none());
        assert!(doc.get("n8nWebhookAuthKey").is_none());
        assert!(doc["ai"].get("gatewayApiKey").is_none());
        assert!(doc["ai"]["providers"][0].get("apiKey").is_none());
        assert!(doc["ai"]["providers"][1].get("apiKey").is_none());
        assert_eq!(doc["ai"]["providers"][0]["id"], json!("1"));

        // Redacting a non-object / missing paths is a no-op.
        let mut empty = json!({ "ok": true });
        apply_redactions(&mut empty, NOTIFICATIONS_REDACTIONS);
        assert_eq!(empty, json!({ "ok": true }));
    }
}
