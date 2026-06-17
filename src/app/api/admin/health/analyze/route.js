/**
 * AI Error Log Analyzer.
 *   POST /api/admin/health/analyze  { logText?: string }
 *
 * Gathers recent operational signals — failed uptime checks and security audit
 * events (failed logins / rate limits) — plus any free-text logs the admin
 * pastes (docker output, stack traces), and asks the AI Core for a concise
 * troubleshooting summary. Avoids building a separate error-capture pipeline.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getSingleton } from '@/lib/serialize';
import { generateAiText } from '@/lib/aiText';

const SYSTEM_INSTRUCTION =
    'You are a senior SRE assistant for a self-hosted Next.js portfolio app. ' +
    'Given recent failures and logs, produce a SHORT troubleshooting summary in Markdown: ' +
    '1) a one-line health verdict, 2) the most likely root causes (bullets), ' +
    '3) concrete next steps to investigate or fix. Be specific and avoid generic filler.';

export async function POST(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const logText = String(body.logText || '').slice(0, 8000);

        const [failedChecks, securityEvents] = await Promise.all([
            prisma.uptimeCheck.findMany({
                where: { status: 'down' },
                orderBy: { checkedAt: 'desc' },
                take: 15,
            }),
            prisma.auditLog.findMany({
                where: { category: 'security' },
                orderBy: { createdAt: 'desc' },
                take: 15,
            }),
        ]);

        if (failedChecks.length === 0 && securityEvents.length === 0 && !logText.trim()) {
            return NextResponse.json({
                success: true,
                summary: '**All clear.** No recent uptime failures or security events were found, and no logs were provided to analyze.',
                signals: { failedChecks: 0, securityEvents: 0 },
                skippedAi: true,
            });
        }

        const config = await getSingleton(prisma, 'config', { withSecrets: true });
        if (!config?.ai?.enabled) {
            return NextResponse.json(
                { success: false, error: 'AI Core is disabled. Enable it in AI settings to use the analyzer.' },
                { status: 403 },
            );
        }

        const downSummary = failedChecks
            .map((c) => `- ${c.label || c.target}: ${c.error || `HTTP ${c.statusCode}`} (${new Date(c.checkedAt).toISOString()})`)
            .join('\n') || '(none)';
        const securitySummary = securityEvents
            .map((e) => `- ${e.action}: ${e.details} from ${e.ipAddress} (${new Date(e.createdAt).toISOString()})`)
            .join('\n') || '(none)';

        const prompt = [
            'Analyze the following operational signals from the last collection window.',
            '',
            '## Failed uptime checks',
            downSummary,
            '',
            '## Recent security events',
            securitySummary,
            '',
            '## Pasted runtime logs',
            logText.trim() ? '```\n' + logText.trim() + '\n```' : '(none provided)',
        ].join('\n');

        const { text, provider, model } = await generateAiText({
            config,
            systemInstruction: SYSTEM_INSTRUCTION,
            prompt,
            mode: 'health_analysis',
        });

        return NextResponse.json({
            success: true,
            summary: text,
            provider,
            model,
            signals: { failedChecks: failedChecks.length, securityEvents: securityEvents.length },
        });
    } catch (error) {
        console.error('[health/analyze] error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
