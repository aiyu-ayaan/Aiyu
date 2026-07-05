/**
 * MCP server config API — the admin editor for the Model Context Protocol
 * server card served at /.well-known/mcp/server-card.json.
 *
 *   GET /api/admin/mcp/config -> merged config + live server-card preview
 *   PUT /api/admin/mcp/config -> normalize + persist the full config
 *
 * The whole config is edited as one document, so PUT replaces it wholesale
 * (arrays included) after running it through mergeMcpConfig to guarantee a
 * safe shape, then invalidates the cached copy the discovery route reads.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { upsertSingleton } from '@/lib/serialize';
import { toAbsoluteSiteUrl } from '@/lib/siteUrl';
import { getMcpConfig, mergeMcpConfig, buildMcpServerCard, invalidateMcpConfig } from '@/lib/mcpConfig';

function payload(config) {
    return {
        success: true,
        config,
        card: buildMcpServerCard(config),
        cardUrl: toAbsoluteSiteUrl('/.well-known/mcp/server-card.json'),
    };
}

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const config = await getMcpConfig();
        return NextResponse.json(payload(config));
    } catch (error) {
        console.error('[mcp/config] GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        // Normalize the whole document up front so persisted data always has a
        // predictable shape regardless of what the client sends.
        const normalized = mergeMcpConfig(body);
        await upsertSingleton(prisma, 'mcpConfig', normalized);
        await invalidateMcpConfig();

        const config = await getMcpConfig();
        return NextResponse.json(payload(config));
    } catch (error) {
        console.error('[mcp/config] PUT error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
