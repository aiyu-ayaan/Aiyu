/**
 * Cached data fetchers for site pages.
 * 
 * This module provides cached, parallelized database queries
 * that are shared between layout and page components.
 * 
 * Benefits:
 * - In-memory cache reduces DB hits by ~90%
 * - Promise.all parallelizes independent queries
 * - Shared fetchers prevent duplicate queries between layout & page
 */

import { prisma } from '@/lib/prisma';
import { getSingleton, toClientList } from '@/lib/serialize';
import cache, { CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { resolveBlogByIdentifier } from '@/lib/blogSlugs';
import { getBlogSlug } from '@/lib/blogSlugs';
import { getDeploymentSlug, getProjectSlug } from '@/lib/contentSlugs';
import { getReadTime } from '@/app/components/blogs/blogUtils';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_AI_PAGE } from '@/lib/aiPageDefaults';
import { hydrateAiSections } from '@/lib/aiSections';

const IS_PRODUCTION_BUILD = process.env.NEXT_PHASE === 'phase-production-build';
const ALLOW_DB_DURING_BUILD = process.env.ALLOW_DB_DURING_BUILD === 'true';
const LOG_BUILD_FALLBACKS = process.env.LOG_BUILD_FALLBACKS === 'true';
const SKIP_DB_DURING_BUILD = IS_PRODUCTION_BUILD && !ALLOW_DB_DURING_BUILD;

const CACHE_KEY_CONFIG_PUBLIC = 'db:config:public';
const CACHE_KEY_CONFIG_LAYOUT = 'db:config:layout';
const CACHE_KEY_ABOUT_LAYOUT = 'db:about:layout';
const CACHE_KEY_ABOUT_HOME = 'db:about:home:v2';
const CACHE_KEY_PROJECTS_HOME = 'db:projects:home:v2';
const CACHE_KEY_BLOG_SLUGS = 'db:blogs:slugs';
const CACHE_KEY_PROJECT_SLUGS = 'db:projects:slugs';
const CACHE_KEY_DEPLOYMENT_SLUGS = 'db:deployments:slugs';

const extractDeploymentOrder = (deployment) => {
    const parsedOrder = Number.parseInt(deployment?.displayOrder, 10);
    return Number.isNaN(parsedOrder) ? Number.MAX_SAFE_INTEGER : parsedOrder;
};

const sortDeployments = (deployments = []) => {
    return [...deployments].sort((a, b) => {
        const orderDifference = extractDeploymentOrder(a) - extractDeploymentOrder(b);
        if (orderDifference !== 0) return orderDifference;

        const firstUpdatedAt = new Date(a?.updatedAt || 0).getTime();
        const secondUpdatedAt = new Date(b?.updatedAt || 0).getTime();
        return secondUpdatedAt - firstUpdatedAt;
    });
};

const extractProjectDisplayOrder = (project) => {
    const parsedOrder = Number.parseInt(project?.displayOrder, 10);
    return Number.isNaN(parsedOrder) ? Number.MAX_SAFE_INTEGER : parsedOrder;
};

const extractProjectYear = (yearValue) => {
    const matches = String(yearValue || '').match(/\d{4}/g);
    if (!matches || matches.length === 0) return 0;
    const finalYear = Number.parseInt(matches[matches.length - 1], 10);
    return Number.isNaN(finalYear) ? 0 : finalYear;
};

const sortProjects = (projects = []) => {
    return [...projects].sort((a, b) => {
        const orderDifference = extractProjectDisplayOrder(a) - extractProjectDisplayOrder(b);
        if (orderDifference !== 0) return orderDifference;
        return extractProjectYear(b?.year) - extractProjectYear(a?.year);
    });
};

const CONFIG_PUBLIC_SELECT = [
    'siteTitle',
    'siteDescription',
    'logoText',
    'ogImage',
    'profession',
    'authorName',
    'googleAnalyticsId',
    'resume',
    'contactLocation',
    'contactEmail',
    'contactStatus',
    'footerText',
    'footerText2',
    'showWorkStatus',
    'workStatus',
    'footerVersion',
    'footerVersionLink',
    'terminal',
    'blogsTitle',
    'blogsSubtitle',
    'isBlogAutomated',
    'blogAutomationMessage',
    'showBlogViewCount',
    'projectsTitle',
    'projectsSubtitle',
    'galleryTitle',
    'gallerySubtitle',
    'defaultSiteVersion',
    'favicon.filename',
    'favicon.mimeType',
].join(' ');

const HOME_ABOUT_SELECT = ['name', 'skills', 'experiences', 'professionalSummary'].join(' ');
const HOME_PROJECTS_SELECT = ['name', 'techStack', 'year', 'status', 'projectType', 'description', 'codeLink', 'blogLink', 'image', 'displayOrder'].join(' ');
const HOME_BLOGS_SELECT = ['title', 'slug', 'content', 'excerpt', 'image', 'imageAlt', 'date', 'createdAt'].join(' ');
const BLOG_LIST_SELECT = ['title', 'slug', 'content', 'excerpt', 'image', 'imageAlt', 'date', 'createdAt', 'updatedAt', 'published', 'tags', 'seoTitle', 'seoDescription', 'canonicalUrl', 'keywords', 'socialTitle', 'socialDescription', 'socialImage', 'socialImageAlt', 'noIndex', 'isAutomated'].join(' ');
const GALLERY_LIST_SELECT = ['src', 'thumbnail', 'description', 'width', 'height', 'isPinned', 'order', 'createdAt'].join(' ');
const PROJECT_LIST_SELECT = ['name', 'slug', 'techStack', 'year', 'status', 'projectType', 'description', 'codeLink', 'blogLink', 'image', 'displayOrder', 'updatedAt', 'createdAt'].join(' ');
const DEPLOYMENT_LIST_SELECT = ['name', 'slug', 'techStack', 'status', 'appType', 'environment', 'hostingProvider', 'description', 'hostedUrl', 'blogLink', 'image', 'displayOrder', 'updatedAt', 'createdAt'].join(' ');
const DEFAULT_SITE_DESCRIPTION = 'Professional portfolio showcasing projects, blogs, and expertise.';
export const DEFAULT_BLOG_PAGE_SIZE = 6;
const FALLBACK_CONFIG = {
    siteTitle: 'Portfolio',
    siteDescription: DEFAULT_SITE_DESCRIPTION,
    logoText: '< aiyu />',
    profession: 'full stack',
    hasCustomFavicon: false,
};

if (!global.__dataFetcherFallbackWarnings) {
    global.__dataFetcherFallbackWarnings = new Set();
}

function warnFetcherFallback(scope, error = null) {
    const warningKey = error ? `${scope}:error` : `${scope}:build`;
    if (global.__dataFetcherFallbackWarnings.has(warningKey)) {
        return;
    }
    global.__dataFetcherFallbackWarnings.add(warningKey);

    if (error) {
        console.warn(`[dataFetchers] ${scope} fallback used: ${error?.message || 'Unknown error'}`);
        return;
    }

    if (LOG_BUILD_FALLBACKS) {
        console.warn(
            `[dataFetchers] ${scope} fallback used during production build. Set ALLOW_DB_DURING_BUILD=true to enable DB reads at build time.`
        );
    }
}

// Helper to safely serialize Mongoose docs to plain objects
function serialize(data) {
    if (!data) return null;
    return JSON.parse(JSON.stringify(data));
}

// Prisma connects lazily and pools internally, so an explicit "ensure" step is
// no longer required. Kept as a no-op so the existing call sites read unchanged.
function createDbEnsurer() {
    return async () => {};
}

// Public config field whitelist (top-level). Previously enforced by the Mongoose
// `.select(CONFIG_PUBLIC_SELECT)`; applied here in JS since getSingleton returns
// the full json `data` blob. `favicon.*` is handled separately below.
const PUBLIC_CONFIG_KEYS = CONFIG_PUBLIC_SELECT.split(' ').filter((key) => key && !key.startsWith('favicon'));

function sanitizeConfigForPublic(configData) {
    const fullConfig = serialize(configData);
    if (!fullConfig) return null;

    const hasCustomFavicon = Boolean(fullConfig?.favicon?.value || fullConfig?.favicon?.filename || fullConfig?.favicon?.mimeType);

    const config = {};
    for (const key of PUBLIC_CONFIG_KEYS) {
        if (fullConfig[key] !== undefined) {
            config[key] = fullConfig[key];
        }
    }

    if (fullConfig.favicon && typeof fullConfig.favicon === 'object') {
        config.favicon = {
            filename: fullConfig.favicon.filename || '',
            mimeType: fullConfig.favicon.mimeType || '',
        };
    }

    const baseUrl = getSiteUrl();
    const ogImageValue = typeof config?.ogImage === 'string' ? config.ogImage.trim() : '';
    if (ogImageValue) {
        config.ogImage = new URL(ogImageValue, baseUrl).toString();
    }

    return {
        ...config,
        hasCustomFavicon,
    };
}

function toBlogPreview(blogs, maxLength = 320) {
    if (!Array.isArray(blogs)) return [];

    const plainBlogs = serialize(blogs);
    if (!Array.isArray(plainBlogs)) return [];

    return plainBlogs.map((blog) => {
        const readTime = typeof blog?.content === 'string' ? getReadTime(blog.content) : '1 min read';
        return {
            ...blog,
            readTime,
            content: typeof blog?.content === 'string' ? blog.content.slice(0, maxLength) : '',
        };
    });
}

function normalizePaginationValue(value, fallback, { min = 1, max = 50 } = {}) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

/**
 * Fetch all data needed for the site layout (header, footer, config)
 */
export async function getLayoutData() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getLayoutData');
        return {
            headerData: null,
            socialData: [],
            configData: FALLBACK_CONFIG,
            aboutData: null,
        };
    }

    const ensureDb = createDbEnsurer();

    try {
        const [headerData, socialData, configData, aboutData] = await Promise.all([
            cache.getOrSet(CACHE_KEYS.HEADER, async () => {
                return getSingleton(prisma, 'header');
            }, CACHE_TTL.LONG),
            cache.getOrSet(CACHE_KEYS.SOCIALS, async () => {
                return toClientList('social', await prisma.social.findMany());
            }, CACHE_TTL.LONG),
            cache.getOrSet(CACHE_KEY_CONFIG_LAYOUT, async () => {
                return getSingleton(prisma, 'config');
            }, CACHE_TTL.LONG),
            cache.getOrSet(CACHE_KEY_ABOUT_LAYOUT, async () => {
                return getSingleton(prisma, 'about');
            }, CACHE_TTL.LONG),
        ]);

        return {
            headerData: serialize(headerData),
            socialData: socialData ? JSON.parse(JSON.stringify(socialData)) : [],
            configData: sanitizeConfigForPublic(configData) || FALLBACK_CONFIG,
            aboutData: serialize(aboutData),
        };
    } catch (error) {
        warnFetcherFallback('getLayoutData', error);
        return {
            headerData: null,
            socialData: [],
            configData: FALLBACK_CONFIG,
            aboutData: null,
        };
    }
}

/**
 * Fetch all data needed for the home page.
 */
export async function getHomePageData() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getHomePageData');
        return {
            homeData: null,
            aboutData: null,
            projectsData: [],
            blogsData: [],
            configData: FALLBACK_CONFIG,
        };
    }

    const ensureDb = createDbEnsurer();

    try {
        const [homeData, aboutData, projectsData, blogsData, configData] = await Promise.all([
            cache.getOrSet(CACHE_KEYS.HOME, async () => {
                return getSingleton(prisma, 'home');
            }, CACHE_TTL.LONG),
            cache.getOrSet(CACHE_KEY_ABOUT_HOME, async () => {
                return getSingleton(prisma, 'about');
            }, CACHE_TTL.LONG),
            cache.getOrSet(
                CACHE_KEY_PROJECTS_HOME,
                async () => {
                    const projects = toClientList('project', await prisma.project.findMany());
                    return sortProjects(projects);
                },
                CACHE_TTL.LONG
            ),
            cache.getOrSet(CACHE_KEYS.BLOGS_RECENT, async () => {
                return toClientList('blog', await prisma.blog.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, take: 3 }));
            },
                CACHE_TTL.MEDIUM
            ),
            cache.getOrSet(CACHE_KEY_CONFIG_PUBLIC, async () => {
                return getSingleton(prisma, 'config');
            }, CACHE_TTL.LONG),
        ]);

        return {
            homeData: serialize(homeData),
            aboutData: serialize(aboutData),
            projectsData: projectsData ? JSON.parse(JSON.stringify(projectsData)) : [],
            blogsData: toBlogPreview(blogsData),
            configData: sanitizeConfigForPublic(configData) || FALLBACK_CONFIG,
        };
    } catch (error) {
        warnFetcherFallback('getHomePageData', error);
        return {
            homeData: null,
            aboutData: null,
            projectsData: [],
            blogsData: [],
            configData: FALLBACK_CONFIG,
        };
    }
}

/**
 * Fetch config data only (for metadata generation across all pages)
 */
export async function getConfigData() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getConfigData');
        return FALLBACK_CONFIG;
    }

    const ensureDb = createDbEnsurer();

    try {
        const configData = await cache.getOrSet(
            CACHE_KEY_CONFIG_PUBLIC,
            async () => {
                return getSingleton(prisma, 'config');
            },
            CACHE_TTL.LONG
        );
        return sanitizeConfigForPublic(configData) || FALLBACK_CONFIG;
    } catch (error) {
        warnFetcherFallback('getConfigData', error);
        return FALLBACK_CONFIG;
    }
}

/**
 * Fetch about page data
 */
export async function getAboutData() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getAboutData');
        return null;
    }

    const ensureDb = createDbEnsurer();

    try {
        const aboutData = await cache.getOrSet(
            CACHE_KEYS.ABOUT,
            async () => {
                return getSingleton(prisma, 'about');
            },
            CACHE_TTL.LONG
        );
        return serialize(aboutData);
    } catch (error) {
        warnFetcherFallback('getAboutData', error);
        return null;
    }
}

/**
 * Fetch all projects
 */
export async function getProjectsData() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getProjectsData');
        return [];
    }

    const ensureDb = createDbEnsurer();

    try {
        const projectsData = await cache.getOrSet(
            CACHE_KEYS.PROJECTS,
            async () => {
                const projects = toClientList('project', await prisma.project.findMany());
                return sortProjects(projects);
            },
            CACHE_TTL.LONG
        );
        return projectsData ? JSON.parse(JSON.stringify(projectsData)) : [];
    } catch (error) {
        warnFetcherFallback('getProjectsData', error);
        return [];
    }
}

/**
 * Fetch all apps / deployments
 */
export async function getDeploymentsData() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getDeploymentsData');
        return [];
    }

    const ensureDb = createDbEnsurer();

    try {
        const deploymentsData = await cache.getOrSet(
            CACHE_KEYS.DEPLOYMENTS,
            async () => {
                const deployments = toClientList('deployment', await prisma.deployment.findMany());
                return sortDeployments(deployments);
            },
            CACHE_TTL.LONG
        );

        return deploymentsData ? JSON.parse(JSON.stringify(deploymentsData)) : [];
    } catch (error) {
        warnFetcherFallback('getDeploymentsData', error);
        return [];
    }
}

/**
 * Fetch a single blog by ID
 */
export async function getBlogById(id) {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getBlogById');
        return null;
    }

    const cacheKey = `db:blog:${id}`;
    const ensureDb = createDbEnsurer();

    try {
        const blog = await cache.getOrSet(
            cacheKey,
            async () => {
                return resolveBlogByIdentifier(null, id);
            },
            CACHE_TTL.MEDIUM
        );
        if (!blog || blog.published === false) {
            return null;
        }
        return serialize(blog);
    } catch (error) {
        warnFetcherFallback('getBlogById', error);
        return null;
    }
}

/**
 * Fetch published blogs
 */
export async function getPublishedBlogs() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getPublishedBlogs');
        return [];
    }

    const ensureDb = createDbEnsurer();

    try {
        const blogs = await cache.getOrSet(
            CACHE_KEYS.BLOGS_PUBLISHED,
            async () => {
                return toClientList('blog', await prisma.blog.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } }));
            },
            CACHE_TTL.MEDIUM
        );
        return blogs ? toBlogPreview(blogs, 500) : [];
    } catch (error) {
        warnFetcherFallback('getPublishedBlogs', error);
        return [];
    }
}

export async function getPublishedBlogsPage(options = {}) {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getPublishedBlogsPage');
        return {
            blogs: [],
            pagination: {
                page: 1,
                limit: DEFAULT_BLOG_PAGE_SIZE,
                total: 0,
                totalPages: 0,
                hasMore: false,
            },
        };
    }

    const page = normalizePaginationValue(options?.page, 1, { min: 1, max: 1000 });
    const limit = normalizePaginationValue(options?.limit, DEFAULT_BLOG_PAGE_SIZE, { min: 1, max: 24 });
    const skip = (page - 1) * limit;
    const ensureDb = createDbEnsurer();
    const query = { published: true };
    const pageCacheKey = `${CACHE_KEYS.BLOGS_PUBLISHED}:page:${page}:limit:${limit}`;
    const countCacheKey = `${CACHE_KEYS.BLOGS_PUBLISHED}:count`;

    try {
        const [blogs, total] = await Promise.all([
            cache.getOrSet(
                pageCacheKey,
                async () => {
                    return toClientList('blog', await prisma.blog.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip, take: limit }));
                },
                CACHE_TTL.MEDIUM
            ),
            cache.getOrSet(
                countCacheKey,
                async () => {
                    return prisma.blog.count({ where: query });
                },
                CACHE_TTL.MEDIUM
            ),
        ]);

        const normalizedTotal = Number.isFinite(total) ? total : 0;
        const totalPages = normalizedTotal > 0 ? Math.ceil(normalizedTotal / limit) : 0;

        return {
            blogs: toBlogPreview(blogs, 500),
            pagination: {
                page,
                limit,
                total: normalizedTotal,
                totalPages,
                hasMore: page < totalPages,
            },
        };
    } catch (error) {
        warnFetcherFallback('getPublishedBlogsPage', error);
        return {
            blogs: [],
            pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0,
                hasMore: false,
            },
        };
    }
}

export async function getPublishedBlogSlugs() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getPublishedBlogSlugs');
        return [];
    }

    const ensureDb = createDbEnsurer();

    try {
        const blogs = await cache.getOrSet(
            CACHE_KEY_BLOG_SLUGS,
            async () => {
                return toClientList('blog', await prisma.blog.findMany({
                    where: { published: true },
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, slug: true, title: true },
                }));
            },
            CACHE_TTL.MEDIUM
        );

        return Array.isArray(blogs)
            ? blogs.map((blog) => getBlogSlug(blog)).filter(Boolean)
            : [];
    } catch (error) {
        warnFetcherFallback('getPublishedBlogSlugs', error);
        return [];
    }
}

export async function getProjectSlugs() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getProjectSlugs');
        return [];
    }

    const ensureDb = createDbEnsurer();

    try {
        const projects = await cache.getOrSet(
            CACHE_KEY_PROJECT_SLUGS,
            async () => {
                return toClientList('project', await prisma.project.findMany({
                    orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
                    select: { id: true, slug: true, name: true },
                }));
            },
            CACHE_TTL.LONG
        );

        return Array.isArray(projects)
            ? projects.map((project) => getProjectSlug(project)).filter(Boolean)
            : [];
    } catch (error) {
        warnFetcherFallback('getProjectSlugs', error);
        return [];
    }
}

export async function getDeploymentSlugs() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getDeploymentSlugs');
        return [];
    }

    const ensureDb = createDbEnsurer();

    try {
        const deployments = await cache.getOrSet(
            CACHE_KEY_DEPLOYMENT_SLUGS,
            async () => {
                return toClientList('deployment', await prisma.deployment.findMany({
                    orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
                    select: { id: true, slug: true, name: true },
                }));
            },
            CACHE_TTL.LONG
        );

        return Array.isArray(deployments)
            ? deployments.map((deployment) => getDeploymentSlug(deployment)).filter(Boolean)
            : [];
    } catch (error) {
        warnFetcherFallback('getDeploymentSlugs', error);
        return [];
    }
}

/**
 * Fetch all gallery items.
 */
export async function getGalleryData() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getGalleryData');
        return [];
    }

    const ensureDb = createDbEnsurer();

    try {
        const galleryData = await cache.getOrSet(
            CACHE_KEYS.GALLERY,
            async () => {
                return toClientList('gallery', await prisma.gallery.findMany({ orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }] }));
            },
            CACHE_TTL.MEDIUM
        );

        return galleryData ? JSON.parse(JSON.stringify(galleryData)) : [];
    } catch (error) {
        warnFetcherFallback('getGalleryData', error);
        return [];
    }
}

/**
 * Normalize a stored AI-page singleton into a usable config. Falls back to the
 * bundled defaults when the row is missing or malformed so the page always
 * renders something coherent.
 */
function normalizeAiPageConfig(raw) {
    const config = serialize(raw);
    if (!config || !Array.isArray(config.sections) || config.sections.length === 0) {
        return serialize(DEFAULT_AI_PAGE);
    }
    return config;
}

/**
 * Compute live AI telemetry from the AiLog table. Cheap aggregates only —
 * total calls, tokens, a 7-day window, the most-active model, and the top
 * provider — so the `stats` section can prove the site runs real workflows.
 * Returns zeroed metrics on any error rather than throwing.
 */
async function computeAiStats() {
    try {
        const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [totals, recent, byModel, byProvider] = await Promise.all([
            prisma.aiLog.aggregate({
                _sum: { totalTokens: true, inputTokens: true, outputTokens: true },
                _count: { _all: true },
            }),
            prisma.aiLog.aggregate({
                _sum: { totalTokens: true },
                _count: { _all: true },
                where: { createdAt: { gte: since7d } },
            }),
            prisma.aiLog.groupBy({
                by: ['model'],
                _sum: { totalTokens: true },
                _count: { _all: true },
                orderBy: { _count: { model: 'desc' } },
                take: 1,
            }),
            prisma.aiLog.groupBy({
                by: ['provider'],
                _count: { _all: true },
                orderBy: { _count: { provider: 'desc' } },
                take: 1,
            }),
        ]);

        return {
            totalCalls: totals._count?._all || 0,
            totalTokens: totals._sum?.totalTokens || 0,
            inputTokens: totals._sum?.inputTokens || 0,
            outputTokens: totals._sum?.outputTokens || 0,
            tokens7d: recent._sum?.totalTokens || 0,
            calls7d: recent._count?._all || 0,
            topModel: byModel[0]?.model || null,
            topModelCalls: byModel[0]?._count?._all || 0,
            topProvider: byProvider[0]?.provider || null,
        };
    } catch (error) {
        warnFetcherFallback('computeAiStats', error);
        return {
            totalCalls: 0,
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            tokens7d: 0,
            calls7d: 0,
            topModel: null,
            topModelCalls: 0,
            topProvider: null,
        };
    }
}

/**
 * Fetch the AI Hub config (schema-driven sections) plus live AiLog telemetry.
 * The section config is cached; telemetry is computed fresh (short-lived cache)
 * so the live dashboard stays current.
 */
export async function getAiPageData() {
    if (SKIP_DB_DURING_BUILD) {
        warnFetcherFallback('getAiPageData');
        return { config: serialize(DEFAULT_AI_PAGE), stats: null };
    }

    const ensureDb = createDbEnsurer();

    try {
        const [config, stats] = await Promise.all([
            cache.getOrSet(
                CACHE_KEYS.AI_PAGE,
                async () => hydrateAiSections(normalizeAiPageConfig(await getSingleton(prisma, 'aiPage'))),
                CACHE_TTL.LONG
            ),
            cache.getOrSet(
                `${CACHE_KEYS.AI_PAGE}:stats`,
                async () => computeAiStats(),
                CACHE_TTL.SHORT
            ),
        ]);

        return { config: serialize(config), stats: serialize(stats) };
    } catch (error) {
        warnFetcherFallback('getAiPageData', error);
        return { config: serialize(DEFAULT_AI_PAGE), stats: null };
    }
}
