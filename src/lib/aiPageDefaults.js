/**
 * Default schema for the AI Hub (/ai).
 *
 * The page is schema-driven: `sections` is an ordered array of self-describing
 * blocks. Array order IS display order (the admin dnd-kit list reorders in
 * place). Each block carries `{ id, type, enabled, eyebrow, title, subtitle,
 * accent, data }`; `type` is looked up in the frontend component registry
 * (components/ai/v2/registry.js) and the admin editor's field registry.
 *
 * This object is the single source of truth for "what an empty AI page looks
 * like": the public fetcher falls back to it when the singleton is missing,
 * and the admin editor seeds from it on first load. Adding a new section type
 * means: add a renderer to the registry, an editor form, and (optionally) an
 * entry here.
 *
 * Accents reference the v2 palette CSS variables so the page stays in step
 * with the active theme/skin.
 */

export const AI_ACCENTS = {
    cyan: 'var(--accent-cyan)',
    purple: 'var(--accent-purple)',
    orange: 'var(--accent-orange)',
    pink: 'var(--accent-pink)',
};

export const AI_SECTION_TYPES = ['hero', 'skills', 'recommendations', 'credits', 'stats', 'prompts'];

export const DEFAULT_AI_PAGE = {
    sections: [
        {
            id: 'hero',
            type: 'hero',
            enabled: true,
            eyebrow: 'AI Hub',
            title: 'Building with intelligence.',
            subtitle:
                'A living map of how I design, ship, and run AI-powered software — the stacks I trust, the credits I mine, and the prompts I reach for.',
            accent: AI_ACCENTS.cyan,
            data: {
                tags: ['RAG Pipelines', 'Multi-Agent', 'Prompt Engineering', 'MCP Servers', 'Fine-Tuning'],
            },
        },
        {
            id: 'skills',
            type: 'skills',
            enabled: true,
            eyebrow: 'Agent skills',
            title: 'AI skills & specializations',
            subtitle: 'The skills my AI agents can reach for — filter by category to explore what each one does.',
            accent: AI_ACCENTS.purple,
            data: {
                categories: [
                    {
                        id: 'motion',
                        label: 'Motion & Animation',
                        accent: AI_ACCENTS.cyan,
                        items: [
                            {
                                name: 'GSAP Core',
                                description:
                                    'Framework-agnostic JavaScript animation — tweens, easing, stagger, and reduced-motion aware timelines.',
                                url: 'https://gsap.com/docs/v3/',
                            },
                            {
                                name: 'GSAP for React',
                                description:
                                    'The useGSAP hook with refs, context, and automatic cleanup for animation inside React and Next.js.',
                                url: 'https://gsap.com/resources/React/',
                            },
                            {
                                name: 'ScrollTrigger',
                                description:
                                    'Scroll-linked animation: pinning, scrub, parallax, and trigger-driven reveals as the page moves.',
                                url: 'https://gsap.com/docs/v3/Plugins/ScrollTrigger/',
                            },
                        ],
                    },
                    {
                        id: 'design',
                        label: 'Design & Visualization',
                        accent: AI_ACCENTS.purple,
                        items: [
                            {
                                name: 'UI/UX Pro Max',
                                description:
                                    'Design intelligence across 67 styles, 96 palettes, and font pairings to plan, build, and review interfaces.',
                            },
                            {
                                name: 'Data Viz',
                                description:
                                    'Accessible, system-consistent charts and dashboards that read cleanly in both light and dark mode.',
                            },
                            {
                                name: 'Artifact Design',
                                description:
                                    'Design fundamentals for self-contained, theme-aware web artifacts hosted as shareable pages.',
                            },
                        ],
                    },
                    {
                        id: 'engineering',
                        label: 'Engineering & Performance',
                        accent: AI_ACCENTS.orange,
                        items: [
                            {
                                name: 'Architecture Patterns',
                                description:
                                    'Structural guidance for organizing code, boundaries, and data flow as a project grows.',
                            },
                            {
                                name: 'Web Performance',
                                description:
                                    'Bundle, render, and runtime optimization to keep pages fast across device tiers.',
                            },
                            {
                                name: 'SQL Query Optimization',
                                description:
                                    'Reads and rewrites slow queries — indexing, joins, and query plans — for faster database access.',
                            },
                        ],
                    },
                    {
                        id: 'workflow',
                        label: 'Workflow & Review',
                        accent: AI_ACCENTS.pink,
                        items: [
                            {
                                name: 'Code Review',
                                description:
                                    'Reviews the working diff for correctness bugs and reuse, simplification, and efficiency cleanups.',
                            },
                            {
                                name: 'Verify',
                                description:
                                    'Exercises a change end-to-end and observes real behavior before it ships — not just tests and typecheck.',
                            },
                            {
                                name: 'Run',
                                description:
                                    'Launches and drives the app to confirm a change works in the real product, then captures the result.',
                            },
                        ],
                    },
                ],
            },
        },
        {
            id: 'recommendations',
            type: 'recommendations',
            enabled: true,
            eyebrow: 'Recommended stack',
            title: 'The stack I recommend',
            subtitle: 'Tools I actually run in production — with the honest why.',
            accent: AI_ACCENTS.orange,
            data: {
                cards: [
                    {
                        id: 'groq',
                        name: 'Groq Cloud',
                        url: 'https://groq.com',
                        rating: 5,
                        accent: AI_ACCENTS.orange,
                        blurb: 'Absurdly fast inference for open models. When latency is the product, nothing else comes close on the free tier.',
                        tags: ['low-latency', 'free-tier', 'open-source'],
                    },
                    {
                        id: 'openrouter',
                        name: 'OpenRouter',
                        url: 'https://openrouter.ai',
                        rating: 5,
                        accent: AI_ACCENTS.cyan,
                        blurb: 'One API key, every model. Perfect for A/B-testing providers without rewriting a line of code.',
                        tags: ['gateway', 'multi-model', 'cheap-api'],
                    },
                    {
                        id: 'ollama',
                        name: 'Ollama',
                        url: 'https://ollama.com',
                        rating: 4,
                        accent: AI_ACCENTS.purple,
                        blurb: 'Local models in one command. My default for private prototyping and zero-cost iteration.',
                        tags: ['local', 'private', 'open-source'],
                    },
                    {
                        id: 'v0',
                        name: 'v0.dev',
                        url: 'https://v0.dev',
                        rating: 4,
                        accent: AI_ACCENTS.pink,
                        blurb: 'Generative UI that speaks React + Tailwind natively. Great for scaffolding, still needs a human editor.',
                        tags: ['generative-ui', 'react', 'prototyping'],
                    },
                ],
            },
        },
        {
            id: 'credits',
            type: 'credits',
            enabled: true,
            eyebrow: 'Free credits',
            title: 'Free credits & free tiers',
            subtitle: 'Where to get real inference without reaching for a card.',
            accent: AI_ACCENTS.cyan,
            data: {
                rows: [
                    {
                        id: 'google-ai-studio',
                        name: 'Google AI Studio',
                        offer: 'Gemini 2.0 Flash / Flash-Lite — generous free RPM & daily quota',
                        url: 'https://aistudio.google.com',
                        noCard: true,
                        freeApi: true,
                        note: 'Best free-to-good ratio right now.',
                    },
                    {
                        id: 'groq',
                        name: 'Groq Cloud',
                        offer: 'Rate-limited free Llama 3 / Mixtral at record speed',
                        url: 'https://console.groq.com',
                        noCard: true,
                        freeApi: true,
                        note: 'Fastest tokens/sec you can get for $0.',
                    },
                    {
                        id: 'openrouter',
                        name: 'OpenRouter',
                        offer: 'Free variants of select models (e.g. Llama 3 8B)',
                        url: 'https://openrouter.ai/models?max_price=0',
                        noCard: true,
                        freeApi: true,
                        note: 'Filter models by :free suffix.',
                    },
                    {
                        id: 'github-models',
                        name: 'GitHub Models',
                        offer: 'GPT-4o, Claude, Llama 3 inference inside your GitHub account',
                        url: 'https://github.com/marketplace/models',
                        noCard: true,
                        freeApi: true,
                        note: 'Great for dev + prototyping under your PAT.',
                    },
                    {
                        id: 'huggingface',
                        name: 'Hugging Face',
                        offer: 'Serverless Inference API + free Spaces for community models',
                        url: 'https://huggingface.co/inference-api',
                        noCard: true,
                        freeApi: true,
                        note: 'Enormous model catalog, best-effort latency.',
                    },
                ],
            },
        },
        {
            id: 'stats',
            type: 'stats',
            enabled: true,
            eyebrow: 'Telemetry',
            title: 'Live AI telemetry',
            subtitle: 'Aggregated from this portfolio’s own AI workflows.',
            accent: AI_ACCENTS.pink,
            data: {
                note: 'Powered by the site’s AiLog — updated as tools run.',
            },
        },
        {
            id: 'prompts',
            type: 'prompts',
            enabled: true,
            eyebrow: 'Prompt library',
            title: 'Prompt library',
            subtitle: 'System prompts I reuse. Copy, adapt, ship.',
            accent: AI_ACCENTS.purple,
            data: {
                items: [
                    {
                        id: 'ts-agent',
                        title: 'TypeScript Agent Developer',
                        role: 'Engineering',
                        prompt:
                            'You are a senior TypeScript engineer. Write strictly-typed, production-grade code with no `any`. Prefer composition over inheritance, small pure functions, and exhaustive error handling. Explain trade-offs briefly, then output the final code in a single block.',
                    },
                    {
                        id: 'seo-outline',
                        title: 'SEO Blog Outline Generator',
                        role: 'Content',
                        prompt:
                            'Act as an SEO strategist. Given a topic, produce a search-intent-driven outline: one H1, 5–7 H2 sections with target keywords, an FAQ block sourced from People-Also-Ask patterns, and a meta description under 155 characters. Prioritize clarity over keyword stuffing.',
                    },
                    {
                        id: 'rag-grounded',
                        title: 'Grounded RAG Answerer',
                        role: 'Retrieval',
                        prompt:
                            'Answer ONLY from the provided <context>. If the context is insufficient, say so explicitly — never fabricate. Cite the source id in [brackets] after each claim. Keep answers concise and structured.',
                    },
                ],
            },
        },
    ],
};

export default DEFAULT_AI_PAGE;
