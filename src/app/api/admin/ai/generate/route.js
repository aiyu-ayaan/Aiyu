import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';
import convert from 'heic-convert';
import sharp from 'sharp';
import { fetchWithTimeout } from '@/lib/upstreamControl';

async function generateCaption(request) {
    try {
        // 1. Get Configuration & API Key
        const config = await getSingleton(prisma, 'config', { withSecrets: true });

        if (!config?.ai?.enabled) {
            return NextResponse.json({ success: false, error: 'AI system is disabled.' }, { status: 403 });
        }

        // Force Gemini for image captioning regardless of global AI provider setting
        const provider = 'gemini';
        let apiKey;

        if (!config.encryptedGeminiApiKey) {
            return NextResponse.json({ success: false, error: 'Gemini API Key is missing. It is compulsory for image tasks.' }, { status: 500 });
        }
        apiKey = decrypt(config.encryptedGeminiApiKey);

        // 2. Parse Request
        const formData = await request.formData();
        const file = formData.get('file');
        const prompt = formData.get('prompt') || 'Generate a creative, short caption (5-10 words) for this image.';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No image file provided.' }, { status: 400 });
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

        // 4. Call Selected Provider
        let responseText = '';
        let modelName = config.ai.models?.gemini || config.ai.model;
        let usageData = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

        if (provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey });
            
            if (!modelName || modelName.includes('1.5-flash')) {
                modelName = 'gemini-2.0-flash-lite';
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

            const generateWithFallback = async (currentModel) => {
                try {
                    return await ai.models.generateContent({
                        model: currentModel,
                        config: { systemInstruction },
                        contents: parts
                    });
                } catch (error) {
                    if (error.message.includes('404') || error.message.includes('not found')) {
                        console.warn(`[AI Warning] Model ${currentModel} not found, trying fallback...`);
                        const fallbackName = 'gemini-2.0-flash-lite';
                        return await ai.models.generateContent({
                            model: fallbackName,
                            config: { systemInstruction },
                            contents: parts
                        });
                    }
                    throw error;
                }
            };

            const result = await generateWithFallback(modelName);
            responseText = typeof result.text === 'function' ? result.text() : (result.text || JSON.stringify(result));
            
            if (result.usageMetadata) {
                 usageData = {
                     inputTokens: result.usageMetadata.promptTokenCount || 0,
                     outputTokens: result.usageMetadata.candidatesTokenCount || 0,
                     totalTokens: result.usageMetadata.totalTokenCount || 0
                 };
            }

        } else if (provider === 'groq' || provider === 'openrouter') {
            const endpoint = provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
            
            if (provider === 'groq' && (!modelName || !modelName.includes('vision'))) {
                modelName = 'llama-3.2-90b-vision-preview'; // Fallback to vision compatible model for Groq
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };

            if (provider === 'openrouter') {
                headers['HTTP-Referer'] = 'https://aiyu.dev';
                headers['X-Title'] = 'Aiyu Portfolio'; 
            }

            const response = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                        ]}
                    ]
                })
            }, 30000);

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`${provider.toUpperCase()} Vision API Error: ${response.status} ${errorData}`);
            }

            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || '';
            
            if (data.usage) {
                usageData = {
                    inputTokens: data.usage.prompt_tokens || 0,
                    outputTokens: data.usage.completion_tokens || 0,
                    totalTokens: data.usage.total_tokens || 0
                };
            }
        }

        // 5. Log Telemetry
        try {
            await prisma.aiLog.create({ data: {
                provider,
                model: modelName,
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
