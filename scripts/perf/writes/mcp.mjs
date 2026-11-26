// MCP StreamableHTTP JSON-RPC parity: initialize, tools/list, tools/call (read & write), resources, prompts.
import { createHmac } from 'node:crypto';
import { BEARER_HASH, PAST } from './_shared.mjs';

const cases = [];
const add = (models, method, path, name, rest = {}) => cases.push({ models, method, path, name, parseText: true, ...rest });

const purgeNextCache = async (prefixes = ['db:mcpconfig', 'db:blogs', 'db:projects']) => {
    const key = createHmac('sha256', process.env.JWT_SECRET || '').update('internal:hooks').digest('hex');
    await fetch(`${process.env.PARITY_NEXT || 'http://127.0.0.1:3100'}/api/internal/hooks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-aiyu-internal': key },
        body: JSON.stringify({ prefixes }),
    }).catch(() => {});
};

const enableWrite = async (p) => {
    await p.mcpConfig.deleteMany();
    await p.mcpConfig.create({
        data: {
            id: 'wp-mcp',
            data: { enabled: true, write: { enabled: true } },
            mcpTokenHash: BEARER_HASH,
            mcpTokenLast4: 'oken',
            mcpTokenUpdatedAt: PAST,
            createdAt: PAST,
            updatedAt: PAST,
        },
    });
    await purgeNextCache();
};

const disableMcp = async (p) => {
    await p.mcpConfig.deleteMany();
    await p.mcpConfig.create({
        data: { id: 'wp-mcp', data: { enabled: false }, createdAt: PAST, updatedAt: PAST },
    });
    await purgeNextCache();
};

// ── HTTP methods & malformed requests ──
add(['mcpConfig'], 'GET', '/api/mcp', 'GET is 405', { auth: 'anon', setup: () => purgeNextCache(), expect: 405 });
add(['mcpConfig'], 'OPTIONS', '/api/mcp', 'OPTIONS preflight', { auth: 'anon', expect: 204 });
add(['mcpConfig'], 'DELETE', '/api/mcp', 'DELETE unknown session is 204', { auth: 'anon', headers: { 'mcp-session-id': 'none' }, expect: 204 });
add(['mcpConfig'], 'POST', '/api/mcp', 'invalid JSON returns -32700', { auth: 'anon', body: '{bad', expect: 400 });
add(['mcpConfig'], 'POST', '/api/mcp', 'unknown session without initialize returns 404', {
    auth: 'anon',
    headers: { 'mcp-session-id': 'missing-sid' },
    body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    expect: 404,
});

// ── initialize & ping & notifications ──
add(['mcpConfig'], 'POST', '/api/mcp', 'initialize supported protocol version', {
    auth: 'anon',
    body: { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'wp', version: '1.0' } } },
    expect: 200,
});
add(['mcpConfig'], 'POST', '/api/mcp', 'initialize unsupported protocol version falls back to latest', {
    auth: 'anon',
    body: { jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01', capabilities: {}, clientInfo: { name: 'wp', version: '1.0' } } },
    expect: 200,
});
add(['mcpConfig'], 'POST', '/api/mcp', 'ping', {
    auth: 'anon',
    body: { jsonrpc: '2.0', id: 3, method: 'ping' },
    expect: 200,
});
add(['mcpConfig'], 'POST', '/api/mcp', 'notification returns 202 empty', {
    auth: 'anon',
    body: { jsonrpc: '2.0', method: 'notifications/initialized' },
    expect: 202,
});
add(['mcpConfig'], 'POST', '/api/mcp', 'unknown method returns -32601', {
    auth: 'anon',
    body: { jsonrpc: '2.0', id: 4, method: 'nonexistent/method' },
    expect: 200,
});

// ── tools/list visibility ──
add(['mcpConfig'], 'POST', '/api/mcp', 'tools/list public (14 read tools)', {
    auth: 'anon',
    setup: enableWrite,
    body: { jsonrpc: '2.0', id: 10, method: 'tools/list' },
    expect: 200,
});
add(['mcpConfig'], 'POST', '/api/mcp', 'tools/list authenticated with write enabled (31 tools)', {
    auth: 'bearer',
    setup: enableWrite,
    body: { jsonrpc: '2.0', id: 11, method: 'tools/list' },
    expect: 200,
});

// ── tools/call read tools ──
for (const [toolName, args] of [
    ['search_portfolio', { query: 'portfolio' }],
    ['search_portfolio', { query: '' }],
    ['list_projects', {}],
    ['list_blogs', {}],
    ['list_deployments', {}],
    ['get_profile', {}],
    ['get_api_catalog', {}],
    ['get_ai_page', {}],
    ['list_ai_sections', {}],
    ['get_ai_section', { id: 'skills' }],
    ['get_ai_section', { id: 'missing-section' }],
    ['list_ai_skills', {}],
    ['list_ai_recommendations', {}],
    ['list_ai_credits', {}],
    ['list_ai_prompts', {}],
    ['unknown_tool_xyz', {}],
]) {
    add(['mcpConfig', 'project', 'blog', 'deployment'], 'POST', '/api/mcp', `tools/call ${toolName} (${JSON.stringify(args)})`, {
        auth: 'anon',
        body: { jsonrpc: '2.0', id: 20, method: 'tools/call', params: { name: toolName, arguments: args } },
        expect: 200,
    });
}

add(['blog'], 'POST', '/api/mcp', 'tools/call get_blog found and missing', {
    auth: 'anon',
    setup: async (p) => {
        await p.blog.create({
            data: { id: 'wp-mcp-blog', title: 'MCP Test Blog', slug: 'mcp-test-blog', content: 'Hello MCP world', date: '2025-01-01', published: true, createdAt: PAST, updatedAt: PAST },
        });
    },
    body: [
        { jsonrpc: '2.0', id: 21, method: 'tools/call', params: { name: 'get_blog', arguments: { id: 'mcp-test-blog' } } },
        { jsonrpc: '2.0', id: 22, method: 'tools/call', params: { name: 'get_blog', arguments: { id: 'nonexistent-blog-slug' } } },
    ],
    expect: 200,
});

// ── resources & prompts ──
add(['mcpConfig'], 'POST', '/api/mcp', 'resources/list', {
    auth: 'anon',
    body: { jsonrpc: '2.0', id: 30, method: 'resources/list' },
    expect: 200,
});
for (const uri of ['aiyu://profile', 'aiyu://projects', 'aiyu://blogs', 'aiyu://deployments', 'aiyu://api-catalog', 'aiyu://ai-skills', 'aiyu://nope']) {
    add(['mcpConfig'], 'POST', '/api/mcp', `resources/read ${uri}`, {
        auth: 'anon',
        body: { jsonrpc: '2.0', id: 31, method: 'resources/read', params: { uri } },
        expect: 200,
    });
}
add(['mcpConfig'], 'POST', '/api/mcp', 'prompts/list and prompts/get', {
    auth: 'anon',
    body: [
        { jsonrpc: '2.0', id: 40, method: 'prompts/list' },
        { jsonrpc: '2.0', id: 41, method: 'prompts/get', params: { name: 'introduce_developer', arguments: { tone: 'casual' } } },
        { jsonrpc: '2.0', id: 42, method: 'prompts/get', params: { name: 'unknown_prompt' } },
    ],
    expect: 200,
});

// ── tools/call write tools ──
add(['mcpConfig', 'project', 'auditLog'], 'POST', '/api/mcp', 'tools/call create_project authorized', {
    auth: 'bearer',
    setup: enableWrite,
    mask: ['ipAddress'],
    check: (body, db) => db.some((c) => c.model === 'project' && c.added?.name === 'MCP Project') && db.some((c) => c.model === 'auditLog' && c.added?.action === 'MCP_CREATE_PROJECT'),
    body: {
        jsonrpc: '2.0',
        id: 50,
        method: 'tools/call',
        params: {
            name: 'create_project',
            arguments: { name: 'MCP Project', year: '2026', status: 'Live', projectType: 'OSS', description: 'Built via MCP', techStack: ['Rust'] },
        },
    },
    expect: 200,
});

add(['mcpConfig', 'project', 'auditLog'], 'POST', '/api/mcp', 'tools/call update_project', {
    auth: 'bearer',
    setup: async (p) => {
        await enableWrite(p);
        await p.project.create({
            data: { id: 'wp-mcp-proj', name: 'Old', year: '2025', status: 'WIP', projectType: 'Web', description: 'Desc', displayOrder: 1, createdAt: PAST, updatedAt: PAST },
        });
    },
    mask: ['ipAddress'],
    check: (body, db) => db.some((c) => c.model === 'project' && c.changed === 'wp-mcp-proj' && c.to?.name === 'Updated via MCP'),
    body: { jsonrpc: '2.0', id: 51, method: 'tools/call', params: { name: 'update_project', arguments: { id: 'wp-mcp-proj', name: 'Updated via MCP' } } },
    expect: 200,
});

add(['mcpConfig', 'project', 'auditLog'], 'POST', '/api/mcp', 'tools/call delete_project', {
    auth: 'bearer',
    setup: async (p) => {
        await enableWrite(p);
        await p.project.create({
            data: { id: 'wp-mcp-proj', name: 'Old', year: '2025', status: 'WIP', projectType: 'Web', description: 'Desc', displayOrder: 1, createdAt: PAST, updatedAt: PAST },
        });
    },
    mask: ['ipAddress'],
    body: { jsonrpc: '2.0', id: 52, method: 'tools/call', params: { name: 'delete_project', arguments: { id: 'wp-mcp-proj' } } },
    expect: 200,
});

add(['mcpConfig', 'project'], 'POST', '/api/mcp', 'tools/call write tool without bearer token fails with isError', {
    auth: 'anon',
    setup: enableWrite,
    body: {
        jsonrpc: '2.0',
        id: 53,
        method: 'tools/call',
        params: {
            name: 'create_project',
            arguments: { name: 'Anon', year: '2026', status: 'Live', projectType: 'OSS', description: 'No auth' },
        },
    },
    expect: 200,
});

// ── every other write tool: a success, bad input and, where an id is taken, a missing one ──
const dates = { createdAt: PAST, updatedAt: PAST };
const call = (models, tool, name, args, setup) => add(['mcpConfig', ...models, 'auditLog'], 'POST', '/api/mcp', `tools/call ${tool}: ${name}`, {
    auth: 'bearer',
    mask: ['ipAddress'],
    setup: async (p) => { await enableWrite(p); await setup?.(p); },
    body: { jsonrpc: '2.0', id: 60, method: 'tools/call', params: { name: tool, arguments: args } },
    expect: 200,
});
call(['blog'], 'create_blog_post', 'draft', { title: 'MCP Post: Hello, World!', content: '# Hi', tags: ['a', 'b'], imageAlt: 'alt' });
call(['blog'], 'create_blog_post', 'published', { title: 'MCP Live', content: 'x', published: true, excerpt: 'e', image: '/x.png' });
call(['blog'], 'create_blog_post', 'no content', { title: 'MCP' });
call(['deployment'], 'create_deployment', 'full', { name: 'MCP App', appType: 'Web', hostingProvider: 'Self', description: 'D', hostedUrl: 'https://example.org', techStack: ['Rust'] });
call(['deployment'], 'create_deployment', 'missing field', { name: 'MCP App' });

const category = (p) => p.aiSkillCategory.create({ data: { id: 'wp-cat', label: 'C', displayOrder: -50, ...dates } });
const aiKinds = [
    { tool: 'ai_skill_category', model: 'aiSkillCategory', models: ['aiSkillCategory', 'aiSkill'], base: { label: 'L' }, fresh: { label: 'New' }, patch: { label: 'Renamed' } },
    { tool: 'ai_skill', model: 'aiSkill', models: ['aiSkillCategory', 'aiSkill'], before: category, base: { categoryId: 'wp-cat', name: 'S' }, fresh: { categoryId: 'wp-cat', name: 'S2', url: '' }, patch: { name: 'R', url: 'https://example.org' } },
    { tool: 'ai_recommendation', model: 'aiRecommendation', models: ['aiRecommendation'], base: { name: 'R' }, fresh: { name: 'R2', rating: 9, tags: ['a'] }, patch: { rating: 2 } },
    { tool: 'ai_credit', model: 'aiCredit', models: ['aiCredit'], base: { name: 'C' }, fresh: { name: 'C2', noCard: false }, patch: { note: 'n' } },
    { tool: 'ai_prompt', model: 'aiPrompt', models: ['aiPrompt'], base: { title: 'T', prompt: 'P' }, fresh: { title: 'T2', prompt: 'P2' }, patch: { role: 'r' } },
];
for (const k of aiKinds) {
    const one = async (p) => { await k.before?.(p); await p[k.model].create({ data: { id: 'wp-1', ...k.base, ...dates } }); };
    call(k.models, `create_${k.tool}`, 'success', k.fresh, k.before);
    call(k.models, `create_${k.tool}`, 'nothing given', {});
    call(k.models, `update_${k.tool}`, 'success', { id: 'wp-1', ...k.patch }, one);
    call(k.models, `update_${k.tool}`, 'missing', { id: 'wp-none', ...k.patch });
    call(k.models, `delete_${k.tool}`, 'success', { id: 'wp-1' }, one);
    call(k.models, `delete_${k.tool}`, 'missing', { id: 'wp-none' });
}
call(['project'], 'update_project', 'missing', { id: 'wp-none', name: 'x' });
call(['project'], 'delete_project', 'missing', { id: 'wp-none' });
call(['project'], 'create_project', 'missing field', { name: 'x' });

// A valid token is not enough while writing is switched off.
add(['mcpConfig', 'project'], 'POST', '/api/mcp', 'write tool with writing switched off', {
    auth: 'bearer',
    setup: async (p) => { await enableWrite(p); await p.mcpConfig.update({ where: { id: 'wp-mcp' }, data: { data: { enabled: true, write: { enabled: false } }, updatedAt: PAST } }); await purgeNextCache(); },
    body: { jsonrpc: '2.0', id: 61, method: 'tools/call', params: { name: 'create_project', arguments: { name: 'No', year: '2026', status: 'Live', projectType: 'OSS', description: 'No' } } },
    expect: 200,
});
add(['mcpConfig', 'project'], 'POST', '/api/mcp', 'write tool with a wrong token', {
    auth: 'anon',
    headers: { authorization: 'Bearer wrong-token' },
    setup: enableWrite,
    body: { jsonrpc: '2.0', id: 62, method: 'tools/call', params: { name: 'delete_project', arguments: { id: 'x' } } },
    expect: 200,
});

add(['mcpConfig'], 'POST', '/api/mcp', 'disabled returns 503', { auth: 'anon', setup: disableMcp, body: { jsonrpc: '2.0', id: 99, method: 'ping' }, expect: 503 });

export default cases;
