import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';

async function generateText(request) {
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
        const { prompt, mode, context } = await request.json();

        if (!prompt && mode !== 'proofread') {
            return NextResponse.json({ success: false, error: 'No prompt provided.' }, { status: 400 });
        }

        // 3. Prepare AI
        const ai = new GoogleGenAI({ apiKey });
        let modelName = config.ai.model || 'gemini-3-flash-preview';
        const systemInstruction = config.ai.systemInstruction || "You are a helpful assistant.";

        let finalPrompt = prompt;
        let finalSystemInstruction = systemInstruction;

        if (mode === 'generate_blog') {
            finalSystemInstruction += "\nYou are an expert blog writer. Write in a professional yet engaging tone. Always output in high-quality Markdown. Include a structure with headings, subheadings, and bullet points where applicable.";
            finalPrompt = `Write a detailed, high-quality blog post about: "${prompt}".\n\nContext/Title: ${context?.title || ''}\nTags: ${context?.tags || ''}\n\nMake sure it's comprehensive and formatted beautifully in Markdown.`;
        } else if (mode === 'proofread') {
            finalSystemInstruction += "\nYou are an expert editor. Improve the following text for clarity, grammar, and engagement. Retain the original meaning and Markdown formatting if present. ONLY return the improved text, no comments.";
            finalPrompt = `Proofread and improve this content:\n\n${prompt}`;
        } else if (mode === 'suggest_tags') {
            finalSystemInstruction += "\nYou are an expert SEO and content strategist. Suggest 3-5 relevant, short, tech-focused tags for this blog post. ONLY return the tags as a comma-separated list, nothing else.";
            finalPrompt = `Suggest tags for a blog post with title: "${context?.title}" and content snippet: "${prompt.substring(0, 500)}"`;
        } else if (mode === 'suggest_title') {
            finalSystemInstruction += "\nYou are an expert copywriter. Suggest a catchy, professional, and SEO-friendly title for this blog post. ONLY return the title, no quotes or comments.";
            finalPrompt = `Suggest a title for a blog post with this content: "${prompt.substring(0, 1000)}"`;
        } else if (mode === 'continue_blog') {
            finalSystemInstruction += "\nYou are an expert blog writer. Continue the following blog post seamlessly. Maintain the tone and formatting. ONLY return the new content to be appended at the end of the existing text. Do not repeat the original text.";
            finalPrompt = `Continue this blog post based on the title "${context?.title}" and current content:\n\n${prompt}`;
        }

        // 4. Call API
        const result = await ai.models.generateContent({
            model: modelName,
            config: {
                systemInstruction: finalSystemInstruction
            },
            contents: [{ text: finalPrompt }]
        });

        const text = typeof result.text === 'function' ? result.text() : (result.text || JSON.stringify(result));

        return NextResponse.json({
            success: true,
            data: text.trim()
        });

    } catch (error) {
        console.error('[AI Text Error]:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to generate text.'
        }, { status: 500 });
    }
}

export const POST = withAuth(generateText);
export const runtime = 'nodejs';
