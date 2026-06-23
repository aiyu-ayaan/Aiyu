import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';

async function fetchOpenAiModels(apiKey) {
    if (!apiKey) return [];
    try {
        const res = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.data
                .filter(m => m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3'))
                .map(m => ({
                    id: m.id,
                    name: m.id,
                    desc: 'OpenAI GPT Model',
                    provider: 'openai',
                    isFree: false
                }));
        }
    } catch (e) {
        console.error('[OpenAI Models Fetch Error]:', e);
    }
    return [];
}

async function fetchGeminiModels(apiKey) {
    if (!apiKey) return [];
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) {
            const data = await res.json();
            return data.models
                .filter(m => m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => {
                    const id = m.name.replace('models/', '');
                    const isFree = id.includes('flash') || id.includes('lite'); // Simple heuristic or default to true for flash
                    return {
                        id,
                        name: isFree ? `[Free] ${m.displayName || id}` : (m.displayName || id),
                        desc: m.description || 'Google Gemini Model',
                        provider: 'google',
                        isFree
                    };
                });
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
                    provider: 'groq',
                    isFree: true
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
                    provider: 'openrouter',
                    isFree
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
        const providerId = searchParams.get('providerId') || 'all';

        const config = await getSingleton(prisma, 'config', { withSecrets: true });
        const aiConfig = config?.ai || {};
        const providers = aiConfig.providers || [];

        let models = [];

        if (providerId === 'all') {
            // Fetch models for all configured providers
            for (const p of providers) {
                if (!p.apiKey) continue;
                const apiKey = decrypt(p.apiKey);
                let providerModels = [];

                if (p.type === 'google') {
                    providerModels = await fetchGeminiModels(apiKey);
                } else if (p.type === 'openai') {
                    providerModels = await fetchOpenAiModels(apiKey);
                } else if (p.type === 'groq') {
                    providerModels = await fetchGroqModels(apiKey);
                } else if (p.type === 'openrouter') {
                    providerModels = await fetchOpenRouterModels(apiKey);
                }

                // Add providerInstanceId so client knows which specific credentials this model uses
                models = [...models, ...providerModels.map(m => ({ ...m, providerInstanceId: p.id }))];
            }
        } else {
            // Fetch models for a single specific provider configuration
            const p = providers.find(prov => prov.id === providerId);
            if (p && p.apiKey) {
                const apiKey = decrypt(p.apiKey);
                let providerModels = [];

                if (p.type === 'google') {
                    providerModels = await fetchGeminiModels(apiKey);
                } else if (p.type === 'openai') {
                    providerModels = await fetchOpenAiModels(apiKey);
                } else if (p.type === 'groq') {
                    providerModels = await fetchGroqModels(apiKey);
                } else if (p.type === 'openrouter') {
                    providerModels = await fetchOpenRouterModels(apiKey);
                }

                models = providerModels.map(m => ({ ...m, providerInstanceId: p.id }));
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
