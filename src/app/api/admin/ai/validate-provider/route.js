import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { fetchWithTimeout } from '@/lib/upstreamControl';

async function validateProviderKey(request) {
    try {
        const { type, apiKey } = await request.json();
        if (!type || !apiKey) {
            return NextResponse.json({ success: false, error: 'Provider type and API key are required.' }, { status: 400 });
        }

        let isValid = false;
        let errorMessage = 'Invalid API Key';

        try {
            if (type === 'google') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (res.ok) {
                    isValid = true;
                } else {
                    const errData = await res.json().catch(() => null);
                    errorMessage = errData?.error?.message || `Google API returned status ${res.status}`;
                }
            } else if (type === 'openai') {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    isValid = true;
                } else {
                    const errData = await res.json().catch(() => null);
                    errorMessage = errData?.error?.message || `OpenAI API returned status ${res.status}`;
                }
            } else if (type === 'groq') {
                const res = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    isValid = true;
                } else {
                    const errData = await res.json().catch(() => null);
                    errorMessage = errData?.error?.message || `Groq API returned status ${res.status}`;
                }
            } else if (type === 'openrouter') {
                const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    isValid = true;
                } else {
                    const errData = await res.json().catch(() => null);
                    errorMessage = errData?.error?.message || `OpenRouter API returned status ${res.status}`;
                }
            } else if (type === 'anthropic') {
                // Try a minimal completions request (max_tokens: 1) to verify Anthropic key
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-3-5-haiku-20241022',
                        max_tokens: 1,
                        messages: [{ role: 'user', content: 'hi' }]
                    })
                });
                if (res.status === 200) {
                    isValid = true;
                } else if (res.status === 400) {
                    const errData = await res.json().catch(() => null);
                    if (errData?.error?.type === 'invalid_request_error') {
                        isValid = true; // Key was accepted, but request formatting/model was matched
                    } else {
                        errorMessage = errData?.error?.message || 'Invalid Request';
                    }
                } else {
                    const errData = await res.json().catch(() => null);
                    errorMessage = errData?.error?.message || `Anthropic API returned status ${res.status}`;
                }
            } else if (['deepseek', 'mistral', 'together', 'fireworks', 'xai', 'cohere'].includes(type)) {
                const endpoints = {
                    deepseek: 'https://api.deepseek.com/v1/models',
                    mistral: 'https://api.mistral.ai/v1/models',
                    together: 'https://api.together.xyz/v1/models',
                    fireworks: 'https://api.fireworks.ai/inference/v1/models',
                    xai: 'https://api.x.ai/v1/models',
                    cohere: 'https://api.cohere.com/v1/models'
                };
                const res = await fetch(endpoints[type], {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    isValid = true;
                } else {
                    const errData = await res.json().catch(() => null);
                    errorMessage = errData?.error?.message || `${type} API returned status ${res.status}`;
                }
            } else if (type === 'perplexity') {
                const res = await fetch('https://api.perplexity.ai/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'sonar',
                        max_tokens: 1,
                        messages: [{ role: 'user', content: 'hi' }]
                    })
                });
                if (res.ok) {
                    isValid = true;
                } else {
                    const errData = await res.json().catch(() => null);
                    errorMessage = errData?.error?.message || `Perplexity API returned status ${res.status}`;
                }
            } else if (type === 'replicate') {
                const res = await fetch('https://api.replicate.com/v1/account', {
                    headers: { 'Authorization': `Token ${apiKey}` }
                });
                if (res.ok) {
                    isValid = true;
                } else {
                    const errData = await res.json().catch(() => null);
                    errorMessage = errData?.error?.message || `Replicate API returned status ${res.status}`;
                }
            } else if (type === 'stabilityai') {
                const res = await fetch('https://api.stability.ai/v1/user/account', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    isValid = true;
                } else {
                    const errData = await res.json().catch(() => null);
                    errorMessage = errData?.errors?.[0]?.message || `Stability AI API returned status ${res.status}`;
                }
            } else if (['aws', 'azure'].includes(type)) {
                // AWS Bedrock and Azure OpenAI are managed through the Gateway config, bypass local key verification
                isValid = true;
            }
        } catch (err) {
            errorMessage = err.message;
        }

        if (isValid) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const POST = withAuth(validateProviderKey);
export const runtime = 'nodejs';
