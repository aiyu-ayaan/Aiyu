/**
 * Read-only audit log feed.
 *
 *   GET /api/admin/security/audit?category=&action=&limit=&cursor=
 *
 * Cursor pagination by row id (descending createdAt). `category` filters by
 * auth|content|system|security; `action` does a contains match.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { toClientList } from '@/lib/serialize';

const MAX_LIMIT = 100;

export async function GET(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || '';
        const action = searchParams.get('action') || '';
        const cursor = searchParams.get('cursor') || '';
        const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT);

        const where = {};
        if (category) where.category = category;
        if (action) where.action = { contains: action, mode: 'insensitive' };

        const rows = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;

        // Lightweight counts by category for the dashboard summary.
        const grouped = await prisma.auditLog.groupBy({
            by: ['category'],
            _count: { _all: true },
        });
        const counts = grouped.reduce((acc, g) => {
            acc[g.category] = g._count._all;
            return acc;
        }, {});

        return NextResponse.json({
            success: true,
            logs: toClientList('auditLog', page),
            nextCursor: hasMore ? page[page.length - 1].id : null,
            counts,
        });
    } catch (error) {
        console.error('[security/audit] GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
