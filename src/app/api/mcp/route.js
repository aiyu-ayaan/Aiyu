/**
 * Standard MCP StreamableHTTP endpoint.
 *
 *   POST /api/mcp   -> JSON-RPC (initialize, tools/list, tools/call, …)
 *   GET  /api/mcp   -> 405 (no server->client SSE stream offered)
 *   DELETE /api/mcp -> terminate a session
 *   OPTIONS         -> CORS preflight
 *
 * Sessions: an `initialize` request mints an `Mcp-Session-Id` (returned as a
 * header); subsequent requests carrying that header reuse the same in-memory
 * `Server`, so initialization state persists — the model real MCP clients
 * (Claude, Hermes, …) expect. A request with no session id that isn't an
 * initialize is handled as a one-shot stateless call. The whole endpoint,
 * server identity, and advertised capabilities are driven by the admin-editable
 * McpConfig (see /admin/mcp and lib/mcpConfig.js).
 */
import { randomUUID } from 'crypto';
import { getMcpConfig } from '@/lib/mcpConfig';
import { buildMcpServer } from '@/lib/mcp/server';
import { HttpBridgeTransport } from '@/lib/mcp/httpTransport';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    'Access-Control-Max-Age': '86400',
};

// In-memory session registry. The app runs as a long-lived Node server
// (standalone/Docker), so sessions survive between requests; a TTL sweep keeps
// abandoned ones from leaking.
const SESSIONS = new Map(); // sessionId -> { server, transport, lastSeen }
const SESSION_TTL_MS = 30 * 60 * 1000;

function sweepSessions() {
    const now = Date.now();
    for (const [id, session] of SESSIONS) {
        if (now - session.lastSeen > SESSION_TTL_MS) {
            session.transport.close().catch(() => {});
            SESSIONS.delete(id);
        }
    }
}

function jsonResponse(payload, { status = 200, sessionId } = {}) {
    const headers = { 'Content-Type': 'application/json', ...CORS };
    if (sessionId) headers['Mcp-Session-Id'] = sessionId;
    return new Response(JSON.stringify(payload), { status, headers });
}

function rpcError(id, code, message, status = 400) {
    return jsonResponse({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status });
}

async function createSession(config) {
    const transport = new HttpBridgeTransport();
    const server = buildMcpServer(config);
    await server.connect(transport);
    return { server, transport, lastSeen: Date.now() };
}

export async function POST(request) {
    const config = await getMcpConfig();
    if (!config.enabled) {
        return rpcError(null, -32000, 'MCP server is disabled.', 503);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return rpcError(null, -32700, 'Parse error: invalid JSON.', 400);
    }

    const messages = Array.isArray(body) ? body : [body];
    const requestedSessionId = request.headers.get('mcp-session-id') || undefined;
    const hasInitialize = messages.some((m) => m && m.method === 'initialize');

    let session;
    let sessionId = requestedSessionId;
    let ephemeral = false;

    if (requestedSessionId && SESSIONS.has(requestedSessionId)) {
        session = SESSIONS.get(requestedSessionId);
        session.lastSeen = Date.now();
    } else if (requestedSessionId && !hasInitialize) {
        // Unknown/expired session id and not re-initializing.
        return rpcError(messages[0]?.id ?? null, -32001, 'Session not found. Re-initialize.', 404);
    } else if (hasInitialize) {
        sessionId = randomUUID();
        session = await createSession(config);
        session.transport.sessionId = sessionId;
        SESSIONS.set(sessionId, session);
    } else {
        // No session and no initialize: stateless one-shot.
        ephemeral = true;
        sessionId = undefined;
        session = await createSession(config);
    }

    let responses;
    try {
        responses = [];
        for (const message of messages) {
            const response = await session.transport.dispatch(message);
            if (response) responses.push(response);
        }
    } catch (error) {
        if (ephemeral) await session.transport.close().catch(() => {});
        return rpcError(messages[0]?.id ?? null, -32603, `Internal error: ${error.message}`, 500);
    }

    if (ephemeral) await session.transport.close().catch(() => {});
    sweepSessions();

    if (responses.length === 0) {
        const headers = { ...CORS };
        if (sessionId) headers['Mcp-Session-Id'] = sessionId;
        return new Response(null, { status: 202, headers });
    }

    const payload = Array.isArray(body) ? responses : responses[0];
    return jsonResponse(payload, { sessionId });
}

export async function DELETE(request) {
    const sessionId = request.headers.get('mcp-session-id') || undefined;
    if (sessionId && SESSIONS.has(sessionId)) {
        await SESSIONS.get(sessionId).transport.close().catch(() => {});
        SESSIONS.delete(sessionId);
    }
    return new Response(null, { status: 204, headers: CORS });
}

export function GET() {
    // This endpoint doesn't offer a standalone server->client SSE stream;
    // clients POST requests and receive JSON responses inline.
    return new Response(
        JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Method Not Allowed. Use POST for MCP messages.' } }),
        { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST, DELETE, OPTIONS', ...CORS } },
    );
}

export function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
