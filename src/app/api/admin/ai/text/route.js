import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import AiLog from '@/models/AiLog';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';

async function generateText(request) {
    try {
        await dbConnect();

        // 1. Get Configuration & API Key
        const config = await Config.findOne().select('+encryptedGeminiApiKey +encryptedGroqApiKey +encryptedOpenRouterApiKey').lean();

        if (!config?.ai?.enabled) {
            return NextResponse.json({ success: false, error: 'AI system is disabled.' }, { status: 403 });
        }

        // API keys are now securely decrypted and validated dynamically within the failover loop

        // 2. Parse Request
        const { prompt, mode, context } = await request.json();

        if (!prompt && mode !== 'proofread') {
            return NextResponse.json({ success: false, error: 'No prompt provided.' }, { status: 400 });
        }

        // 3. Prepare AI Prompt
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
        } else if (mode === 'suggest_excerpt') {
            finalSystemInstruction += "\nYou are an expert editor. Write a concise and compelling blog excerpt for cards, SEO previews, and social snippets. Keep it plain text only, no markdown, no quotes, no labels. Prefer 140-180 characters.";
            finalPrompt = `Write an excerpt for this blog post.\nTitle: "${context?.title || ''}"\nContent snippet: "${prompt.substring(0, 1200)}"`;
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
            finalSystemInstruction += `\nYou are an expert UI theme designer. Generate a complete color palette for a developer portfolio.

CRITICAL: Dark mode backgrounds must be VERY DARK (hex values in the #08-#1f range). Here is a REFERENCE dark theme:
backgrounds: primary "#0a1628", secondary "#0f1e36", tertiary "#051020", surface "#1a2942", elevated "#152138", hover "#1e3a5f"
text: primary "#e0f2fe", secondary "#bae6fd", tertiary "#7dd3fc", muted "#38bdf8", bright "#f0f9ff"

For light mode, backgrounds should be very light (#f0-#ff range).

The theme concept should influence the HUE of backgrounds, not the luminance. Examples:
- "Ocean": dark backgrounds are very dark blues (#0a1628), light backgrounds are pale blues (#f0f9ff)
- "Forest": dark backgrounds are very dark greens (#0a1f0f), light backgrounds are pale greens (#ecfdf5)  
- "Sunset": dark backgrounds are very dark reds (#1f0a0a), light backgrounds are warm creams (#fff7ed)
- "Purple": dark backgrounds are very dark purples (#1a0a2e), light backgrounds are pale lavenders (#faf5ff)

Shadows MUST use rgba() format like: "rgba(0, 0, 0, 0.3)"
Overlays MUST use rgba() format like: "rgba(0, 0, 0, 0.5)"

Return ONLY a valid JSON object (NO markdown, NO backticks, NO explanation) with keys "light" and "dark":
{
  "backgrounds": { "primary": "", "secondary": "", "tertiary": "", "surface": "", "elevated": "", "hover": "" },
  "text": { "primary": "", "secondary": "", "tertiary": "", "muted": "", "bright": "" },
  "accents": { "cyan": "", "cyanBright": "", "purple": "", "purpleDark": "", "purpleDarker": "", "pink": "", "pinkBright": "", "pinkHot": "", "orange": "", "orangeBright": "" },
  "borders": { "primary": "", "secondary": "", "accent": "", "cyan": "" },
  "status": { "error": "", "warning": "", "success": "", "info": "" },
  "syntax": { "comment": "", "keyword": "", "control": "", "function": "", "class": "", "string": "", "number": "", "variable": "", "property": "", "operator": "", "punctuation": "" },
  "shadows": { "sm": "", "md": "", "lg": "" },
  "overlays": { "bg": "", "hover": "" }
}`;
            finalPrompt = `Generate a "${prompt}" theme. Dark backgrounds must be VERY dark (hex #08-#1f range). Light backgrounds must be very light (#f0-#ff range). All accent keys including "cyan", "cyanBright" must be filled.`;
        }

        // 4. Call Active Provider API with strict fallback sequence
        const enabledProviders = config.ai.enabledProviders || ['gemini']; // Default
        const order = ['groq', 'openrouter', 'gemini'].filter(p => enabledProviders.includes(p));
        
        if (order.length === 0) {
            return NextResponse.json({ success: false, error: 'No AI providers enabled for text generation. Please check settings.' }, { status: 403 });
        }

        let responseText = '';
        let usageData = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        let finalProviderUsed = '';
        let finalModelUsed = '';
        let lastError = null;

        for (const currentProvider of order) {
            try {
                let currentApiKey;
                if (currentProvider === 'gemini') currentApiKey = config.encryptedGeminiApiKey ? decrypt(config.encryptedGeminiApiKey) : null;
                else if (currentProvider === 'groq') currentApiKey = config.encryptedGroqApiKey ? decrypt(config.encryptedGroqApiKey) : null;
                else if (currentProvider === 'openrouter') currentApiKey = config.encryptedOpenRouterApiKey ? decrypt(config.encryptedOpenRouterApiKey) : null;

                if (!currentApiKey) {
                    console.warn(`[AI Text] ${currentProvider} skipped: No API Key configured.`);
                    continue; // Skip silently
                }

                // Determine model
                let currentModelName = config.ai?.models?.[currentProvider];
                if (!currentModelName) {
                    if (currentProvider === 'groq') currentModelName = 'llama-3.1-8b-instant';
                    else if (currentProvider === 'openrouter') currentModelName = 'anthropic/claude-3-haiku';
                    else if (currentProvider === 'gemini') currentModelName = 'gemini-1.5-flash';
                }

                if (currentProvider === 'gemini') {
                    const ai = new GoogleGenAI({ apiKey: currentApiKey });
                    const result = await ai.models.generateContent({
                        model: currentModelName,
                        config: { systemInstruction: finalSystemInstruction },
                        contents: [{ text: finalPrompt }]
                    });
                    responseText = typeof result.text === 'function' ? result.text() : (result.text || JSON.stringify(result));
                    if (result.usageMetadata) {
                         usageData = {
                             inputTokens: result.usageMetadata.promptTokenCount || 0,
                             outputTokens: result.usageMetadata.candidatesTokenCount || 0,
                             totalTokens: result.usageMetadata.totalTokenCount || 0
                         };
                    }
                } else if (currentProvider === 'groq' || currentProvider === 'openrouter') {
                    const endpoint = currentProvider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
                    const headers = {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentApiKey}`
                    };
                    if (currentProvider === 'openrouter') {
                        headers['HTTP-Referer'] = 'https://aiyu.dev';
                        headers['X-Title'] = 'Aiyu Portfolio'; 
                    }
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            model: currentModelName,
                            messages: [
                                { role: 'system', content: finalSystemInstruction },
                                { role: 'user', content: finalPrompt }
                            ]
                        })
                    });
                    if (!response.ok) {
                        throw new Error(`${currentProvider.toUpperCase()} Error: ${response.status} ${await response.text()}`);
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

                if (responseText) {
                    finalProviderUsed = currentProvider;
                    finalModelUsed = currentModelName;
                    break; // SUCCESS! Break the failover loop
                }
            } catch (e) {
                console.error(`[AI Text Fallback] ${currentProvider} failed:`, e.message);
                lastError = e;
            }
        }

        if (!responseText) {
             throw new Error(`All configured AI fallback mechanisms failed. Last API error: ${lastError?.message || 'Unknown configuration issue.'}`);
        }

        // 5. Log Telemetry
        try {
            await AiLog.create({
                provider: finalProviderUsed,
                model: finalModelUsed,
                mode: mode || 'text',
                prompt: prompt,
                response: responseText.trim(),
                ...usageData
            });
        } catch (logError) {
            console.error('[AI Telemetry Logging Error]:', logError);
            // Non-fatal, let the request succeed
        }

        // Clean up markdown wrappers in case the AI ignored instructions
        let cleanText = responseText.trim();
        if (cleanText.startsWith('```')) {
            const match = cleanText.match(/^```(?:json|javascript|js)?\s*([\s\S]*?)```$/);
            if (match && match[1]) {
                cleanText = match[1].trim();
            } else {
                // Fallback aggressive strip if regex doesn't match perfectly
                cleanText = cleanText.replace(/^```[a-z]*\n/, '').replace(/```$/, '').trim();
            }
        }

        return NextResponse.json({
            success: true,
            data: cleanText
        });


    } catch (error) {
        console.error(`[AI Text Error]:`, error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to generate text.'
        }, { status: 500 });
    }
}

export const POST = withAuth(generateText);
export const runtime = 'nodejs';
