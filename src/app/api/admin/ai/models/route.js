import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';

async function getModels(request) {
    try {
        const { searchParams } = new URL(request.url);
        const provider = searchParams.get('provider') || 'gemini';

        await dbConnect();

        const config = await Config.findOne().select('+encryptedGeminiApiKey +encryptedGroqApiKey +encryptedOpenRouterApiKey').lean();

        let apiKey;
        if (provider === 'gemini') {
            apiKey = config?.encryptedGeminiApiKey ? decrypt(config.encryptedGeminiApiKey) : null;
        } else if (provider === 'groq') {
            apiKey = config?.encryptedGroqApiKey ? decrypt(config.encryptedGroqApiKey) : null;
        } else if (provider === 'openrouter') {
            apiKey = config?.encryptedOpenRouterApiKey ? decrypt(config.encryptedOpenRouterApiKey) : null;
        }

        if (!apiKey) {
            return NextResponse.json({ success: true, data: [] }); // No key yet, return empty list
        }

        let models = [];

        if (provider === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (res.ok) {
                const data = await res.json();
                models = data.models
                    .filter(m => m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => ({
                        id: m.name.replace('models/', ''),
                        name: m.displayName || m.name.replace('models/', ''),
                        desc: m.description || 'Google Gemini Model'
                    }));
            }
        } else if (provider === 'groq') {
            const res = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (res.ok) {
                const data = await res.json();
                models = data.data
                    .filter(m => !m.id.includes('whisper')) // filter out audio models if we only want text/vision
                    .map(m => ({
                        id: m.id,
                        name: m.id,
                        desc: `Owned by ${m.owned_by}`
                    }));
            } else {
                const errText = await res.text();
                console.error('[Groq Models Fetch Error]:', res.status, errText);
            }
        } else if (provider === 'openrouter') {
            const res = await fetch('https://openrouter.ai/api/v1/models');
            if (res.ok) {
                const data = await res.json();
                models = data.data.map(m => ({
                    id: m.id,
                    name: m.name || m.id,
                    desc: m.description ? (m.description.substring(0, 100) + '...') : `Provider: ${m.pricing?.prompt ? 'Paid' : 'Free'}`
                }));
            }
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
