import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';
import { getSiteUrl } from '@/lib/siteUrl';

const CACHE_KEY_CONFIG_PUBLIC_API = 'db:config:public:api';

const PUBLIC_CONFIG_SELECT = [
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
    'projectsTitle',
    'projectsSubtitle',
    'galleryTitle',
    'gallerySubtitle',
    'activeTheme',
    'activeThemeVariant',
    'allowThemeSwitching',
    'perPageThemes',
    'favicon.filename',
    'favicon.mimeType',
].join(' ');

function sanitizePublicConfig(config) {
    if (!config) return null;

    const safeConfig = JSON.parse(JSON.stringify(config));
    const hasCustomFavicon = Boolean(safeConfig?.favicon?.value || safeConfig?.favicon?.filename || safeConfig?.favicon?.mimeType);
    const baseUrl = getSiteUrl();

    if (safeConfig.favicon && typeof safeConfig.favicon === 'object') {
        delete safeConfig.favicon.value;
    }
    if (typeof safeConfig?.ogImage === 'string' && safeConfig.ogImage.trim()) {
        safeConfig.ogImage = new URL(safeConfig.ogImage.trim(), baseUrl).toString();
    }
    delete safeConfig.encryptedGithubToken;
    delete safeConfig.encryptedGeminiApiKey;

    return {
        ...safeConfig,
        hasCustomFavicon,
    };
}

export async function GET() {
    const session = await getSession();

    try {
        if (session) {
            await dbConnect();
            let config = await Config.findOne().lean();
            if (!config) {
                config = await Config.create({});
            }
            return NextResponse.json(config);
        }

        const { value: config, meta } = await cache.getOrSetWithMeta(
            CACHE_KEY_CONFIG_PUBLIC_API,
            async () => {
                await dbConnect();
                return Config.findOne().select(PUBLIC_CONFIG_SELECT).lean();
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

    await dbConnect();
    try {
        const body = await request.json();
        // Use $set to ensure partial updates don't overwrite other fields
        // This is critical since different admin pages update different parts of the config
        const config = await Config.findOneAndUpdate({}, { $set: body }, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        await cache.invalidatePrefixAsync('db:config');
        await cache.invalidatePrefixAsync('db:themes');
        return NextResponse.json(config);
    } catch (error) {
        console.error('Config update error:', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}
