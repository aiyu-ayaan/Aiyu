import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import cache, { CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { getSiteUrl } from '@/lib/siteUrl';

const CACHE_KEY_CONFIG_PUBLIC_API = 'db:config:public:api';

// Top-level config keys exposed publicly. Previously enforced by a Mongoose
// `.select(...)`; now applied in JS because the json `data` blob is returned
// whole. `favicon` is handled separately (only filename/mimeType are public).
const PUBLIC_CONFIG_KEYS = [
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
    'desktopWallpaper',
    'desktopDeviceName',
    'desktopOsVersion',
    'defaultSiteVersion',
    'activeTheme',
    'activeThemeVariant',
    'allowThemeSwitching',
    'perPageThemes',
    // Admin-only maturity labels (Beta/Alpha) pinned to admin sections. Not
    // sensitive; surfaced here so the admin shell can render badges.
    'adminSectionStages',
];

function sanitizePublicConfig(fullConfig) {
    if (!fullConfig) return null;

    const hasCustomFavicon = Boolean(
        fullConfig?.favicon?.value || fullConfig?.favicon?.filename || fullConfig?.favicon?.mimeType
    );
    const baseUrl = getSiteUrl();

    const safeConfig = {};
    for (const key of PUBLIC_CONFIG_KEYS) {
        if (fullConfig[key] !== undefined) {
            safeConfig[key] = fullConfig[key];
        }
    }

    if (fullConfig.favicon && typeof fullConfig.favicon === 'object') {
        safeConfig.favicon = {
            filename: fullConfig.favicon.filename || '',
            mimeType: fullConfig.favicon.mimeType || '',
        };
    }

    if (typeof safeConfig?.ogImage === 'string' && safeConfig.ogImage.trim()) {
        safeConfig.ogImage = new URL(safeConfig.ogImage.trim(), baseUrl).toString();
    }

    return {
        ...safeConfig,
        hasCustomFavicon,
    };
}

export async function GET() {
    const session = await getSession();

    try {
        if (session) {
            // Admin view: full config document, minus the withheld secret columns
            // (getSingleton omits Config secrets by default — matches the former
            // Mongoose `select:false` behaviour).
            let config = await getSingleton(prisma, 'config');
            if (!config) {
                config = await upsertSingleton(prisma, 'config', {});
            }
            return NextResponse.json(config);
        }

        const { value: config, meta } = await cache.getOrSetWithMeta(
            CACHE_KEY_CONFIG_PUBLIC_API,
            async () => {
                return getSingleton(prisma, 'config');
            },
            CACHE_TTL.MEDIUM
        );

        if (!config) {
            return NextResponse.json({}, {
                headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_SHORT),
            });
        }

        return NextResponse.json(sanitizePublicConfig(config), {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function PUT(request) {
    return updateConfig(request);
}

export async function POST(request) {
    return updateConfig(request);
}

async function updateConfig(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        // Partial update: upsertSingleton merges into the existing document so
        // different admin pages can patch different parts of the config without
        // clobbering each other (equivalent to the former $set semantics).
        const config = await upsertSingleton(prisma, 'config', body);
        await cache.invalidatePrefixAsync('db:config');
        await cache.invalidatePrefixAsync('db:themes');
        return NextResponse.json(config);
    } catch (error) {
        console.error('Config update error:', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}
