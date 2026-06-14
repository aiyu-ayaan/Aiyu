import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { withAuth } from '@/middleware/auth';
import { encrypt, decrypt } from '@/lib/encryption';
import cache from '@/lib/cache';

// Helper to get key
async function getDecryptedKeys() {
    const config = await getSingleton(prisma, 'config', { withSecrets: true });
    return {
        gemini: config?.encryptedGeminiApiKey ? decrypt(config.encryptedGeminiApiKey) : null,
        groq: config?.encryptedGroqApiKey ? decrypt(config.encryptedGroqApiKey) : null,
        openrouter: config?.encryptedOpenRouterApiKey ? decrypt(config.encryptedOpenRouterApiKey) : null
    };
}

// GET: Fetch AI configuration
async function getAiConfig(request) {
    try {
        let config = await getSingleton(prisma, 'config');

        // Create default if doesn't exist
        if (!config) {
            config = await upsertSingleton(prisma, 'config', {});
        }

        const keys = await getDecryptedKeys();

        const aiConfig = config.ai || {
            enabled: false,
            provider: 'gemini',
            model: 'gemini-1.5-flash',
            enabledProviders: ['gemini'], // Defaults to Gemini only
            systemInstruction: 'You are a helpful assistant for the portfolio admin.'
        };

        // Migrate old config if enabledProviders missing
        if (!aiConfig.enabledProviders) {
            aiConfig.enabledProviders = aiConfig.provider ? [aiConfig.provider] : ['gemini'];
        }

        return NextResponse.json({
            success: true,
            data: {
                ...aiConfig,
                hasKey: {
                    gemini: !!keys.gemini,
                    groq: !!keys.groq,
                    openrouter: !!keys.openrouter
                }
            }
        });
    } catch (error) {
        console.error('[ERROR] Failed to fetch AI config:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch configuration'
        }, { status: 500 });
    }
}

// PUT: Update AI configuration
async function updateAiConfig(request) {
    try {
        const body = await request.json();
        const { enabled, provider, model, models, enabledProviders, systemInstruction, keys } = body;

        const current = (await getSingleton(prisma, 'config', { withSecrets: true })) || {};
        const ai = { ...(current.ai || {}) };

        if (enabled !== undefined) ai.enabled = enabled;
        if (provider !== undefined) ai.provider = provider;
        if (model !== undefined) ai.model = model;
        if (models !== undefined) ai.models = models;
        if (enabledProviders !== undefined) ai.enabledProviders = enabledProviders;
        if (systemInstruction !== undefined) ai.systemInstruction = systemInstruction;

        const patch = { ai };

        // Update API Keys if provided (stored in dedicated encrypted secret columns)
        if (keys?.gemini !== undefined) {
            patch.encryptedGeminiApiKey = keys.gemini ? encrypt(keys.gemini) : '';
        }
        if (keys?.groq !== undefined) {
            patch.encryptedGroqApiKey = keys.groq ? encrypt(keys.groq) : '';
        }
        if (keys?.openrouter !== undefined) {
            patch.encryptedOpenRouterApiKey = keys.openrouter ? encrypt(keys.openrouter) : '';
        }

        const updated = await upsertSingleton(prisma, 'config', patch, { withSecrets: true });
        cache.invalidatePrefix('db:config');

        return NextResponse.json({
            success: true,
            data: {
                ...updated.ai,
                hasKey: {
                    gemini: !!updated.encryptedGeminiApiKey,
                    groq: !!updated.encryptedGroqApiKey,
                    openrouter: !!updated.encryptedOpenRouterApiKey
                }
            }
        });

    } catch (error) {
        console.error('[ERROR] Failed to update AI config:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to update configuration'
        }, { status: 500 });
    }
}

export const GET = withAuth(getAiConfig);
export const PUT = withAuth(updateAiConfig);
export const dynamic = 'force-dynamic';
