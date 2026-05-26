import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import Cron from '@/models/Cron';
import { getNextCronRun } from '@/utils/cronRunner';

// GET: Retrieve all cron jobs (Admin only)
async function getCrons(request) {
    await dbConnect();
    try {
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
        const { name, schedule, webhookUrl, webhookMethod = 'POST' } = body;

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
            nextRun
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
