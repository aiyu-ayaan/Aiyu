/**
 * Builds a configured MCP `Server` (official @modelcontextprotocol/sdk) for the
 * StreamableHTTP endpoint. Server identity, instructions, and which capabilities
 * are advertised all come from the admin-editable McpConfig singleton; the
 * executable tools/resources/prompts come from lib/mcp/tools.js.
 *
 * A fresh Server is built per session (see the /api/mcp route) so there is no
 * shared mutable state between connecting clients.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
    ListPromptsRequestSchema,
    GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS, RESOURCES, PROMPTS } from '@/lib/mcp/tools';

function textResult(value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return { content: [{ type: 'text', text }] };
}

export function buildMcpServer(config) {
    const caps = config.capabilities;

    const capabilities = {};
    if (caps.tools.enabled) capabilities.tools = {};
    if (caps.resources.enabled) capabilities.resources = {};
    if (caps.prompts.enabled) capabilities.prompts = {};
    if (caps.logging?.enabled) capabilities.logging = {};

    const serverInfo = {
        name: config.server.name || 'aiyu',
        version: config.server.version || '1.0.0',
    };
    if (config.server.title) serverInfo.title = config.server.title;

    const options = { capabilities };
    if (config.server.instructions) options.instructions = config.server.instructions;

    const server = new Server(serverInfo, options);

    if (caps.tools.enabled) {
        server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: TOOLS.map((t) => ({
                name: t.name,
                title: t.title,
                description: t.description,
                inputSchema: t.inputSchema,
                ...(t.annotations ? { annotations: t.annotations } : {}),
            })),
        }));

        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const tool = TOOLS.find((t) => t.name === request.params.name);
            if (!tool) {
                return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }] };
            }
            try {
                const result = await tool.handler(request.params.arguments || {});
                return textResult(result);
            } catch (error) {
                return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
            }
        });
    }

    if (caps.resources.enabled) {
        server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: RESOURCES.map((r) => ({
                uri: r.uri,
                name: r.name,
                title: r.title,
                description: r.description,
                mimeType: r.mimeType,
            })),
        }));

        server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const resource = RESOURCES.find((r) => r.uri === request.params.uri);
            if (!resource) throw new Error(`Unknown resource: ${request.params.uri}`);
            const data = await resource.read();
            const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            return { contents: [{ uri: resource.uri, mimeType: resource.mimeType || 'application/json', text }] };
        });
    }

    if (caps.prompts.enabled) {
        server.setRequestHandler(ListPromptsRequestSchema, async () => ({
            prompts: PROMPTS.map((p) => ({
                name: p.name,
                title: p.title,
                description: p.description,
                arguments: p.arguments,
            })),
        }));

        server.setRequestHandler(GetPromptRequestSchema, async (request) => {
            const prompt = PROMPTS.find((p) => p.name === request.params.name);
            if (!prompt) throw new Error(`Unknown prompt: ${request.params.name}`);
            return prompt.get(request.params.arguments || {});
        });
    }

    return server;
}
