import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { toClient } from '@/lib/serialize';
import { executeCronJob } from '@/utils/cronRunner';

// POST: Trigger manual execution of a cron job immediately (Admin only)
async function triggerCron(request, { params }) {
    try {
        const { id } = await params;
        const cronJob = await prisma.cron.findUnique({ where: { id } });

        if (!cronJob) {
            return NextResponse.json({ success: false, error: 'Cron job not found.' }, { status: 404 });
        }

        console.log(`[CRON API] Admin triggered manual execution of: ${cronJob.name}`);

        // Execute sync so we can return the fresh logs to the UI immediately!
        await executeCronJob(cronJob);

        const updatedJob = await prisma.cron.findUnique({ where: { id } });
        return NextResponse.json({
            success: true,
            message: `Cron job executed successfully.`,
            data: toClient('cron', updatedJob)
        });

    } catch (error) {
        console.error('[API CRON TRIGGER RUN ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const POST = withAuth(triggerCron);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
