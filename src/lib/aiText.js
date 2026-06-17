/**
 * Shared AI text generation with provider failover (groq → openrouter → gemini),
 * mirroring the logic in /api/admin/ai/text. Extracted so server-side features
 * (e.g. the Server-Health error analyzer) can generate text without duplicating
 * the failover + telemetry handling.
 */
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { fetchWithTimeout } from '@/lib/upstreamControl';

const DEFAULT_MODELS = {
    groq: 'llama-3.1-8b-instant',
    openrouter: 'anthropic/claude-3-haiku',
    gemini: 'gemini-1.5-flash',
};

function keyForProvider(config, provider) {
    if (provider === 'gemini') return config.encryptedGeminiApiKey ? decrypt(config.encryptedGeminiApiKey) : null;
    if (provider === 'groq') return config.encryptedGroqApiKey ? decrypt(config.encryptedGroqApiKey) : null;
    if (provider === 'openrouter') return config.encryptedOpenRouterApiKey ? decrypt(config.encryptedOpenRouterApiKey) : null;
    return null;
}

/**
 * @param {Object} args
 * @param {Object} args.config             Config singleton (with secrets).
 * @param {string} args.systemInstruction
 * @param {string} args.prompt
 * @param {string} [args.mode]             Telemetry label (default: text).
 * @returns {Promise<{ text: string, provider: string, model: string, usage: object }>}
 */
export async function generateAiText({ config, systemInstruction, prompt, mode = 'text' }) {
    if (!config?.ai?.enabled) {
        throw new Error('AI system is disabled.');
    }

    const enabledProviders = config.ai.enabledProviders || ['gemini'];
    const order = ['groq', 'openrouter', 'gemini'].filter((p) => enabledProviders.includes(p));
    if (order.length === 0) {
        throw new Error('No AI providers enabled for text generation.');
    }

    let responseText = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let providerUsed = '';
    let modelUsed = '';
    let lastError = null;

    for (const provider of order) {
        try {
            const apiKey = keyForProvider(config, provider);
            if (!apiKey) continue;

            const model = config.ai?.models?.[provider] || DEFAULT_MODELS[provider];

            if (provider === 'gemini') {
                const ai = new GoogleGenAI({ apiKey });
                const result = await ai.models.generateContent({
                    model,
                    config: { systemInstruction },
                    contents: [{ text: prompt }],
                });
                responseText = typeof result.text === 'function' ? result.text() : (result.text || '');
                if (result.usageMetadata) {
                    usage = {
                        inputTokens: result.usageMetadata.promptTokenCount || 0,
                        outputTokens: result.usageMetadata.candidatesTokenCount || 0,
                        totalTokens: result.usageMetadata.totalTokenCount || 0,
                    };
                }
            } else {
                const endpoint = provider === 'groq'
                    ? 'https://api.groq.com/openai/v1/chat/completions'
                    : 'https://openrouter.ai/api/v1/chat/completions';
                const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
                if (provider === 'openrouter') {
                    headers['HTTP-Referer'] = 'https://aiyu.dev';
                    headers['X-Title'] = 'Aiyu Portfolio';
                }
                const response = await fetchWithTimeout(endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: systemInstruction },
                            { role: 'user', content: prompt },
                        ],
                    }),
                }, 30000);
                if (!response.ok) {
                    throw new Error(`${provider.toUpperCase()} Error: ${response.status} ${await response.text()}`);
                }
                const data = await response.json();
                responseText = data.choices?.[0]?.message?.content || '';
                if (data.usage) {
                    usage = {
                        inputTokens: data.usage.prompt_tokens || 0,
                        outputTokens: data.usage.completion_tokens || 0,
                        totalTokens: data.usage.total_tokens || 0,
                    };
                }
            }

            if (responseText) {
                providerUsed = provider;
                modelUsed = model;
                break;
            }
        } catch (e) {
            console.error(`[aiText] ${provider} failed:`, e.message);
            lastError = e;
        }
    }

    if (!responseText) {
        throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'unknown'}`);
    }

    // Telemetry — non-fatal.
    try {
        await prisma.aiLog.create({
            data: {
                provider: providerUsed,
                model: modelUsed,
                mode,
                prompt,
                response: responseText.trim(),
                ...usage,
            },
        });
    } catch (logError) {
        console.error('[aiText] telemetry log error:', logError.message);
    }

    return { text: responseText.trim(), provider: providerUsed, model: modelUsed, usage };
}
