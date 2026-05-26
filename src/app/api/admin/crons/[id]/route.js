import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import Cron from '@/models/Cron';
import { getNextCronRun } from '@/utils/cronRunner';

// PUT: Update an existing cron job (Admin only)
async function updateCron(request, { params }) {
    await dbConnect();
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, schedule, enabled, webhookUrl, webhookMethod, notificationEnabled, notificationOn } = body;

        const cronJob = await Cron.findById(id);
        if (!cronJob) {
            return NextResponse.json({ success: false, error: 'Cron job not found.' }, { status: 404 });
        }

        // Validate schedule format if changed
        if (schedule && schedule !== cronJob.schedule) {
            const fields = schedule.trim().split(/\s+/);
            if (fields.length !== 5) {
                return NextResponse.json({ success: false, error: 'Invalid cron expression. Must have exactly 5 fields.' }, { status: 400 });
            }
            cronJob.schedule = schedule;
            cronJob.nextRun = getNextCronRun(schedule, new Date());
        }

        if (name && cronJob.type === 'user') {
            cronJob.name = name;
        }

        if (enabled !== undefined) {
            cronJob.enabled = enabled;
            if (enabled) {
                cronJob.nextRun = getNextCronRun(cronJob.schedule, new Date());
            } else {
                cronJob.nextRun = null;
            }
        }

        if (notificationEnabled !== undefined) {
            cronJob.notificationEnabled = notificationEnabled;
        }

        if (notificationOn !== undefined) {
            cronJob.notificationOn = notificationOn;
        }

        if (cronJob.type === 'user') {
            if (webhookUrl) cronJob.webhookUrl = webhookUrl;
            if (webhookMethod) cronJob.webhookMethod = webhookMethod;
        }

        await cronJob.save();
        return NextResponse.json({ success: true, data: cronJob });
    } catch (error) {
        console.error('[API CRON PUT ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a user-defined cron job (Admin only, System jobs are protected)
async function deleteCron(request, { params }) {
    await dbConnect();
    try {
        const { id } = await params;
        const cronJob = await Cron.findById(id);

        if (!cronJob) {
            return NextResponse.json({ success: false, error: 'Cron job not found.' }, { status: 404 });
        }

        if (cronJob.type === 'system') {
            return NextResponse.json({ success: false, error: 'System defined tasks cannot be deleted.' }, { status: 403 });
        }

        await Cron.findByIdAndDelete(id);
        return NextResponse.json({ success: true, message: 'Cron job deleted successfully.' });
    } catch (error) {
        console.error('[API CRON DELETE ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const PUT = withAuth(updateCron);
export const DELETE = withAuth(deleteCron);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
