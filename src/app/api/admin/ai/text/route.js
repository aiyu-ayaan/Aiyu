import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';
import { fetchWithTimeout } from '@/lib/upstreamControl';

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

// Vercel AI Gateway caller with request-scoped BYOK
async function callVercelAiGateway({ gatewayUrl, gatewayApiKey, providerType, modelId, apiKey, systemInstruction, prompt }) {
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
            { role: 'user', content: prompt }
        ],
        providerOptions: {
            gateway: {
                byok: {
                    [gatewaySlug]: [{ apiKey }]
                }
            }
        }
    };

    console.log(`[AI Gateway] Routing text request to ${providerType} (${gatewaySlug})/${modelId} via ${endpoint}...`);
    const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    }, 30000);

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

// Direct provider API caller (fallback)
async function callDirectProvider({ providerType, modelId, apiKey, systemInstruction, prompt }) {
    if (providerType === 'google') {
        const ai = new GoogleGenAI({ apiKey });
        
        let finalModel = modelId;
        if (!finalModel || finalModel.includes('1.5-flash')) {
            finalModel = 'gemini-2.0-flash-lite';
        }

        const result = await ai.models.generateContent({
            model: finalModel,
            config: { systemInstruction },
            contents: [{ text: prompt }]
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
                    { role: 'user', content: prompt }
                ]
            })
        }, 30000);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Direct Anthropic API Error (${response.status}): ${errorText}`);
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

        console.log(`[AI Direct] Calling provider ${providerType} directly for model ${modelId}...`);
        const response = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ]
            })
        }, 30000);

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

    throw new Error(`Direct calls to ${providerType} are not supported. This provider must be routed through Vercel AI Gateway.`);
}

async function generateText(request) {
    try {
        // 1. Get Configuration & API Key
        const config = await getSingleton(prisma, 'config', { withSecrets: true });

        if (!config?.ai?.enabled) {
            return NextResponse.json({ success: false, error: 'AI system is disabled.' }, { status: 403 });
        }

        // 2. Parse Request
        const { prompt, mode, context } = await request.json();

        if (!prompt && mode !== 'proofread') {
            return NextResponse.json({ success: false, error: 'No prompt provided.' }, { status: 400 });
        }

        // 3. Prepare AI Prompt
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
        } else if (mode === 'latex_refine') {
            finalSystemInstruction += "\nYou are an expert resume writer who is also a LaTeX specialist. Improve the wording of the given LaTeX resume snippet: stronger action verbs, quantified impact, concise professional tone. Preserve every LaTeX command, macro, and the overall structure exactly — only improve the human-readable text inside. Return ONLY the improved LaTeX snippet. No markdown fences, no commentary.";
            finalPrompt = `Improve this LaTeX resume snippet:\n\n${prompt}`;
        } else if (mode === 'latex_fix') {
            finalSystemInstruction += "\nYou are a LaTeX debugging expert. You get compiler errors and the related source. Respond with: (1) a one-line explanation per error, then (2) a corrected version of the affected source lines in a LaTeX block. Be surgical — change only what is needed to fix the errors. No markdown fences.";
            finalPrompt = `Fix these LaTeX errors.\n\nCompiler errors:\n${context?.errors || 'unknown'}\n\nSource:\n${prompt}`;
        } else if (mode === 'latex_generate') {
            finalSystemInstruction += "\nYou are an expert resume writer fluent in LaTeX. Generate a resume block from the user's description using these macros where appropriate: \\resumeItem{...}, \\resumeSubheading{Role}{Dates}{Company}{Location}, \\resumeProjectHeading{...}{...}, \\resumeItemListStart/\\resumeItemListEnd. Escape LaTeX special characters in prose (&, %, #, _). Return ONLY LaTeX. No markdown fences, no commentary.";
            finalPrompt = `Generate a LaTeX resume block (${context?.sectionType || 'generic'}) for:\n\n${prompt}`;
        } else if (mode === 'latex_tailor') {
            finalSystemInstruction += "\nYou are an expert career coach. Compare the LaTeX resume against the job description. Return a short, prioritized list of concrete edits: what to emphasize, reword, add, or drop, referencing specific resume lines. Plain text bullets only — terse and actionable. No LaTeX output, no fences.";
            finalPrompt = `Job description:\n${context?.jobDescription || ''}\n\nResume (LaTeX):\n${prompt.substring(0, 12000)}`;
        } else if (mode === 'resume_expand_idea') {
            finalSystemInstruction += "\nYou are an expert resume writer fluent in LaTeX. Turn the user's rough idea into 1-3 polished, impact-oriented \\resumeItem{...} bullet points. Use action verbs and quantify where plausible. Escape LaTeX special characters. Return ONLY the \\resumeItem lines. No markdown fences, no commentary.";
            finalPrompt = `Turn this resume idea into bullet points:\n\n${prompt}`;
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
        const textPriority = config.ai.textPriority || [];
        const configuredModels = config.ai.models || [];
        const configuredProviders = config.ai.providers || [];

        // Map textPriority to the configured model objects
        let modelsToTry = textPriority
            .map(id => configuredModels.find(m => m.id === id))
            .filter(Boolean);

        // Fallback to legacy models if priority list is empty
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
            return NextResponse.json({ success: false, error: 'No AI models configured in priority list. Please check settings.' }, { status: 403 });
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
                console.warn(`[AI Text] Skipping model ${currentModel.modelId}: Linked provider is missing API key.`);
                continue;
            }

            const decryptedKey = decrypt(provider.apiKey);
            if (!decryptedKey) {
                console.warn(`[AI Text] Skipping model ${currentModel.modelId}: Decryption of provider key failed.`);
                continue;
            }

            try {
                let result;
                
                // Route through Vercel AI Gateway if configured and provider is supported (not openrouter)
                if (useGateway && provider.type !== 'openrouter') {
                    try {
                        result = await callVercelAiGateway({
                            gatewayUrl,
                            gatewayApiKey,
                            providerType: provider.type,
                            modelId: currentModel.modelId,
                            apiKey: decryptedKey,
                            systemInstruction: finalSystemInstruction,
                            prompt: finalPrompt
                        });
                    } catch (gatewayErr) {
                        console.warn(`[AI Gateway Fallback] Gateway failed for ${provider.type}/${currentModel.modelId}. Trying direct call... Error:`, gatewayErr.message);
                        // Fallback to direct call
                        result = await callDirectProvider({
                            providerType: provider.type,
                            modelId: currentModel.modelId,
                            apiKey: decryptedKey,
                            systemInstruction: finalSystemInstruction,
                            prompt: finalPrompt
                        });
                    }
                } else {
                    // Call direct provider
                    result = await callDirectProvider({
                        providerType: provider.type,
                        modelId: currentModel.modelId,
                        apiKey: decryptedKey,
                        systemInstruction: finalSystemInstruction,
                        prompt: finalPrompt
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
                console.error(`[AI Text Fallback] Model ${currentModel.modelId} failed:`, e.message);
                lastError = e;
            }
        }

        if (!responseText) {
             throw new Error(`All configured AI fallback mechanisms failed. Last API error: ${lastError?.message || 'Unknown configuration issue.'}`);
        }

        // 5. Log Telemetry
        try {
            await prisma.aiLog.create({ data: {
                provider: finalProviderUsed,
                model: finalModelUsed,
                mode: mode || 'text',
                prompt: prompt,
                response: responseText.trim(),
                ...usageData
            } });
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
