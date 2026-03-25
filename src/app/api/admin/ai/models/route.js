import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';

async function fetchGeminiModels(apiKey) {
    if (!apiKey) return [];
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) {
            const data = await res.json();
            return data.models
                .filter(m => m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => ({
                    id: m.name.replace('models/', ''),
                    name: m.displayName || m.name.replace('models/', ''),
                    desc: m.description || 'Google Gemini Model',
                    provider: 'gemini'
                }));
        }
    } catch (e) {
        console.error('[Gemini Models Fetch Error]:', e);
    }
    return [];
}

async function fetchGroqModels(apiKey) {
    if (!apiKey) return [];
    try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.data
                .filter(m => !m.id.includes('whisper'))
                .map(m => ({
                    id: m.id,
                    name: `[Free] ${m.id}`,
                    desc: `Owned by ${m.owned_by}`,
                    provider: 'groq'
                }));
        } else {
            console.error('[Groq Models Fetch Error]:', res.status, await res.text());
        }
    } catch (e) {
        console.error('[Groq Models Fetch Error]:', e);
    }
    return [];
}

async function fetchOpenRouterModels(apiKey) {
    if (!apiKey) return [];
    try {
        const res = await fetch('https://openrouter.ai/api/v1/models');
        if (res.ok) {
            const data = await res.json();
            return data.data.map(m => {
                const isFree = !m.pricing || (parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0);
                return {
                    id: m.id,
                    name: isFree ? `[Free] ${m.name || m.id}` : (m.name || m.id),
                    desc: m.description ? (m.description.substring(0, 100) + '...') : `Provider: ${isFree ? 'Free' : 'Paid'}`,
                    provider: 'openrouter'
                };
            });
        }
    } catch (e) {
        console.error('[OpenRouter Models Fetch Error]:', e);
    }
    return [];
}

async function getModels(request) {
    try {
        const { searchParams } = new URL(request.url);
        const provider = searchParams.get('provider') || 'all';

        await dbConnect();

        const config = await Config.findOne().select('+encryptedGeminiApiKey +encryptedGroqApiKey +encryptedOpenRouterApiKey').lean();

        const keys = {
            gemini: config?.encryptedGeminiApiKey ? decrypt(config.encryptedGeminiApiKey) : null,
            groq: config?.encryptedGroqApiKey ? decrypt(config.encryptedGroqApiKey) : null,
            openrouter: config?.encryptedOpenRouterApiKey ? decrypt(config.encryptedOpenRouterApiKey) : null,
        };

        let models = [];

        if (provider === 'all' || provider === 'gemini') {
            const geminiModels = await fetchGeminiModels(keys.gemini);
            models = [...models, ...geminiModels];
        }
        if (provider === 'all' || provider === 'groq') {
            const groqModels = await fetchGroqModels(keys.groq);
            models = [...models, ...groqModels];
        }
        if (provider === 'all' || provider === 'openrouter') {
            const openRouterModels = await fetchOpenRouterModels(keys.openrouter);
            models = [...models, ...openRouterModels];
        }

        return NextResponse.json({
            success: true,
            data: models
        });

    } catch (error) {
        console.error('[AI Models Fetch Error]:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch models.'
        }, { status: 500 });
    }
}

export const GET = withAuth(getModels);
export const runtime = 'nodejs';
