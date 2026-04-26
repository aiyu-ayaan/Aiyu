"use client";

import { useEffect } from 'react';

const navigationTargets = {
    home: '/',
    projects: '/projects',
    blogs: '/blogs',
    apps: '/apps',
    gallery: '/gallery',
    github: '/github',
    deployments: '/live-deployments',
    contact: '/contact-us',
};

function makeToolDefinitions() {
    return [
        {
            name: 'aiyu.navigate',
            description: 'Navigate to a primary Aiyu portfolio page.',
            inputSchema: {
                type: 'object',
                properties: {
                    page: {
                        type: 'string',
                        enum: Object.keys(navigationTargets),
                    },
                },
                required: ['page'],
                additionalProperties: false,
            },
            execute: async ({ page }) => {
                const target = navigationTargets[page] || '/';
                window.location.assign(target);
                return { ok: true, url: new URL(target, window.location.origin).toString() };
            },
        },
        {
            name: 'aiyu.search',
            description: 'Search public Aiyu content through the global search API.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', minLength: 1 },
                },
                required: ['query'],
                additionalProperties: false,
            },
            execute: async ({ query }) => {
                const response = await fetch(`/api/global-search?q=${encodeURIComponent(query)}`, {
                    headers: { Accept: 'application/json' },
                });
                return response.json();
            },
        },
        {
            name: 'aiyu.getPublicApiCatalog',
            description: 'Fetch the Aiyu API catalog for automated API discovery.',
            inputSchema: {
                type: 'object',
                properties: {},
                additionalProperties: false,
            },
            execute: async () => {
                const response = await fetch('/.well-known/api-catalog', {
                    headers: { Accept: 'application/linkset+json, application/json' },
                });
                return response.json();
            },
        },
    ];
}

export default function WebMCPTools() {
    useEffect(() => {
        if (typeof navigator === 'undefined') return;

        const modelContext = navigator.modelContext;
        if (!modelContext) return;

        const controller = new AbortController();
        const tools = makeToolDefinitions();

        if (typeof modelContext.registerTool === 'function') {
            for (const tool of tools) {
                modelContext.registerTool(tool, { signal: controller.signal });
            }
        } else if (typeof modelContext.provideContext === 'function') {
            modelContext.provideContext({
                tools,
                signal: controller.signal,
            });
        }

        return () => controller.abort();
    }, []);

    return null;
}
