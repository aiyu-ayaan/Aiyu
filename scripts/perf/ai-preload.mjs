// Parity only: sends Next's calls to the AI providers to a local stand-in, as AI_API_BASE_URL does for aiyu-server.
// Start Next with NODE_OPTIONS=--import=/abs/path/to/scripts/perf/ai-preload.mjs
const base = process.env.AI_API_BASE_URL;
const PROVIDERS = /^https:\/\/(generativelanguage\.googleapis\.com|api\.(openai|anthropic|deepseek|mistral|together|x|perplexity|replicate|stability|cohere|groq|fireworks)\.(com|ai|xyz)|openrouter\.ai|ai-gateway\.vercel\.sh)\//;

if (base) {
    const real = globalThis.fetch;
    globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input.href ?? input.url);
        if (!PROVIDERS.test(url)) return real(input, init);
        const target = `${base}/${url.slice('https://'.length)}`;
        return real(typeof input === 'string' || input instanceof URL ? target : new Request(target, input), init);
    };
}
