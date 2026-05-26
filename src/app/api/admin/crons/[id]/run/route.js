import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import Cron from '@/models/Cron';
import { executeCronJob } from '@/utils/cronRunner';

// POST: Trigger manual execution of a cron job immediately (Admin only)
async function triggerCron(request, { params }) {
    await dbConnect();
    try {
        const { id } = await params;
        const cronJob = await Cron.findById(id);

        if (!cronJob) {
            return NextResponse.json({ success: false, error: 'Cron job not found.' }, { status: 404 });
        }

        console.log(`[CRON API] Admin triggered manual execution of: ${cronJob.name}`);
        
        // Execute sync so we can return the fresh logs to the UI immediately!
        await executeCronJob(cronJob);

        const updatedJob = await Cron.findById(id);
        return NextResponse.json({
            success: true,
            message: `Cron job executed successfully.`,
            data: updatedJob
        });

    } catch (error) {
        console.error('[API CRON TRIGGER RUN ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const POST = withAuth(triggerCron);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
