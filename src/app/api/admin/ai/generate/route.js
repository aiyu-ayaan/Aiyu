import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';
import convert from 'heic-convert';
import sharp from 'sharp';
import { fetchWithTimeout } from '@/lib/upstreamControl';
import { MAX_FILE_SIZE } from '@/utils/fileValidation';

const GATEWAY_PROVIDER_SLUGS = {
    google: 'google',
    openai: 'openai',
    groq: 'groq',
    anthropic: 'anthropic',
    cohere: 'cohere',
    perplexity: 'perplexity',
    replicate: 'replicate',
    together: 'together',
    mistral: 'mistral',
    deepseek: 'deepseek',
    fireworks: 'fireworks',
    xai: 'xai',
    stabilityai: 'stabilityai',
    aws: 'bedrock',
    azure: 'azure-openai'
};

// Vercel AI Gateway caller with request-scoped BYOK for Vision
async function callVisionVercelAiGateway({ gatewayUrl, gatewayApiKey, providerType, modelId, apiKey, systemInstruction, prompt, mimeType, base64Image }) {
    const baseUrl = gatewayUrl || 'https://ai-gateway.vercel.sh/v1';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const gatewaySlug = GATEWAY_PROVIDER_SLUGS[providerType] || providerType;

    const headers = {
        'Content-Type': 'application/json',
    };
    if (gatewayApiKey) {
        headers['Authorization'] = `Bearer ${gatewayApiKey}`;
    } else if (process.env.AI_GATEWAY_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.AI_GATEWAY_API_KEY}`;
    }

    const body = {
        model: `${gatewaySlug}/${modelId}`,
        messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]}
        ],
        providerOptions: {
            gateway: {
                byok: {
                    [gatewaySlug]: [{ apiKey }]
                }
            }
        }
    };

    console.log(`[AI Gateway Vision] Routing vision request to ${providerType} (${gatewaySlug})/${modelId} via ${endpoint}...`);
    const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    }, 45000);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Gateway Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage ? {
        inputTokens: data.usage.prompt_tokens || 0,
        outputTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
    } : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    return { text, usage };
}

// Direct provider API caller for Vision (fallback)
async function callVisionDirectProvider({ providerType, modelId, apiKey, systemInstruction, prompt, mimeType, base64Image }) {
    if (providerType === 'google') {
        const ai = new GoogleGenAI({ apiKey });
        
        let finalModel = modelId;
        if (!finalModel || finalModel.includes('1.5-flash')) {
            finalModel = 'gemini-2.0-flash-lite';
        }

        const parts = [
            { text: prompt },
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                }
            }
        ];

        console.log(`[AI Direct Vision] Calling Google Gemini API directly for model ${finalModel}...`);
        const result = await ai.models.generateContent({
            model: finalModel,
            config: { systemInstruction },
            contents: parts
        });

        const text = typeof result.text === 'function' ? result.text() : (result.text || JSON.stringify(result));
        const usage = result.usageMetadata ? {
            inputTokens: result.usageMetadata.promptTokenCount || 0,
            outputTokens: result.usageMetadata.candidatesTokenCount || 0,
            totalTokens: result.usageMetadata.totalTokenCount || 0
        } : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        return { text, usage };
    }

    if (providerType === 'anthropic') {
        const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: modelId,
                max_tokens: 4096,
                system: systemInstruction,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: mimeType,
                                    data: base64Image
                                }
                            },
                            {
                                type: 'text',
                                text: prompt
                            }
                        ]
                    }
                ]
            })
        }, 45000);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Direct Anthropic Vision API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        const usage = data.usage ? {
            inputTokens: data.usage.input_tokens || 0,
            outputTokens: data.usage.output_tokens || 0,
            totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
        } : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

        return { text, usage };
    }

    const OPENAI_COMPATIBLE_ENDPOINTS = {
        openai: 'https://api.openai.com/v1/chat/completions',
        groq: 'https://api.groq.com/openai/v1/chat/completions',
        openrouter: 'https://openrouter.ai/api/v1/chat/completions',
        deepseek: 'https://api.deepseek.com/v1/chat/completions',
        perplexity: 'https://api.perplexity.ai/chat/completions',
        mistral: 'https://api.mistral.ai/v1/chat/completions',
        together: 'https://api.together.xyz/v1/chat/completions',
        fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
        xai: 'https://api.x.ai/v1/chat/completions',
        cohere: 'https://api.cohere.com/v2/chat/completions'
    };

    if (OPENAI_COMPATIBLE_ENDPOINTS[providerType]) {
        const endpoint = OPENAI_COMPATIBLE_ENDPOINTS[providerType];
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        if (providerType === 'openrouter') {
            headers['HTTP-Referer'] = 'https://aiyu.dev';
            headers['X-Title'] = 'Aiyu Portfolio';
        }

        console.log(`[AI Direct Vision] Calling provider ${providerType} directly for model ${modelId}...`);
        const response = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ]}
                ]
            })
        }, 45000);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Direct API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        const usage = data.usage ? {
            inputTokens: data.usage.prompt_tokens || 0,
            outputTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0
        } : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

        return { text, usage };
    }

    throw new Error(`Direct vision calls to ${providerType} are not supported. This provider must be routed through Vercel AI Gateway.`);
}

async function generateCaption(request) {
    try {
        // 1. Get Configuration & API Key
        const config = await getSingleton(prisma, 'config', { withSecrets: true });

        if (!config?.ai?.enabled) {
            return NextResponse.json({ success: false, error: 'AI system is disabled.' }, { status: 403 });
        }

        // 2. Parse Request
        const formData = await request.formData();
        const file = formData.get('file');
        const prompt = formData.get('prompt') || 'Generate a creative, short caption (5-10 words) for this image.';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No image file provided.' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ success: false, error: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB.` }, { status: 400 });
        }

        // 3. Prepare Image
        let buffer = Buffer.from(await file.arrayBuffer());
        let mimeType = file.type;

        // Handle HEIC conversion
        const isHeic = mimeType === 'image/heic' || file.name.toLowerCase().endsWith('.heic');
        if (isHeic) {
            console.log(`[AI] Converting HEIC image: ${file.name}`);
            try {
                const outputBuffer = await convert({
                    buffer: buffer,
                    format: 'JPEG',
                    quality: 0.8
                });
                buffer = Buffer.from(outputBuffer);
                mimeType = 'image/jpeg';
            } catch (convError) {
                console.error('[AI] HEIC conversion failed:', convError);
            }
        }

        // 3.5 Optimize Image with Sharp
        try {
            console.log('[AI] Optimizing image for transmission...');
            buffer = await sharp(buffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();
            mimeType = 'image/jpeg';
        } catch (sharpError) {
            console.error('[AI] Sharp optimization failed:', sharpError);
        }

        const base64Image = buffer.toString('base64');
        const systemInstruction = config.ai.systemInstruction || "You are a helpful assistant.";

        // 4. Call Selected Provider with strict fallback sequence
        const imagePriority = config.ai.imagePriority || [];
        const configuredModels = config.ai.models || [];
        const configuredProviders = config.ai.providers || [];

        // Map imagePriority to the configured model objects
        let modelsToTry = imagePriority
            .map(id => configuredModels.find(m => m.id === id))
            .filter(Boolean);

        // Fallback to legacy gemini model if priority list is empty
        if (modelsToTry.length === 0) {
            const geminiProvider = configuredProviders.find(p => p.type === 'google');
            if (geminiProvider) {
                modelsToTry.push({
                    id: 'legacy-gemini',
                    modelId: config.ai.model || 'gemini-1.5-flash',
                    providerId: geminiProvider.id,
                    isFree: false
                });
            }
        }

        if (modelsToTry.length === 0) {
            return NextResponse.json({ success: false, error: 'No AI vision models configured for captioning.' }, { status: 403 });
        }

        const gatewayUrl = config.ai.gatewayUrl || process.env.AI_GATEWAY_URL || '';
        const gatewayApiKey = config.ai.gatewayApiKey ? decrypt(config.ai.gatewayApiKey) : (process.env.AI_GATEWAY_API_KEY || '');
        const useGateway = !!gatewayUrl || !!gatewayApiKey || !!process.env.AI_GATEWAY_API_KEY;

        let responseText = '';
        let usageData = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        let finalProviderUsed = '';
        let finalModelUsed = '';
        let lastError = null;

        for (const currentModel of modelsToTry) {
            const provider = configuredProviders.find(p => p.id === currentModel.providerId);
            if (!provider || !provider.apiKey) {
                console.warn(`[AI Vision] Skipping model ${currentModel.modelId}: Linked provider is missing API key.`);
                continue;
            }

            const decryptedKey = decrypt(provider.apiKey);
            if (!decryptedKey) {
                console.warn(`[AI Vision] Skipping model ${currentModel.modelId}: Decryption of provider key failed.`);
                continue;
            }

            try {
                let result;
                
                // Route through Vercel AI Gateway if configured and provider is supported (not openrouter)
                if (useGateway && provider.type !== 'openrouter') {
                    try {
                        result = await callVisionVercelAiGateway({
                            gatewayUrl,
                            gatewayApiKey,
                            providerType: provider.type,
                            modelId: currentModel.modelId,
                            apiKey: decryptedKey,
                            systemInstruction,
                            prompt,
                            mimeType,
                            base64Image
                        });
                    } catch (gatewayErr) {
                        console.warn(`[AI Gateway Vision Fallback] Gateway failed for ${provider.type}/${currentModel.modelId}. Trying direct call... Error:`, gatewayErr.message);
                        // Fallback to direct call
                        result = await callVisionDirectProvider({
                            providerType: provider.type,
                            modelId: currentModel.modelId,
                            apiKey: decryptedKey,
                            systemInstruction,
                            prompt,
                            mimeType,
                            base64Image
                        });
                    }
                } else {
                    // Call direct provider
                    result = await callVisionDirectProvider({
                        providerType: provider.type,
                        modelId: currentModel.modelId,
                        apiKey: decryptedKey,
                        systemInstruction,
                        prompt,
                        mimeType,
                        base64Image
                    });
                }

                if (result && result.text) {
                    responseText = result.text;
                    usageData = result.usage;
                    finalProviderUsed = provider.type;
                    finalModelUsed = currentModel.modelId;
                    break; // SUCCESS! Break the failover loop
                }
            } catch (e) {
                console.error(`[AI Vision Fallback] Model ${currentModel.modelId} failed:`, e.message);
                lastError = e;
            }
        }

        if (!responseText) {
             throw new Error(`All configured AI vision fallback mechanisms failed. Last API error: ${lastError?.message || 'Unknown configuration issue.'}`);
        }

        // 5. Log Telemetry
        try {
            await prisma.aiLog.create({ data: {
                provider: finalProviderUsed,
                model: finalModelUsed,
                mode: 'generate_caption', // Vision mode
                prompt: prompt, // We don't log the base64 image string to DB, just text prompt
                response: responseText.trim(),
                ...usageData
            } });
        } catch (logError) {
            console.error('[AI Telemetry Logging Error]:', logError);
        }

        // Sanitize: strip surrounding quotes and extra whitespace
        let sanitized = responseText.trim().replace(/^["']+|["']+$/g, '').trim();

        return NextResponse.json({
            success: true,
            data: sanitized
        });

    } catch (error) {
        console.error('[AI Generate Error]:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to generate caption.'
        }, { status: 500 });
    }
}

export const POST = withAuth(generateCaption);
export const runtime = 'nodejs';
