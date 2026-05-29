import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import Cron from '@/models/Cron';
import { getNextCronRun } from '@/utils/cronRunner';

// GET: Fetch current default timezone
async function getCronTimezone(request) {
    await dbConnect();
    try {
        const config = await Config.findOne().lean();
        return NextResponse.json({ success: true, timezone: config?.defaultTimezone || 'UTC' });
    } catch (error) {
        console.error('[API CRON TIMEZONE GET ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Save new default timezone and recalculate active schedules
async function saveCronTimezone(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const { timezone } = body;

        if (!timezone) {
            return NextResponse.json({ success: false, error: 'Timezone is required.' }, { status: 400 });
        }

        // Validate timezone string validity
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Invalid timezone identifier.' }, { status: 400 });
        }

        let config = await Config.findOne({});
        if (!config) {
            config = await Config.create({ defaultTimezone: timezone });
        } else {
            config.defaultTimezone = timezone;
            await config.save();
        }

        // Recalculate nextRun for all active enabled cron jobs
        const now = new Date();
        const activeJobs = await Cron.find({ enabled: true });
        for (const job of activeJobs) {
            job.nextRun = getNextCronRun(job.schedule, now, timezone);
            await job.save();
        }

        return NextResponse.json({ success: true, timezone });
    } catch (error) {
        console.error('[API CRON TIMEZONE POST ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const GET = withAuth(getCronTimezone);
export const POST = withAuth(saveCronTimezone);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
