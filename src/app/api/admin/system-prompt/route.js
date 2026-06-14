import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, toClientList } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import { validateBearerBlogToken, validateExternalApiKey } from '@/lib/blogApiAuth';

function serialize(value) {
    return JSON.parse(JSON.stringify(value));
}

function sanitizeConfig(configDoc) {
    const config = serialize(configDoc) || {};

    delete config.encryptedGithubToken;
    delete config.encryptedGeminiApiKey;
    delete config.encryptedGroqApiKey;
    delete config.encryptedOpenRouterApiKey;
    delete config.blogApiTokenHash;
    delete config.blogApiTokenLast4;
    delete config.blogApiTokenCreatedAt;
    delete config.n8nWebhookAuthKey;

    if (config.favicon && typeof config.favicon === 'object') {
        delete config.favicon.value;
    }

    return config;
}

function buildPromptPayload(data) {
    return {
        generatedAt: new Date().toISOString(),
        format: {
            type: 'json',
            indentation: 2,
            delimiter: ',',
        },
        websiteContext: {
            config: data.config,
            header: data.header,
            home: data.home,
            about: data.about,
            socials: data.socials,
            projects: data.projects,
            apps: data.apps,
            blogs: data.blogs,
            gallery: data.gallery,
            themes: data.themes,
        },
        summary: {
            projects: Array.isArray(data.projects) ? data.projects.length : 0,
            apps: Array.isArray(data.apps) ? data.apps.length : 0,
            blogs: Array.isArray(data.blogs) ? data.blogs.length : 0,
            galleryItems: Array.isArray(data.gallery) ? data.gallery.length : 0,
            socials: Array.isArray(data.socials) ? data.socials.length : 0,
            themes: Array.isArray(data.themes) ? data.themes.length : 0,
        },
    };
}

function buildSystemPrompt(payload) {
    const about = payload?.websiteContext?.about || {};
    const config = payload?.websiteContext?.config || {};
    const home = payload?.websiteContext?.home || {};
    const name = about?.name || home?.name || config?.authorName || 'the portfolio owner';
    const siteTitle = config?.siteTitle || config?.logoText || `${name} Portfolio`;
    const roles = Array.isArray(about?.roles) && about.roles.length > 0
        ? about.roles.join(', ')
        : (config?.profession || 'developer');
    const professionalSummary = about?.professionalSummary || home?.intro || 'No professional summary provided.';

    return `You are an AI assistant representing ${name}.

Your job is to answer using the latest website data from the portfolio database. Speak accurately, clearly, and confidently. Prefer concrete facts from the source data below over assumptions. If something is missing from the data, say that it is not currently available in the website records instead of inventing it.

Identity
- Name: ${name}
- Website: ${siteTitle}
- Roles: ${roles}
- Professional summary: ${professionalSummary}

Behavior rules
- Use the database content below as the source of truth.
- When describing projects, apps, blogs, gallery items, or profile details, stay aligned with the stored data.
- Do not expose secrets, internal tokens, or private configuration values.
- If asked to summarize the portfolio, synthesize from the provided data.
- If asked for exact values, prefer quoting the stored fields precisely.

Website database context (JSON, indentation 2)
${JSON.stringify(payload, null, 2)}`;
}

export async function GET(request) {
    try {
        const session = await getSession();
        const hasValidApiKey = validateExternalApiKey(request);
        const isBearerTokenValid = await validateBearerBlogToken(request);

        if (!session && !hasValidApiKey && !isBearerTokenValid) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const [
            config,
            header,
            home,
            about,
            socials,
            projects,
            apps,
            blogs,
            gallery,
            themes,
        ] = await Promise.all([
            getSingleton(prisma, 'config'),
            getSingleton(prisma, 'header'),
            getSingleton(prisma, 'home'),
            getSingleton(prisma, 'about'),
            prisma.social.findMany().then((rows) => toClientList('social', rows)),
            prisma.project.findMany({ orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }] }).then((rows) => toClientList('project', rows)),
            prisma.deployment.findMany({ orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }] }).then((rows) => toClientList('deployment', rows)),
            prisma.blog.findMany({ orderBy: { createdAt: 'desc' } }).then((rows) => toClientList('blog', rows)),
            prisma.gallery.findMany({ orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }] }).then((rows) => toClientList('gallery', rows)),
            prisma.theme.findMany().then((rows) => toClientList('theme', rows)),
        ]);

        const payload = buildPromptPayload({
            config: sanitizeConfig(config),
            header: serialize(header),
            home: serialize(home),
            about: serialize(about),
            socials: serialize(socials) || [],
            projects: serialize(projects) || [],
            apps: serialize(apps) || [],
            blogs: serialize(blogs) || [],
            gallery: serialize(gallery) || [],
            themes: serialize(themes) || [],
        });

        const systemPrompt = buildSystemPrompt(payload);

        return new NextResponse(systemPrompt, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('[system-prompt] failed to build payload', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
