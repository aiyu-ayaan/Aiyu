import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClientList } from '@/lib/serialize';
import { withAuth } from '@/middleware/auth';

async function getAiLogs(request) {
    try {
        // Fetch recent logs (limit 50)
        const logs = toClientList('aiLog', await prisma.aiLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        }));

        // Aggregate statistics per provider
        const aggregation = await prisma.aiLog.groupBy({
            by: ['provider'],
            _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
            _count: { _all: true },
        });

        const providerIds = [
            'google', 'openai', 'groq', 'openrouter', 'anthropic', 'cohere', 
            'perplexity', 'replicate', 'together', 'mistral', 'deepseek', 
            'fireworks', 'xai', 'stabilityai', 'aws', 'azure'
        ];

        const stats = {};
        providerIds.forEach(id => {
            stats[id] = { input: 0, output: 0, total: 0, requests: 0 };
        });

        let overallTotalTokens = 0;

        aggregation.forEach(item => {
            let provider = String(item.provider || '').toLowerCase();
            if (provider === 'gemini') {
                provider = 'google';
            }
            if (stats[provider] !== undefined) {
                stats[provider].input += item._sum.inputTokens || 0;
                stats[provider].output += item._sum.outputTokens || 0;
                stats[provider].total += item._sum.totalTokens || 0;
                stats[provider].requests += item._count._all || 0;
            }
            overallTotalTokens += item._sum.totalTokens || 0;
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
