import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import Cron from '@/models/Cron';
import { getNextCronRun, initCronRunner } from '@/utils/cronRunner';

// Initialize background Task Scheduler singleton exactly once when this isolated admin API loads
if (typeof window === 'undefined') {
    initCronRunner().catch(err => console.error('[CRON SERVICE ERROR] Failed to initialize runner:', err));
}

// GET: Retrieve all cron jobs (Admin only)
async function getCrons(request) {
    await dbConnect();
    try {
        // Self-heal and recalculate missing or outdated nextRun timestamps
        const now = new Date();
        const jobsToHeal = await Cron.find({
            enabled: true,
            $or: [
                { nextRun: null },
                { nextRun: { $exists: false } },
                { nextRun: { $lt: now } }
            ]
        });
        
        for (const job of jobsToHeal) {
            job.nextRun = getNextCronRun(job.schedule, now);
            await job.save();
        }

        const crons = await Cron.find({}).sort({ type: 1, name: 1 });
        return NextResponse.json({ success: true, data: crons });
    } catch (error) {
        console.error('[API CRON GET ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Create a custom user-defined cron job (Admin only)
async function createCron(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const { name, schedule, webhookUrl, webhookMethod = 'POST', notificationEnabled, notificationOn } = body;

        if (!name || !schedule || !webhookUrl) {
            return NextResponse.json({ success: false, error: 'Name, schedule (cron expression), and Webhook URL are required.' }, { status: 400 });
        }

        // Validate cron expression format roughly (needs to be 5 fields)
        const fields = schedule.trim().split(/\s+/);
        if (fields.length !== 5) {
            return NextResponse.json({ success: false, error: 'Invalid cron expression. Must have exactly 5 fields (minute hour day-of-month month day-of-week).' }, { status: 400 });
        }

        const nextRun = getNextCronRun(schedule, new Date());

        const newCron = await Cron.create({
            name,
            type: 'user',
            schedule,
            enabled: true,
            action: 'webhook',
            webhookUrl,
            webhookMethod,
            nextRun,
            notificationEnabled: notificationEnabled || false,
            notificationOn: notificationOn || 'always'
        });

        return NextResponse.json({ success: true, data: newCron }, { status: 201 });
    } catch (error) {
        console.error('[API CRON POST ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const GET = withAuth(getCrons);
export const POST = withAuth(createCron);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
