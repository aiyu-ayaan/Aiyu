import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { withAuth } from '@/middleware/auth';
import { encrypt, decrypt } from '@/lib/encryption';
import cache from '@/lib/cache';

// Helper to get key
async function getDecryptedKeys() {
    const config = await Config.findOne().select('+encryptedGeminiApiKey +encryptedGroqApiKey +encryptedOpenRouterApiKey').lean();
    return {
        gemini: config?.encryptedGeminiApiKey ? decrypt(config.encryptedGeminiApiKey) : null,
        groq: config?.encryptedGroqApiKey ? decrypt(config.encryptedGroqApiKey) : null,
        openrouter: config?.encryptedOpenRouterApiKey ? decrypt(config.encryptedOpenRouterApiKey) : null
    };
}

// GET: Fetch AI configuration
async function getAiConfig(request) {
    try {
        await dbConnect();

        let config = await Config.findOne().lean();

        // Create default if doesn't exist
        if (!config) {
            config = await Config.create({});
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
        await dbConnect();
        const body = await request.json();
        const { enabled, provider, model, models, enabledProviders, systemInstruction, keys } = body;

        let config = await Config.findOne().select('+encryptedGeminiApiKey +encryptedGroqApiKey +encryptedOpenRouterApiKey');
        if (!config) {
            config = new Config({});
        }

        // Update AI settings
        if (!config.ai) config.ai = {};

        if (enabled !== undefined) config.ai.enabled = enabled;
        if (provider !== undefined) config.ai.provider = provider;
        if (model !== undefined) config.ai.model = model;
        if (models !== undefined) config.ai.models = models;
        if (enabledProviders !== undefined) config.ai.enabledProviders = enabledProviders;
        if (systemInstruction !== undefined) config.ai.systemInstruction = systemInstruction;

        // Update API Keys if provided
        if (keys?.gemini !== undefined) {
            config.encryptedGeminiApiKey = keys.gemini ? encrypt(keys.gemini) : '';
        }
        if (keys?.groq !== undefined) {
            config.encryptedGroqApiKey = keys.groq ? encrypt(keys.groq) : '';
        }
        if (keys?.openrouter !== undefined) {
            config.encryptedOpenRouterApiKey = keys.openrouter ? encrypt(keys.openrouter) : '';
        }

        await config.save();
        cache.invalidatePrefix('db:config');

        return NextResponse.json({
            success: true,
            data: {
                ...config.ai,
                hasKey: {
                    gemini: !!config.encryptedGeminiApiKey,
                    groq: !!config.encryptedGroqApiKey,
                    openrouter: !!config.encryptedOpenRouterApiKey
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
