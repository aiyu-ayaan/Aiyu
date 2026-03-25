import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AiLog from '@/models/AiLog';
import { withAuth } from '@/middleware/auth';

async function getAiLogs(request) {
    try {
        await dbConnect();

        // Fetch recent logs (limit 50)
        const logs = await AiLog.find({})
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        // Aggregate statistics per provider
        const aggregation = await AiLog.aggregate([
            {
                $group: {
                    _id: '$provider',
                    inputTokens: { $sum: '$inputTokens' },
                    outputTokens: { $sum: '$outputTokens' },
                    totalTokens: { $sum: '$totalTokens' },
                    requestCount: { $sum: 1 }
                }
            }
        ]);

        const stats = {
            gemini: { input: 0, output: 0, total: 0, requests: 0 },
            groq: { input: 0, output: 0, total: 0, requests: 0 },
            openrouter: { input: 0, output: 0, total: 0, requests: 0 },
        };

        let overallTotalTokens = 0;

        aggregation.forEach(item => {
            const provider = item._id.toLowerCase();
            if (stats[provider] !== undefined) {
                stats[provider] = {
                    input: item.inputTokens || 0,
                    output: item.outputTokens || 0,
                    total: item.totalTokens || 0,
                    requests: item.requestCount || 0
                };
                overallTotalTokens += stats[provider].total;
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                logs,
                stats,
                overallTotalTokens
            }
        });

    } catch (error) {
        console.error('[AI Logs Fetch Error]:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch AI logs.'
        }, { status: 500 });
    }
}

export const GET = withAuth(getAiLogs);
export const runtime = 'nodejs';
