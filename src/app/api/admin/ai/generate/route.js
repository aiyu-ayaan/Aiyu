import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';

async function generateCaption(request) {
    try {
        await dbConnect();

        // 1. Get Configuration & API Key
        const config = await Config.findOne().select('+encryptedGeminiApiKey').lean();

        if (!config?.ai?.enabled) {
            return NextResponse.json({ success: false, error: 'AI system is disabled.' }, { status: 403 });
        }

        if (!config.encryptedGeminiApiKey) {
            return NextResponse.json({ success: false, error: 'Gemini API Key is missing.' }, { status: 500 });
        }

        const apiKey = decrypt(config.encryptedGeminiApiKey);
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'Failed to decrypt API Key.' }, { status: 500 });
        }

        // 2. Parse Request
        const formData = await request.formData();
        const file = formData.get('file');
        const prompt = formData.get('prompt') || 'Generate a creative, short caption (5-10 words) for this image.';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No image file provided.' }, { status: 400 });
        }

        // 3. Prepare Image
        const buffer = await file.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        const mimeType = file.type;

        // 4. Call Google GenAI API
        const ai = new GoogleGenAI({ apiKey });

        // Ensure we use the newest model if nothing is set or if it's an old default
        let modelName = config.ai.model;
        if (!modelName || modelName.includes('1.5-flash')) {
            modelName = 'gemini-3-flash-preview';
        }

        const systemInstruction = config.ai.systemInstruction || "You are a helpful assistant.";

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
                    config: {
                        systemInstruction: systemInstruction
                    },
                    contents: parts
                });
            } catch (error) {
                if (error.message.includes('404') || error.message.includes('not found')) {
                    console.warn(`[AI Warning] Model ${currentModel} not found, trying fallback...`);

                    const fallbackName = 'gemini-3-flash-preview';
                    return await ai.models.generateContent({
                        model: fallbackName,
                        config: {
                            systemInstruction: systemInstruction
                        },
                        contents: parts
                    });
                }
                throw error;
            }
        };

        const result = await generateWithFallback(modelName);

        // Result handling based on new SDK: .text is a property string
        const responseText = typeof result.text === 'function' ? result.text() : (result.text || JSON.stringify(result));

        return NextResponse.json({
            success: true,
            data: responseText.trim()
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
