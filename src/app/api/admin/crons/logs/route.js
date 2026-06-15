import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { toClientList } from '@/lib/serialize';

async function getCronLogs(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
        const status = searchParams.get('status');
        const cronId = searchParams.get('cronId');
        const search = searchParams.get('search');

        const query = {};
        if (status && ['success', 'failure'].includes(status)) {
            query.status = status;
        }
        if (cronId) {
            query.cronId = cronId;
        }
        if (search && search.trim()) {
            const term = search.trim();
            query.OR = [
                { cronName: { contains: term, mode: 'insensitive' } },
                { url: { contains: term, mode: 'insensitive' } },
                { log: { contains: term, mode: 'insensitive' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            prisma.cronLog.findMany({ where: query, orderBy: { ranAt: 'desc' }, skip, take: limit }),
            prisma.cronLog.count({ where: query }),
        ]);

        return NextResponse.json({
            success: true,
            data: toClientList('cronLog', logs),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1)
            }
        });
    } catch (error) {
        console.error('[API CRON LOGS GET ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const GET = withAuth(getCronLogs);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
