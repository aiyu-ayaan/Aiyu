// Parity only: sends Next's calls to the AI providers to a local stand-in, as AI_API_BASE_URL does for aiyu-server.
// Start Next with NODE_OPTIONS=--import=/abs/path/to/scripts/perf/ai-preload.mjs
const base = process.env.AI_API_BASE_URL;
const PROVIDERS = /^https:\/\/(generativelanguage\.googleapis\.com|api\.(openai|anthropic|deepseek|mistral|together|x|perplexity|replicate|stability|cohere|groq|fireworks)\.(com|ai|xyz)|openrouter\.ai|ai-gateway\.vercel\.sh)\//;

// The Indexing API and its token endpoint go where GOOGLE_API_BASE_URL points, as in aiyu-server.
const google = process.env.GOOGLE_API_BASE_URL;
const INDEXING = /^https:\/\/(oauth2|indexing)\.googleapis\.com(?=\/)/;

if (base || google) {
    const real = globalThis.fetch;
    globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input.href ?? input.url);
        let target;
        if (base && PROVIDERS.test(url)) target = `${base}/${url.slice('https://'.length)}`;
        else if (google && INDEXING.test(url)) target = url.replace(INDEXING, google);
        else return real(input, init);
        return real(typeof input === 'string' || input instanceof URL ? target : new Request(target, input), init);
    };
}
