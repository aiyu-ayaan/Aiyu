import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import CronLog from '@/models/CronLog';

async function getCronLogs(request) {
    await dbConnect();

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
            const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [
                { cronName: pattern },
                { url: pattern },
                { log: pattern }
            ];
        }

        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            CronLog.find(query).sort({ ranAt: -1 }).skip(skip).limit(limit).lean(),
            CronLog.countDocuments(query)
        ]);

        return NextResponse.json({
            success: true,
            data: logs,
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
