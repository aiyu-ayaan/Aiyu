import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { withAuth } from '@/middleware/auth';
import { encrypt, decrypt } from '@/lib/encryption';

// Helper to get key
async function getDecryptedKey() {
    const config = await Config.findOne().select('+encryptedGeminiApiKey').lean();
    if (config?.encryptedGeminiApiKey) {
        return decrypt(config.encryptedGeminiApiKey);
    }
    return null;
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

        const key = await getDecryptedKey();
        const hasKey = !!key;

        const aiConfig = config.ai || {
            enabled: false,
            model: 'gemini-1.5-flash',
            systemInstruction: 'You are a helpful assistant for the portfolio admin.'
        };

        return NextResponse.json({
            success: true,
            data: {
                ...aiConfig,
                hasKey
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
        const { enabled, model, systemInstruction, apiKey } = body;

        console.log('[AI Config] Update request:', { enabled, model });

        let config = await Config.findOne();
        if (!config) {
            config = new Config({});
        }

        // Update AI settings
        if (!config.ai) config.ai = {};

        if (enabled !== undefined) config.ai.enabled = enabled;
        if (model !== undefined) config.ai.model = model;
        if (systemInstruction !== undefined) config.ai.systemInstruction = systemInstruction;

        // Update API Key if provided
        if (apiKey !== undefined) {
            const encryptedKey = apiKey ? encrypt(apiKey) : '';
            config.encryptedGeminiApiKey = encryptedKey;
        }

        await config.save();

        return NextResponse.json({
            success: true,
            data: {
                ...config.ai,
                hasKey: !!config.encryptedGeminiApiKey
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
