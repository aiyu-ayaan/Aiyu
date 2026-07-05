/**
 * Auth for MCP write tools.
 *
 * Reads/queries are public. Writes require a bearer token presented on EVERY
 * request via the `Authorization: Bearer <token>` header — the session id alone
 * never grants write access, so a leaked/guessed session id can't mutate data.
 *
 * The token is stored only as a SHA-256 hash in McpConfig.mcpTokenHash (withheld
 * by the serializer) and compared in constant time, mirroring the blog API token
 * (lib/blogApiAuth.js). Per-request auth is carried through the async JSON-RPC
 * dispatch via AsyncLocalStorage so tool handlers can assert it without threading
 * a request object through the SDK.
 */
import crypto from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { prisma } from '@/lib/prisma';

const authStore = new AsyncLocalStorage();

export function hashMcpToken(rawToken) {
    return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

/** Constant-time comparison of two hex digests. */
function safeHexEqual(aHex, bHex) {
    const a = Buffer.from(String(aHex), 'hex');
    const b = Buffer.from(String(bHex), 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/**
 * Verify the request's bearer token against the stored hash. Short-circuits with
 * no DB query when there is no bearer header, so public reads pay nothing.
 * @returns {Promise<boolean>}
 */
export async function verifyMcpToken(request) {
    const header = request.headers.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return false;

    const row = await prisma.mcpConfig.findFirst({ select: { mcpTokenHash: true } });
    const storedHash = row?.mcpTokenHash;
    if (!storedHash) return false;

    return safeHexEqual(storedHash, hashMcpToken(token.trim()));
}

/** Run `fn` with the request's auth context available to tool handlers. */
export function runWithMcpAuth(auth, fn) {
    return authStore.run(auth, fn);
}

/** Current request's auth context (or a safe default outside a run). */
export function getMcpAuth() {
    return authStore.getStore() || { authed: false, writeEnabled: false, ip: '', userAgent: '' };
}

/** Throw a clear error if the current request may not perform writes. */
export function assertMcpWrite() {
    const auth = getMcpAuth();
    if (!auth.writeEnabled) {
        throw new Error('Write access is disabled for this MCP server.');
    }
    if (!auth.authed) {
        throw new Error('Unauthorized: a valid bearer token is required for write operations.');
    }
}
