import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';
import { withAuth } from '@/middleware/auth';
import { fetchWithTimeout } from '@/lib/upstreamControl';
import { GoogleGenAI } from '@google/genai';
import {
    getBlogIssues,
    getProjectIssues,
    getDeploymentIssues,
    getStaticConfigIssues
} from '@/lib/seoAudit';

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
        const text = typeof result.text === 'function' ? result.text() : (result.text || '');
        const usage = result.usageMetadata ? {
            inputTokens: result.usageMetadata.promptTokenCount || 0,
            outputTokens: result.usageMetadata.candidatesTokenCount || 0,
            totalTokens: result.usageMetadata.totalTokenCount || 0
        } : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

        return { text, usage };
    }

    throw new Error(`Direct calls to ${providerType} are not supported. This provider must be routed through Vercel AI Gateway.`);
}

async function generateText({ config, systemInstruction, prompt, mode }) {
    const textPriority = config.ai?.textPriority || [];
    const configuredModels = config.ai?.models || [];
    const configuredProviders = config.ai?.providers || [];

    let modelsToTry = textPriority
        .map(id => configuredModels.find(m => m.id === id))
        .filter(Boolean);

    if (modelsToTry.length === 0) {
        const geminiProvider = configuredProviders.find(p => p.type === 'google');
        if (geminiProvider) {
            modelsToTry.push({
                id: 'legacy-gemini',
                modelId: config.ai?.model || 'gemini-1.5-flash',
                providerId: geminiProvider.id,
                isFree: false
            });
        }
    }

    if (modelsToTry.length === 0) {
        throw new Error('No AI models configured in priority list. Please check settings.');
    }

    const gatewayUrl = config.ai?.gatewayUrl || process.env.AI_GATEWAY_URL || '';
    const gatewayApiKey = config.ai?.gatewayApiKey ? decrypt(config.ai.gatewayApiKey) : (process.env.AI_GATEWAY_API_KEY || '');
    const useGateway = !!gatewayUrl || !!gatewayApiKey || !!process.env.AI_GATEWAY_API_KEY;

    let responseText = '';
    let usageData = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let finalProviderUsed = '';
    let finalModelUsed = '';
    let lastError = null;

    for (const currentModel of modelsToTry) {
        const provider = configuredProviders.find(p => p.id === currentModel.providerId);
        if (!provider || !provider.apiKey) continue;

        const decryptedKey = decrypt(provider.apiKey);
        if (!decryptedKey) continue;

        try {
            let result;
            if (useGateway && provider.type !== 'openrouter') {
                try {
                    result = await callVercelAiGateway({
                        gatewayUrl,
                        gatewayApiKey,
                        providerType: provider.type,
                        modelId: currentModel.modelId,
                        apiKey: decryptedKey,
                        systemInstruction,
                        prompt
                    });
                } catch (gateError) {
                    console.warn(`[AI Gateway Fallback] Trying direct call for ${currentModel.modelId} due to:`, gateError.message);
                    result = await callDirectProvider({
                        providerType: provider.type,
                        modelId: currentModel.modelId,
                        apiKey: decryptedKey,
                        systemInstruction,
                        prompt
                    });
                }
            } else {
                result = await callDirectProvider({
                    providerType: provider.type,
                    modelId: currentModel.modelId,
                    apiKey: decryptedKey,
                    systemInstruction,
                    prompt
                });
            }

            responseText = result.text;
            usageData = result.usage;
            finalProviderUsed = provider.type;
            finalModelUsed = currentModel.modelId;
            break;
        } catch (e) {
            console.error(`[AI Text Fallback] Model ${currentModel.modelId} failed:`, e.message);
            lastError = e;
        }
    }

    if (!responseText) {
        throw new Error(`All configured AI fallback mechanisms failed. Last API error: ${lastError?.message || 'Unknown configuration issue.'}`);
    }

    // Log Telemetry
    try {
        await prisma.aiLog.create({
            data: {
                provider: finalProviderUsed,
                model: finalModelUsed,
                mode: mode || 'seo_fix',
                prompt,
                response: responseText.trim(),
                ...usageData
            }
        });
    } catch (logError) {
        console.error('[AI Telemetry Logging Error]:', logError);
    }

    return responseText.trim();
}

async function fixSeoWarnings(request) {
    try {
        const config = await getSingleton(prisma, 'config', { withSecrets: true });
        if (!config?.ai?.enabled) {
            return NextResponse.json({ success: false, error: 'AI system is disabled in settings.' }, { status: 403 });
        }

        const { type, id } = await request.json();
        if (!type || !id) {
            return NextResponse.json({ success: false, error: 'Type and ID are required.' }, { status: 400 });
        }

        let fixedIssues = [];

        if (type === 'blog') {
            const blog = await prisma.blog.findUnique({ where: { id } });
            if (!blog) {
                return NextResponse.json({ success: false, error: 'Blog post not found.' }, { status: 444 });
            }

            const issues = getBlogIssues(blog);
            const dataToUpdate = {};

            // 1. Fix seoDescription
            if (issues.some(i => i.field === 'seoDescription')) {
                const systemInstruction = 'You are an expert copywriter and SEO specialist. Write a concise and compelling SEO meta description (50-160 characters) for a blog post. Output ONLY the description text with no quotes, no markdown, and no conversational filler.';
                const prompt = `Title: "${blog.title}"\nExcerpt: "${blog.excerpt}"\nContent: "${blog.content.substring(0, 1500)}"`;
                
                const generated = await generateText({
                    config,
                    systemInstruction,
                    prompt,
                    mode: 'suggest_excerpt'
                });
                
                if (generated) {
                    dataToUpdate.seoDescription = generated;
                    fixedIssues.push('seoDescription');
                }
            }

            // 2. Fix imageAlt
            if (issues.some(i => i.field === 'imageAlt') && blog.image) {
                const systemInstruction = 'You are an expert copywriter and accessibility specialist. Write a natural, descriptive alt text (under 125 characters) for the cover image of a blog post. Output ONLY the alt text description with no quotes, no markdown, and no conversational filler.';
                const prompt = `Title: "${blog.title}"\nDescription: "${blog.excerpt || blog.seoDescription}"`;
                
                const generated = await generateText({
                    config,
                    systemInstruction,
                    prompt,
                    mode: 'suggest_excerpt'
                });

                if (generated) {
                    dataToUpdate.imageAlt = generated;
                    fixedIssues.push('imageAlt');
                }
            }

            if (Object.keys(dataToUpdate).length > 0) {
                await prisma.blog.update({
                    where: { id },
                    data: dataToUpdate
                });
            }
        } 
        else if (type === 'project') {
            const project = await prisma.project.findUnique({ where: { id } });
            if (!project) {
                return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 444 });
            }

            const issues = getProjectIssues(project);
            const dataToUpdate = {};

            if (issues.some(i => i.field === 'description')) {
                const systemInstruction = 'You are an expert copywriter and SEO specialist. Write a concise and compelling project description (50-160 characters) for a developer portfolio. Output ONLY the description text with no quotes, no markdown, and no conversational filler.';
                const prompt = `Project Name: "${project.name}"\nTech Stack: "${project.techStack?.join(', ') || ''}"`;

                const generated = await generateText({
                    config,
                    systemInstruction,
                    prompt,
                    mode: 'refine_project_description'
                });

                if (generated) {
                    dataToUpdate.description = generated;
                    fixedIssues.push('description');
                }
            }

            if (Object.keys(dataToUpdate).length > 0) {
                await prisma.project.update({
                    where: { id },
                    data: dataToUpdate
                });
            }
        }
        else if (type === 'app') {
            const deployment = await prisma.deployment.findUnique({ where: { id } });
            if (!deployment) {
                return NextResponse.json({ success: false, error: 'App/Deployment not found.' }, { status: 444 });
            }

            const issues = getDeploymentIssues(deployment);
            const dataToUpdate = {};

            if (issues.some(i => i.field === 'description')) {
                const systemInstruction = 'You are an expert copywriter and SEO specialist. Write a concise and compelling description (50-160 characters) for a hosted web application. Output ONLY the description text with no quotes, no markdown, and no conversational filler.';
                const prompt = `App Name: "${deployment.name}"\nTech Stack: "${deployment.techStack?.join(', ') || ''}"`;

                const generated = await generateText({
                    config,
                    systemInstruction,
                    prompt,
                    mode: 'refine_project_description'
                });

                if (generated) {
                    dataToUpdate.description = generated;
                    fixedIssues.push('description');
                }
            }

            if (Object.keys(dataToUpdate).length > 0) {
                await prisma.deployment.update({
                    where: { id },
                    data: dataToUpdate
                });
            }
        }
        else if (type === 'static') {
            const issues = getStaticConfigIssues(config);
            const configJson = config.data || {};
            let isChanged = false;

            // 1. Fix siteTitle
            if (issues.some(i => i.field === 'siteTitle')) {
                const systemInstruction = 'You are a creative copywriter. Suggest a concise, professional, and SEO-friendly site title (under 60 characters) for a software developer\'s portfolio site. Output ONLY the title text with no quotes, no markdown, and no conversational filler.';
                const prompt = `Author Name: "${configJson.authorName || 'Developer'}"\nProfession: "${configJson.profession || 'Software Engineer'}"`;

                const generated = await generateText({
                    config,
                    systemInstruction,
                    prompt,
                    mode: 'suggest_title'
                });

                if (generated) {
                    configJson.siteTitle = generated;
                    fixedIssues.push('siteTitle');
                    isChanged = true;
                }
            }

            // 2. Fix description
            if (issues.some(i => i.field === 'description')) {
                const systemInstruction = 'You are an expert copywriter and SEO specialist. Write a concise and compelling default site SEO description (50-160 characters) for a developer portfolio. Output ONLY the description text with no quotes, no markdown, and no conversational filler.';
                const prompt = `Author Name: "${configJson.authorName || 'Developer'}"\nProfession: "${configJson.profession || 'Software Engineer'}"\nSite Title: "${configJson.siteTitle || ''}"`;

                const generated = await generateText({
                    config,
                    systemInstruction,
                    prompt,
                    mode: 'refine_summary'
                });

                if (generated) {
                    configJson.siteDescription = generated;
                    configJson.seoDescription = generated;
                    fixedIssues.push('description');
                    isChanged = true;
                }
            }

            if (isChanged) {
                await upsertSingleton(prisma, 'config', configJson);
            }
        }
        else {
            return NextResponse.json({ success: false, error: `Unsupported type: ${type}` }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            fixedIssues
        });

    } catch (error) {
        console.error('[seo/fix] error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const POST = withAuth(fixSeoWarnings);
export const runtime = 'nodejs';
