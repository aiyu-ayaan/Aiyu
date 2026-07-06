/**
 * MCP write-token management (admin only).
 *
 *   GET    -> token status (hasToken, last4, updatedAt) — never the token itself
 *   POST   -> generate/rotate the token, returning the plaintext ONCE
 *   DELETE -> revoke the token
 *
 * Only the SHA-256 hash is persisted (McpConfig.mcpTokenHash, withheld by the
 * serializer). The plaintext is shown exactly once at generation time. This is
 * the credential required by MCP write tools at /api/mcp (see lib/mcp/auth.js).
 */
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { hashMcpToken } from '@/lib/mcp/auth';
import { logAudit, AUDIT_CATEGORY } from '@/lib/audit';

async function requireSession() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return null;
}

async function getRow() {
    const row = await prisma.mcpConfig.findFirst({
        select: { id: true, mcpTokenHash: true, mcpTokenLast4: true, mcpTokenUpdatedAt: true },
    });
    return row;
}

export async function GET() {
    const unauthorized = await requireSession();
    if (unauthorized) return unauthorized;
    try {
        const row = await getRow();
        return NextResponse.json({
            success: true,
            data: {
                hasToken: Boolean(row?.mcpTokenHash),
                last4: row?.mcpTokenLast4 || '',
                updatedAt: row?.mcpTokenUpdatedAt || null,
            },
        });
    } catch (error) {
        console.error('[mcp/token] GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch token status' }, { status: 500 });
    }
}

export async function POST(request) {
    const unauthorized = await requireSession();
    if (unauthorized) return unauthorized;
    try {
        const token = `mcp_${crypto.randomBytes(32).toString('hex')}`;
        const data = {
            mcpTokenHash: hashMcpToken(token),
            mcpTokenLast4: token.slice(-4),
            mcpTokenUpdatedAt: new Date(),
        };

        const row = await getRow();
        if (row) {
            await prisma.mcpConfig.update({ where: { id: row.id }, data });
        } else {
            await prisma.mcpConfig.create({ data });
        }

        await logAudit({
            action: row?.mcpTokenHash ? 'MCP_TOKEN_ROTATED' : 'MCP_TOKEN_CREATED',
            category: AUDIT_CATEGORY.SECURITY,
            details: 'MCP write token generated',
            request,
        });

        return NextResponse.json({ success: true, data: { token, last4: token.slice(-4), updatedAt: data.mcpTokenUpdatedAt } });
    } catch (error) {
        console.error('[mcp/token] POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate token' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const unauthorized = await requireSession();
    if (unauthorized) return unauthorized;
    try {
        const row = await getRow();
        if (row) {
            await prisma.mcpConfig.update({
                where: { id: row.id },
                data: { mcpTokenHash: null, mcpTokenLast4: '', mcpTokenUpdatedAt: null },
            });
            await logAudit({
                action: 'MCP_TOKEN_REVOKED',
                category: AUDIT_CATEGORY.SECURITY,
                details: 'MCP write token revoked',
                request,
            });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[mcp/token] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Failed to revoke token' }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
