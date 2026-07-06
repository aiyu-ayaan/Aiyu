import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { verifyMcpToken } from '@/lib/mcp/auth';

/**
 * Authorize a bearer token for the blog/content APIs. Accepts EITHER the
 * dedicated blog API token (config.blogApiTokenHash) OR the MCP write token
 * (mcpConfig.mcpTokenHash), so a single key works for both surfaces and callers
 * don't have to juggle two secrets. Both are compared in constant time.
 */
export async function validateBearerBlogToken(request) {
    const authHeader = request.headers.get('authorization') || '';
    const [scheme, rawToken] = authHeader.split(' ');
    if (!scheme || !rawToken || scheme.toLowerCase() !== 'bearer') {
        return false;
    }

    // 1. Dedicated blog API token.
    const providedHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const config = await getSingleton(prisma, 'config', { withSecrets: true });
    const storedHash = String(config?.blogApiTokenHash || '');
    if (storedHash) {
        const storedBuffer = Buffer.from(storedHash, 'hex');
        const providedBuffer = Buffer.from(providedHash, 'hex');
        if (storedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(storedBuffer, providedBuffer)) {
            return true;
        }
    }

    // 2. Fall back to the MCP write token (same Authorization: Bearer header).
    return verifyMcpToken(request);
}
