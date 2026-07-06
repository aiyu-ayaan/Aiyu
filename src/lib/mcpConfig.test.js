import { describe, it, expect } from 'vitest';
import { mergeMcpConfig, buildMcpServerCard, DEFAULT_MCP_CONFIG } from './mcpConfig';

const abs = (p) => `https://x.com${p}`;

describe('mergeMcpConfig', () => {
    it('returns full defaults for empty input', () => {
        const merged = mergeMcpConfig({});
        expect(merged.enabled).toBe(true);
        expect(merged.server.name).toBe('aiyu');
        expect(merged.tools).toHaveLength(DEFAULT_MCP_CONFIG.tools.length);
        expect(merged.transports.map((t) => t.type)).toEqual(DEFAULT_MCP_CONFIG.transports.map((t) => t.type));
    });

    it('normalizes malformed sections to safe shapes', () => {
        const merged = mergeMcpConfig({ tools: 'nope', resources: null, capabilities: 5, links: {} });
        expect(merged.tools).toEqual([]);
        expect(merged.resources).toEqual([]);
        expect(merged.links).toEqual([]);
        expect(merged.capabilities.tools.enabled).toBe(true);
    });

    it('keeps stored tools and coerces per-entry fields', () => {
        const merged = mergeMcpConfig({ tools: [{ name: 'x.do', enabled: false, annotations: { destructiveHint: true } }] });
        expect(merged.tools[0]).toMatchObject({
            name: 'x.do',
            enabled: false,
            annotations: { destructiveHint: true, readOnlyHint: false },
        });
    });

    it('respects an explicit disabled master switch', () => {
        expect(mergeMcpConfig({ enabled: false }).enabled).toBe(false);
    });

    it('defaults write access to disabled (secure by default)', () => {
        expect(mergeMcpConfig({}).write).toEqual({ enabled: false });
        expect(mergeMcpConfig({ write: { enabled: 'yes' } }).write).toEqual({ enabled: false });
        expect(mergeMcpConfig({ write: { enabled: true } }).write).toEqual({ enabled: true });
    });
});

describe('buildMcpServerCard', () => {
    it('builds the default card with resolved links and enabled tools', () => {
        const card = buildMcpServerCard({}, abs);
        expect(card.serverInfo.name).toBe('aiyu');
        expect(card.transports.map((t) => t.type)).toContain('webmcp');
        expect(card.transports).toContainEqual(expect.objectContaining({ type: 'streamable-http', endpoint: 'https://x.com/api/mcp' }));
        expect(card.capabilities.tools.tools.map((t) => t.name)).toEqual([
            'aiyu.navigate', 'aiyu.search', 'aiyu.getPublicApiCatalog',
        ]);
        expect(card.links.apiCatalog).toBe('https://x.com/.well-known/api-catalog');
        expect(card.links.documentation).toBe('https://x.com/docs/api');
    });

    it('omits disabled tools and disabled capabilities', () => {
        const card = buildMcpServerCard({
            tools: [
                { name: 'a', enabled: true },
                { name: 'b', enabled: false },
            ],
            capabilities: { prompts: { enabled: false } },
        }, abs);
        expect(card.capabilities.tools.tools.map((t) => t.name)).toEqual(['a']);
        expect(card.capabilities.prompts).toBeUndefined();
    });

    it('parses a valid tool inputSchema JSON string and drops invalid ones', () => {
        const card = buildMcpServerCard({
            tools: [
                { name: 'good', inputSchema: '{"type":"object"}' },
                { name: 'bad', inputSchema: '{not json' },
            ],
        }, abs);
        const [good, bad] = card.capabilities.tools.tools;
        expect(good.inputSchema).toEqual({ type: 'object' });
        expect(bad.inputSchema).toBeUndefined();
    });

    it('leaves absolute endpoints/links untouched', () => {
        const card = buildMcpServerCard({
            transports: [{ type: 'http', endpoint: 'https://mcp.example.com/rpc' }],
            links: [{ name: 'docs', url: 'https://docs.example.com' }],
        }, abs);
        expect(card.transports[0].endpoint).toBe('https://mcp.example.com/rpc');
        expect(card.links.docs).toBe('https://docs.example.com');
    });

    it('includes resources and prompts when present and enabled', () => {
        const card = buildMcpServerCard({
            resources: [{ uri: '/api/home', name: 'home', mimeType: 'application/json' }],
            prompts: [{ name: 'intro', arguments: [{ name: 'topic', required: true }] }],
        }, abs);
        expect(card.capabilities.resources.resources[0]).toMatchObject({
            uri: 'https://x.com/api/home', name: 'home', mimeType: 'application/json',
        });
        expect(card.capabilities.prompts.prompts[0].arguments[0]).toEqual({ name: 'topic', required: true });
    });
});
