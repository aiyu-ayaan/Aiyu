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
        } else if (mode === 'generate_home_code') {
            finalSystemInstruction += "\nYou are a creative developer. Generate 5-8 short, interesting, and futuristic one-line code snippets or console logs that reflect the user's role and name. They will be displayed in a terminal background. Format: One snippet per line. No line numbers or extra text.";
            finalPrompt = `User Name: ${context?.name}\nUser Roles: ${context?.roles}\nGenerate code snippets for their portfolio landing page.`;
        } else if (mode === 'refine_summary') {
            finalSystemInstruction += "\nYou are an expert career coach and writer. Refine the user's professional summary to be more compelling, concise, and professional. Use a confident and modern tone. Output exactly one paragraph. NO conversational filler.";
            finalPrompt = `Refine this professional summary:\n\n${prompt}`;
        } else if (mode === 'suggest_skills') {
            finalSystemInstruction += "\nYou are a technical recruiter. Based on the user's professional summary and experience, suggest 8-10 relevant technical skills. ONLY return the skills as a comma-separated list.";
            finalPrompt = `Suggest skills for this profile:\nSummary: ${context?.summary}\nExperience context: ${prompt}`;
        } else if (mode === 'refine_experience') {
            finalSystemInstruction += "\nYou are an expert resume writer. Refine this specific job responsibility description to be more impact-oriented and professional. Use action verbs. Output exactly one concise block of text (can be bullet points if appropriate). NO conversational filler.";
            finalPrompt = `Refine this job experience description for the role of ${context?.role} at ${context?.company}:\n\n${prompt}`;
        } else if (mode === 'refine_project_description') {
            finalSystemInstruction += "\nYou are an expert project manager and writer. Refine the project description to be more engaging, professional, and clear. Highlight the value and technical details. Output exactly one concise paragraph. NO conversational filler.";
            finalPrompt = `Refine this project description:\n\n${prompt}`;
        } else if (mode === 'suggest_tech_stack') {
            finalSystemInstruction += "\nYou are a technical architect. Based on the project description, suggest a relevant technology stack (languages, frameworks, tools). ONLY return the items as a comma-separated list.";
            finalPrompt = `Suggest a tech stack for this project description:\n\n${prompt}`;
        } else if (mode === 'suggest_project_name') {
            finalSystemInstruction += "\nYou are a creative brand specialist. Suggest 5 unique, catchy, and professional names for a technical project based on its description and tech stack. ONLY return the Names as a comma-separated list.";
            finalPrompt = `Suggest project names for:\nDescription: ${prompt}\nTech Stack: ${context?.techStack}`;
        } else if (mode === 'generate_subtitle') {
            finalSystemInstruction += "\nYou are a creative writer. Generate a short, intriguing, and professional subtitle for a portfolio section named '${context?.section}'. Tone should be futuristic and tech-focused. Output exactly one line. NO quotes or extra text.";
            finalPrompt = `Title of the section: "${prompt}"`;
        } else if (mode === 'generate_theme') {
            finalSystemInstruction += `\nYou are a high-end UI/UX theme architect. Generate a complete, harmonious color palette for a futuristic portfolio theme based on the user's description. 
            You must return a valid JSON object with two keys: "light" and "dark". 
            Each variant must follow this exact structure (all values are hex colors):
            {
              "backgrounds": { "primary": "", "secondary": "", "tertiary": "", "surface": "", "elevated": "", "hover": "" },
              "text": { "primary": "", "secondary": "", "tertiary": "", "muted": "", "bright": "" },
              "accents": { "cyan": "", "cyanBright": "", "purple": "", "purpleDark": "", "purpleDarker": "", "pink": "", "pinkBright": "", "pinkHot": "", "orange": "", "orangeBright": "" },
              "borders": { "primary": "", "secondary": "", "accent": "", "cyan": "" },
              "status": { "error": "", "warning": "", "success": "", "info": "" },
              "syntax": { "comment": "", "keyword": "", "control": "", "function": "", "class": "", "string": "", "number": "", "variable": "", "property": "", "operator": "", "punctuation": "" },
              "shadows": { "sm": "", "md": "", "lg": "" },
              "overlays": { "bg": "", "hover": "" }
            }
            ONLY return the JSON object. No extra text or markdown.`;
            finalPrompt = `Generate a theme based on this concept: "${prompt}"`;
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
