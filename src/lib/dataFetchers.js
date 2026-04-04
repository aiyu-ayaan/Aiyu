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

import dbConnect from '@/lib/db';
import cache, { CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import HomeModel from '@/models/Home';
import AboutModel from '@/models/About';
import ProjectModel from '@/models/Project';
import DeploymentModel from '@/models/Deployment';
import BlogModel from '@/models/Blog';
import ConfigModel from '@/models/Config';
import HeaderModel from '@/models/Header';
import SocialModel from '@/models/Social';
import GalleryModel from '@/models/Gallery';
import { backfillMissingBlogSlugs, resolveBlogByIdentifier } from '@/lib/blogSlugs';

const CACHE_KEY_CONFIG_PUBLIC = 'db:config:public';
const CACHE_KEY_CONFIG_LAYOUT = 'db:config:layout';
const CACHE_KEY_ABOUT_LAYOUT = 'db:about:layout';
const CACHE_KEY_ABOUT_HOME = 'db:about:home';
const CACHE_KEY_PROJECTS_HOME = 'db:projects:home';

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
    'projectsTitle',
    'projectsSubtitle',
    'galleryTitle',
    'gallerySubtitle',
    'favicon.filename',
    'favicon.mimeType',
].join(' ');

const HOME_ABOUT_SELECT = ['name', 'skills', 'professionalSummary'].join(' ');
const HOME_PROJECTS_SELECT = ['name', 'techStack', 'year', 'status', 'projectType', 'description', 'codeLink', 'blogLink', 'image'].join(' ');
const HOME_BLOGS_SELECT = ['title', 'slug', 'content', 'image', 'date', 'createdAt'].join(' ');
const BLOG_LIST_SELECT = ['title', 'slug', 'content', 'image', 'date', 'createdAt', 'updatedAt', 'published', 'tags'].join(' ');
const GALLERY_LIST_SELECT = ['src', 'thumbnail', 'description', 'width', 'height', 'isPinned', 'order', 'createdAt'].join(' ');

// Helper to safely serialize Mongoose docs to plain objects
function serialize(data) {
    if (!data) return null;
    return JSON.parse(JSON.stringify(data));
}

function createDbEnsurer() {
    let connectionPromise = null;
    return async () => {
        if (!connectionPromise) {
            connectionPromise = dbConnect();
        }
        await connectionPromise;
    };
}

function sanitizeConfigForPublic(configData) {
    const config = serialize(configData);
    if (!config) return null;

    const hasCustomFavicon = Boolean(config?.favicon?.value || config?.favicon?.filename || config?.favicon?.mimeType);

    if (config.favicon && typeof config.favicon === 'object') {
        delete config.favicon.value;
    }
    delete config.encryptedGithubToken;
    delete config.encryptedGeminiApiKey;

    const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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

    return plainBlogs.map((blog) => ({
        ...blog,
        content: typeof blog?.content === 'string' ? blog.content.slice(0, maxLength) : '',
    }));
}

/**
 * Fetch all data needed for the site layout (header, footer, config)
 */
export async function getLayoutData() {
    const ensureDb = createDbEnsurer();

    const [headerData, socialData, configData, aboutData] = await Promise.all([
        cache.getOrSet(CACHE_KEYS.HEADER, async () => {
            await ensureDb();
            return HeaderModel.findOne().lean();
        }, CACHE_TTL.LONG),
        cache.getOrSet(CACHE_KEYS.SOCIALS, async () => {
            await ensureDb();
            return SocialModel.find().lean();
        }, CACHE_TTL.LONG),
        cache.getOrSet(CACHE_KEY_CONFIG_LAYOUT, async () => {
            await ensureDb();
            return ConfigModel.findOne().select(CONFIG_PUBLIC_SELECT).lean();
        }, CACHE_TTL.LONG),
        cache.getOrSet(CACHE_KEY_ABOUT_LAYOUT, async () => {
            await ensureDb();
            return AboutModel.findOne().select('name').lean();
        }, CACHE_TTL.LONG),
    ]);

    return {
        headerData: serialize(headerData),
        socialData: socialData ? JSON.parse(JSON.stringify(socialData)) : [],
        configData: sanitizeConfigForPublic(configData),
        aboutData: serialize(aboutData),
    };
}

/**
 * Fetch all data needed for the home page.
 */
export async function getHomePageData() {
    const ensureDb = createDbEnsurer();

    const [homeData, aboutData, projectsData, blogsData, configData] = await Promise.all([
        cache.getOrSet(CACHE_KEYS.HOME, async () => {
            await ensureDb();
            return HomeModel.findOne().lean();
        }, CACHE_TTL.LONG),
        cache.getOrSet(CACHE_KEY_ABOUT_HOME, async () => {
            await ensureDb();
            return AboutModel.findOne().select(HOME_ABOUT_SELECT).lean();
        }, CACHE_TTL.LONG),
        cache.getOrSet(
            CACHE_KEY_PROJECTS_HOME,
            async () => {
                await ensureDb();
                return ProjectModel.find().sort({ year: -1 }).limit(2).select(HOME_PROJECTS_SELECT).lean();
            },
            CACHE_TTL.LONG
        ),
        cache.getOrSet(CACHE_KEYS.BLOGS_RECENT, async () => {
            await ensureDb();
            await backfillMissingBlogSlugs(BlogModel);
            return BlogModel.find({ published: { $ne: false } }).sort({ createdAt: -1 }).limit(3).select(HOME_BLOGS_SELECT).lean();
        },
            CACHE_TTL.MEDIUM
        ),
        cache.getOrSet(CACHE_KEY_CONFIG_PUBLIC, async () => {
            await ensureDb();
            return ConfigModel.findOne().select(CONFIG_PUBLIC_SELECT).lean();
        }, CACHE_TTL.LONG),
    ]);

    return {
        homeData: serialize(homeData),
        aboutData: serialize(aboutData),
        projectsData: projectsData ? JSON.parse(JSON.stringify(projectsData)) : [],
        blogsData: toBlogPreview(blogsData),
        configData: sanitizeConfigForPublic(configData),
    };
}

/**
 * Fetch config data only (for metadata generation across all pages)
 */
export async function getConfigData() {
    const ensureDb = createDbEnsurer();

    const configData = await cache.getOrSet(
        CACHE_KEY_CONFIG_PUBLIC,
        async () => {
            await ensureDb();
            return ConfigModel.findOne().select(CONFIG_PUBLIC_SELECT).lean();
        },
        CACHE_TTL.LONG
    );
    return sanitizeConfigForPublic(configData);
}

/**
 * Fetch about page data
 */
export async function getAboutData() {
    const ensureDb = createDbEnsurer();

    const aboutData = await cache.getOrSet(
        CACHE_KEYS.ABOUT,
        async () => {
            await ensureDb();
            return AboutModel.findOne().lean();
        },
        CACHE_TTL.LONG
    );
    return serialize(aboutData);
}

/**
 * Fetch all projects
 */
export async function getProjectsData() {
    const ensureDb = createDbEnsurer();

    const projectsData = await cache.getOrSet(
        CACHE_KEYS.PROJECTS,
        async () => {
            await ensureDb();
            return ProjectModel.find().sort({ year: -1 }).lean();
        },
        CACHE_TTL.LONG
    );
    return projectsData ? JSON.parse(JSON.stringify(projectsData)) : [];
}

/**
 * Fetch all apps / deployments
 */
export async function getDeploymentsData() {
    const ensureDb = createDbEnsurer();

    const deploymentsData = await cache.getOrSet(
        CACHE_KEYS.DEPLOYMENTS,
        async () => {
            await ensureDb();
            const deployments = await DeploymentModel.find().lean();
            return sortDeployments(deployments);
        },
        CACHE_TTL.LONG
    );

    return deploymentsData ? JSON.parse(JSON.stringify(deploymentsData)) : [];
}

/**
 * Fetch a single blog by ID
 */
export async function getBlogById(id) {
    const cacheKey = `db:blog:${id}`;
    const ensureDb = createDbEnsurer();

    const blog = await cache.getOrSet(
        cacheKey,
        async () => {
            await ensureDb();
            return resolveBlogByIdentifier(BlogModel, id);
        },
        CACHE_TTL.MEDIUM
    );
    return serialize(blog);
}

/**
 * Fetch published blogs
 */
export async function getPublishedBlogs() {
    const ensureDb = createDbEnsurer();

    const blogs = await cache.getOrSet(
        CACHE_KEYS.BLOGS_PUBLISHED,
        async () => {
            await ensureDb();
            await backfillMissingBlogSlugs(BlogModel);
            return BlogModel.find({ published: { $ne: false } }).sort({ createdAt: -1 }).select(BLOG_LIST_SELECT).lean();
        },
        CACHE_TTL.MEDIUM
    );
    return blogs ? toBlogPreview(blogs, 500) : [];
}

/**
 * Fetch all gallery items.
 */
export async function getGalleryData() {
    const ensureDb = createDbEnsurer();

    const galleryData = await cache.getOrSet(
        CACHE_KEYS.GALLERY,
        async () => {
            await ensureDb();
            return GalleryModel.find({}).sort({ isPinned: -1, order: 1, createdAt: -1 }).select(GALLERY_LIST_SELECT).lean();
        },
        CACHE_TTL.MEDIUM
    );

    return galleryData ? JSON.parse(JSON.stringify(galleryData)) : [];
}
